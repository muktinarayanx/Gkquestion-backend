const QuestionService = require('./QuestionService');
const {
  GAME_STATES,
  RESULT_DISPLAY_MS,
  STARTING_COUNTDOWN_MS,
  SOCKET_EVENTS,
} = require('../utils/constants');

/**
 * GameEngine — server-authoritative game state machine for a single room.
 *
 * Manages questions, timers, answer submission (atomic first-correct-wins),
 * retry rounds, scoring, and win detection.
 */
class GameEngine {
  constructor(roomData, io) {
    this.roomCode = roomData.roomCode;
    this.io = io;

    // ── Room settings ──────────────────────────────────────────────
    this.winningScore = roomData.winningScore;
    this.mainTimerDuration = roomData.mainTimer;
    this.retryTimerDuration = 5; // Always 5 seconds for retry
    this.difficulty = roomData.difficulty;
    this.negativePoints = roomData.negativePoints || false;
    this.lifelineCount = roomData.lifelineCount || 0;
    this.hostId = roomData.hostId;

    // ── State ──────────────────────────────────────────────────────
    this.state = GAME_STATES.WAITING;

    // Players: playerId → { name, socketId, score, correctAnswers, wrongAnswers, connected }
    this.players = new Map();

    // ── Question tracking ──────────────────────────────────────────
    this.questions = [];            // pre-fetched question pool
    this.currentQuestionIndex = -1;
    this.currentQuestion = null;    // full question (with correctAnswer)
    this.questionNumber = 0;
    this.usedQuestionIds = [];

    // ── Per-question answer state ──────────────────────────────────
    // playerId → { usedOptions: Set<number>, locked: boolean, answeredThisRound: boolean, skipped: boolean }
    this.playerAnswerStates = new Map();
    this.correctAnswerPlayerId = null;  // first correct player for current question
    this.isProcessingAnswer = false;    // concurrency guard
    this.activeLifelinePlayerId = null; // playerId who is currently using 50-50

    // ── Timers ─────────────────────────────────────────────────────
    this.timerInterval = null;
    this.timerValue = 0;
    this.timerExpireTimeout = null;
    this.resultTimeout = null;
    this.destroyed = false;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PLAYER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  addPlayer(playerId, name, socketId) {
    this.players.set(playerId, {
      name: name.trim(),
      socketId,
      score: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      lifelinesRemaining: this.lifelineCount,
      connected: true,
    });
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this.playerAnswerStates.delete(playerId);
    
    // Check if we need to progress the game because the removed player was the last one we were waiting for
    if (
      this.state === GAME_STATES.QUESTION_ACTIVE ||
      this.state === GAME_STATES.RETRY_ACTIVE
    ) {
      this.checkAllPlayersAnswered();
    }
  }

  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  getPlayersArray() {
    return Array.from(this.players.entries()).map(([id, data]) => ({
      playerId: id,
      ...data,
    }));
  }

  getConnectedPlayers() {
    return this.getPlayersArray().filter((p) => p.connected);
  }

  getPlayerCount() {
    return this.players.size;
  }

  setPlayerConnected(playerId, connected) {
    const p = this.players.get(playerId);
    if (p) p.connected = connected;
  }

  setPlayerSocket(playerId, socketId) {
    const p = this.players.get(playerId);
    if (p) p.socketId = socketId;
  }

  transferHost(newHostId) {
    this.hostId = newHostId;
  }

  /**
   * Initialize a player who joins mid-game.
   * Gives them an answer state for the current question so they can participate immediately.
   */
  initializeNewPlayerMidGame(playerId) {
    if (
      this.state === GAME_STATES.QUESTION_ACTIVE ||
      this.state === GAME_STATES.RETRY_ACTIVE
    ) {
      this.playerAnswerStates.set(playerId, {
        usedOptions: new Set(),
        locked: false,
        answeredThisRound: false,
        skipped: false,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GAME START
  // ═══════════════════════════════════════════════════════════════════

  async startGame() {
    if (this.state !== GAME_STATES.WAITING) {
      throw new Error('Game is not in WAITING state');
    }

    const connectedCount = this.getConnectedPlayers().length;
    if (connectedCount < 2) {
      throw new Error('Need at least 2 players to start');
    }

    this.state = GAME_STATES.STARTING;

    // Reset all scores and lifelines
    for (const [, p] of this.players) {
      p.score = 0;
      p.correctAnswers = 0;
      p.wrongAnswers = 0;
      p.lifelinesRemaining = this.lifelineCount;
    }
    this.questionNumber = 0;
    this.usedQuestionIds = [];

    // Pre-fetch a batch of questions
    await this._fetchQuestionBatch();

    // Broadcast game starting
    this.broadcast(SOCKET_EVENTS.GAME_STARTED, {
      settings: {
        winningScore: this.winningScore,
        mainTimer: this.mainTimerDuration,
        retryTimer: this.retryTimerDuration,
        difficulty: this.difficulty,
        lifelineCount: this.lifelineCount,
      },
    });

    // Short countdown, then first question
    setTimeout(() => {
      if (!this.destroyed) this._nextQuestion();
    }, STARTING_COUNTDOWN_MS);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  QUESTION FLOW
  // ═══════════════════════════════════════════════════════════════════

  async _nextQuestion() {
    // Check if we need more questions
    if (this.currentQuestionIndex >= this.questions.length - 1) {
      await this._fetchQuestionBatch();
      if (this.questions.length === 0) {
        // No more questions available
        this._endGameNoQuestions();
        return;
      }
    }

    this.currentQuestionIndex++;
    this.questionNumber++;
    this.currentQuestion = this.questions[this.currentQuestionIndex];
    this.correctAnswerPlayerId = null;
    this.isProcessingAnswer = false;

    // Initialize per-player answer states for this question
    this.playerAnswerStates.clear();
    for (const [playerId, player] of this.players) {
      if (player.connected) {
        this.playerAnswerStates.set(playerId, {
          usedOptions: new Set(),
          locked: false,
          answeredThisRound: false,
          skipped: false,
        });
      }
    }

    this.state = GAME_STATES.QUESTION_ACTIVE;

    // Send question to all players (WITHOUT correct answer)
    const clientQuestion = QuestionService.sanitizeForClient(this.currentQuestion);

    this.broadcast(SOCKET_EVENTS.NEW_QUESTION, {
      questionNumber: this.questionNumber,
      ...clientQuestion,
      mainTimer: this.mainTimerDuration,
    });

    // Start main timer
    this._startTimer(this.mainTimerDuration, () => {
      this._onTimerExpired();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ANSWER SUBMISSION
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Process a player's answer submission.
   * Returns result object to send back to the player.
   */
  submitAnswer(playerId, optionIndex) {
    // ── Guard: valid game state ───────────────────────────────────
    if (
      this.state !== GAME_STATES.QUESTION_ACTIVE &&
      this.state !== GAME_STATES.RETRY_ACTIVE
    ) {
      return { error: 'Not accepting answers right now' };
    }

    if (this.activeLifelinePlayerId && this.activeLifelinePlayerId !== playerId) {
      return { error: 'Another player is using a 50-50 lifeline' };
    }

    // ── Guard: valid option index ─────────────────────────────────
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex > 3) {
      return { error: 'Invalid option' };
    }

    // ── Guard: player exists and is connected ─────────────────────
    const player = this.players.get(playerId);
    if (!player || !player.connected) {
      return { error: 'Player not found or disconnected' };
    }

    // ── Guard: player answer state ────────────────────────────────
    const answerState = this.playerAnswerStates.get(playerId);
    if (!answerState) {
      return { error: 'You are not active in this round' };
    }

    if (answerState.locked) {
      return { error: 'You have no remaining options for this question' };
    }

    if (answerState.answeredThisRound) {
      return { error: 'You already answered this round' };
    }

    if (answerState.usedOptions.has(optionIndex)) {
      return { error: 'You already tried this option' };
    }

    // ── Guard: correct answer not yet found ───────────────────────
    if (this.correctAnswerPlayerId) {
      return { error: 'This question has already been answered correctly' };
    }

    // ── Guard: timer still active ─────────────────────────────────
    if (this.timerValue <= 0) {
      return { error: 'Time is up' };
    }

    // ── ATOMIC: Process the answer ────────────────────────────────
    // Node.js single-threaded event loop ensures this block runs
    // atomically between await points (there are none here).

    answerState.usedOptions.add(optionIndex);
    answerState.answeredThisRound = true;

    const isCorrect = optionIndex === this.currentQuestion.correctAnswer;

    if (isCorrect) {
      // ★ FIRST CORRECT ANSWER — award point
      this.correctAnswerPlayerId = playerId;
      player.score += 1;
      player.correctAnswers += 1;

      // Broadcast that someone got it right (no details yet)
      this.broadcast(SOCKET_EVENTS.PLAYER_ANSWERED, {
        playerId,
        playerName: player.name,
        correct: true,
      });

      if (this.activeLifelinePlayerId === playerId) {
        this.activeLifelinePlayerId = null;
        this.broadcast(SOCKET_EVENTS.LIFELINE_DEACTIVATED, { playerId });
      }

      // End the question
      this._endQuestion(true);

      return {
        correct: true,
        pointAwarded: true,
        usedOptions: Array.from(answerState.usedOptions),
      };
    }

    // ── WRONG ANSWER ──────────────────────────────────────────────
    player.wrongAnswers += 1;
    
    if (this.negativePoints) {
      player.score -= 1;
    }

    // Lock player if they've exhausted all 4 options, or if negative points are enabled
    if (this.negativePoints || answerState.usedOptions.size >= 4) {
      answerState.locked = true;
    }

    // Broadcast that someone answered (wrong — no details)
    this.broadcast(SOCKET_EVENTS.PLAYER_ANSWERED, {
      playerId,
      playerName: player.name,
      correct: false,
    });

    if (this.activeLifelinePlayerId === playerId) {
      this.activeLifelinePlayerId = null;
      this.broadcast(SOCKET_EVENTS.LIFELINE_DEACTIVATED, { playerId });
    }

    // Check if all active players have answered this round
    // Use setImmediate to allow the return to complete first
    setImmediate(() => this.checkAllPlayersAnswered());

    return {
      correct: false,
      pointAwarded: false,
      usedOptions: Array.from(answerState.usedOptions),
      locked: answerState.locked,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SKIP & LIFELINE
  // ═══════════════════════════════════════════════════════════════════

  skipQuestion(playerId) {
    if (
      this.state !== GAME_STATES.QUESTION_ACTIVE &&
      this.state !== GAME_STATES.RETRY_ACTIVE
    ) {
      return { error: 'Not accepting answers right now' };
    }

    if (this.activeLifelinePlayerId && this.activeLifelinePlayerId !== playerId) {
      return { error: 'Another player is using a 50-50 lifeline' };
    }

    const player = this.players.get(playerId);
    if (!player || !player.connected) {
      return { error: 'Player not found or disconnected' };
    }

    const answerState = this.playerAnswerStates.get(playerId);
    if (!answerState) return { error: 'You are not active in this round' };
    if (answerState.locked) return { error: 'You are locked out of this question' };
    if (answerState.answeredThisRound) return { error: 'You already answered this round' };
    if (this.timerValue <= 0) return { error: 'Time is up' };
    if (this.correctAnswerPlayerId) return { error: 'This question has already been answered correctly' };

    answerState.answeredThisRound = true;
    answerState.skipped = true;
    answerState.locked = true; // They can't answer anymore in retries

    if (this.activeLifelinePlayerId === playerId) {
      this.activeLifelinePlayerId = null;
      this.broadcast(SOCKET_EVENTS.LIFELINE_DEACTIVATED, { playerId });
    }

    this.broadcast(SOCKET_EVENTS.PLAYER_SKIPPED, {
      playerId,
      playerName: player.name,
    });

    setImmediate(() => this.checkAllPlayersAnswered());

    return { success: true };
  }

  useLifeline(playerId) {
    if (this.state !== GAME_STATES.QUESTION_ACTIVE) {
      return { error: 'You can only use lifelines during the main question round' };
    }

    if (this.activeLifelinePlayerId) {
      return { error: 'A lifeline is already active' };
    }

    const player = this.players.get(playerId);
    if (!player || !player.connected) {
      return { error: 'Player not found' };
    }

    if (player.lifelinesRemaining <= 0) {
      return { error: 'No lifelines remaining' };
    }

    const answerState = this.playerAnswerStates.get(playerId);
    if (!answerState) return { error: 'You are not active in this round' };
    if (answerState.locked || answerState.answeredThisRound) {
      return { error: 'You cannot use a lifeline after answering' };
    }

    player.lifelinesRemaining -= 1;
    this.activeLifelinePlayerId = playerId;

    // Pick 2 wrong options
    const correctOpt = this.currentQuestion.correctAnswer;
    const wrongOptions = [0, 1, 2, 3].filter(idx => idx !== correctOpt);
    // Shuffle and pick 2
    for (let i = wrongOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrongOptions[i], wrongOptions[j]] = [wrongOptions[j], wrongOptions[i]];
    }
    const removedOptions = wrongOptions.slice(0, 2);
    
    // Add them to used options so they count as disabled for this player
    removedOptions.forEach(opt => answerState.usedOptions.add(opt));

    this.broadcast(SOCKET_EVENTS.LIFELINE_ACTIVATED, { playerId, playerName: player.name });

    return { success: true, removedOptions, lifelinesRemaining: player.lifelinesRemaining };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ALL-WRONG DETECTION & RETRY
  // ═══════════════════════════════════════════════════════════════════

  checkAllPlayersAnswered() {
    if (this.correctAnswerPlayerId) return; // already resolved
    if (
      this.state !== GAME_STATES.QUESTION_ACTIVE &&
      this.state !== GAME_STATES.RETRY_ACTIVE
    ) {
      return;
    }

    const activePlayers = this._getActivePlayersForQuestion();
    if (activePlayers.length === 0) {
      // No active players — end question
      this._endQuestion(false);
      return;
    }

    const allAnswered = activePlayers.every((p) => {
      const state = this.playerAnswerStates.get(p.playerId);
      return state.answeredThisRound || state.locked;
    });

    if (!allAnswered) return; // still waiting for some players

    // All active players have answered — were they all wrong?
    // (If someone was correct, we'd have returned at the guard above.)

    // Check if any player has remaining unused options
    const anyHasOptions = activePlayers.some((p) => {
      const state = this.playerAnswerStates.get(p.playerId);
      return !state.locked && state.usedOptions.size < 4;
    });

    if (anyHasOptions) {
      // Start (or continue) retry round
      this._startRetryRound();
    } else {
      // No player has any valid options left — end question, no point
      this._endQuestion(false);
    }
  }

  _startRetryRound() {
    this._clearTimer();
    this.state = GAME_STATES.RETRY_ACTIVE;

    // Reset answeredThisRound for unlocked players (excluding skipped players, who are locked)
    for (const [, state] of this.playerAnswerStates) {
      if (!state.locked) {
        state.answeredThisRound = false;
      }
    }

    // Broadcast retry started with per-player used options
    const playerUsedOptions = {};
    for (const [playerId, state] of this.playerAnswerStates) {
      playerUsedOptions[playerId] = {
        usedOptions: Array.from(state.usedOptions),
        locked: state.locked,
      };
    }

    this.broadcast(SOCKET_EVENTS.RETRY_STARTED, {
      retryTimer: this.retryTimerDuration,
      playerUsedOptions,
    });

    // Start retry timer
    this._startTimer(this.retryTimerDuration, () => {
      this._onTimerExpired();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════════════════════════

  _startTimer(duration, onExpire) {
    this._clearTimer();
    this.timerValue = duration;

    // Broadcast initial timer value
    this.broadcast(SOCKET_EVENTS.TIMER_UPDATE, {
      timeRemaining: this.timerValue,
      timerType: this.state === GAME_STATES.RETRY_ACTIVE ? 'retry' : 'main',
    });

    // Tick every second
    this.timerInterval = setInterval(() => {
      if (this.destroyed) {
        this._clearTimer();
        return;
      }

      this.timerValue--;
      this.broadcast(SOCKET_EVENTS.TIMER_UPDATE, {
        timeRemaining: Math.max(0, this.timerValue),
        timerType: this.state === GAME_STATES.RETRY_ACTIVE ? 'retry' : 'main',
      });

      if (this.timerValue <= 0) {
        this._clearTimer();
        if (onExpire) onExpire();
      }
    }, 1000);
  }

  _clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.timerExpireTimeout) {
      clearTimeout(this.timerExpireTimeout);
      this.timerExpireTimeout = null;
    }
    if (this.resultTimeout) {
      clearTimeout(this.resultTimeout);
      this.resultTimeout = null;
    }
  }

  _onTimerExpired() {
    // Timer expired — check final state
    if (this.correctAnswerPlayerId) {
      // Someone already answered correctly — this shouldn't happen normally
      // but just in case, end the question as a success
      this._endQuestion(true);
    } else {
      if (this.activeLifelinePlayerId) {
        this.activeLifelinePlayerId = null;
        this.broadcast(SOCKET_EVENTS.LIFELINE_DEACTIVATED, { timeout: true });
      }

      // Check if we should retry or end
      const activePlayers = this._getActivePlayersForQuestion();
      const anyHasOptions = activePlayers.some((p) => {
        const state = this.playerAnswerStates.get(p.playerId);
        return state && !state.locked && state.usedOptions.size < 4;
      });

      // Only start retry if we're in QUESTION_ACTIVE (main round) and all answered wrong
      if (
        this.state === GAME_STATES.QUESTION_ACTIVE &&
        anyHasOptions &&
        this._allActiveAnsweredThisRound() &&
        !this.correctAnswerPlayerId // Ensure no correct answer
      ) {
        this._startRetryRound();
      } else {
        // End question — no point awarded
        this._endQuestion(false);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  QUESTION END / RESULT
  // ═══════════════════════════════════════════════════════════════════

  _endQuestion(hasWinner) {
    this._clearTimer();
    this.state = GAME_STATES.QUESTION_RESULT;

    const correctOption = this.currentQuestion.correctAnswer;
    const correctText = this.currentQuestion.options[correctOption];
    const winner = hasWinner ? this.players.get(this.correctAnswerPlayerId) : null;

    // Build scores leaderboard
    const scores = this._buildLeaderboard();

    // Broadcast question result (NOW reveal the correct answer)
    this.broadcast(SOCKET_EVENTS.QUESTION_RESULT, {
      correctAnswerIndex: correctOption,
      correctAnswerText: correctText,
      pointAwarded: hasWinner,
      winnerId: hasWinner ? this.correctAnswerPlayerId : null,
      winnerName: winner ? winner.name : null,
      scores,
    });

    // Check win condition
    if (hasWinner && winner && winner.score >= this.winningScore) {
      // GAME OVER — winner reached the winning score
      this.resultTimeout = setTimeout(() => {
        if (!this.destroyed) {
          this._endGame(this.correctAnswerPlayerId);
        }
      }, RESULT_DISPLAY_MS);
      return;
    }

    // Schedule next question after result display
    this.resultTimeout = setTimeout(() => {
      if (!this.destroyed) {
        this._nextQuestion();
      }
    }, RESULT_DISPLAY_MS);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GAME OVER
  // ═══════════════════════════════════════════════════════════════════

  _endGame(winnerId) {
    this._clearTimer();
    this.state = GAME_STATES.GAME_OVER;

    const winner = this.players.get(winnerId);
    const finalScores = this._buildLeaderboard();

    this.broadcast(SOCKET_EVENTS.GAME_OVER, {
      winnerId,
      winnerName: winner ? winner.name : 'Unknown',
      winnerScore: winner ? winner.score : 0,
      finalScores,
    });
  }

  _endGameNoQuestions() {
    this._clearTimer();
    this.state = GAME_STATES.GAME_OVER;

    const finalScores = this._buildLeaderboard();
    const topPlayer = finalScores[0];

    this.broadcast(SOCKET_EVENTS.GAME_OVER, {
      winnerId: topPlayer ? topPlayer.playerId : null,
      winnerName: topPlayer ? topPlayer.name : 'Unknown',
      winnerScore: topPlayer ? topPlayer.score : 0,
      finalScores,
      reason: 'No more questions available',
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RESTART
  // ═══════════════════════════════════════════════════════════════════

  async restartGame() {
    this._clearTimer();
    this.state = GAME_STATES.WAITING;
    this.questionNumber = 0;
    this.currentQuestionIndex = -1;
    this.currentQuestion = null;
    this.questions = [];
    this.usedQuestionIds = [];
    this.playerAnswerStates.clear();
    this.correctAnswerPlayerId = null;
    this.isProcessingAnswer = false;
    this.activeLifelinePlayerId = null;

    // Reset player scores and lifelines
    for (const [, p] of this.players) {
      p.score = 0;
      p.correctAnswers = 0;
      p.wrongAnswers = 0;
      p.lifelinesRemaining = this.lifelineCount;
    }

    // Broadcast lobby state
    this.broadcast(SOCKET_EVENTS.LOBBY_UPDATED, {
      players: this.getPlayersArray(),
      hostId: this.hostId,
      settings: this._getSettings(),
      state: this.state,
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STATE SERIALIZATION (for reconnecting players)
  // ═══════════════════════════════════════════════════════════════════

  getFullStateForPlayer(playerId) {
    const base = {
      roomCode: this.roomCode,
      state: this.state,
      hostId: this.hostId,
      settings: this._getSettings(),
      players: this.getPlayersArray(),
      scores: this._buildLeaderboard(),
    };

    if (
      this.state === GAME_STATES.QUESTION_ACTIVE ||
      this.state === GAME_STATES.RETRY_ACTIVE ||
      this.state === GAME_STATES.QUESTION_RESULT
    ) {
      const clientQuestion = QuestionService.sanitizeForClient(this.currentQuestion);
      const answerState = this.playerAnswerStates.get(playerId);

      base.question = {
        questionNumber: this.questionNumber,
        ...clientQuestion,
      };
      base.timeRemaining = this.timerValue;
      base.timerType = this.state === GAME_STATES.RETRY_ACTIVE ? 'retry' : 'main';
      base.myAnswerState = answerState
        ? {
            usedOptions: Array.from(answerState.usedOptions),
            locked: answerState.locked,
            answeredThisRound: answerState.answeredThisRound,
            skipped: answerState.skipped,
          }
        : null;
      base.activeLifelinePlayerId = this.activeLifelinePlayerId;

      if (this.state === GAME_STATES.QUESTION_RESULT) {
        const correctOption = this.currentQuestion.correctAnswer;
        const correctText = this.currentQuestion.options[correctOption];
        const winnerId = this.correctAnswerPlayerId;
        const winner = winnerId ? this.players.get(winnerId) : null;
        
        base.questionResult = {
          correctAnswerIndex: correctOption,
          correctAnswerText: correctText,
          pointAwarded: !!winnerId,
          winnerId: winnerId || null,
          winnerName: winner ? winner.name : null,
          scores: base.scores,
        };
      }
    }

    if (this.state === GAME_STATES.GAME_OVER) {
      const finalScores = this._buildLeaderboard();
      const topPlayer = finalScores[0];
      base.gameOver = {
        winnerId: topPlayer ? topPlayer.playerId : null,
        winnerName: topPlayer ? topPlayer.name : 'Unknown',
        winnerScore: topPlayer ? topPlayer.score : 0,
        finalScores,
      };
    }

    return base;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════

  _getActivePlayersForQuestion() {
    return this.getConnectedPlayers().filter((p) =>
      this.playerAnswerStates.has(p.playerId)
    );
  }

  _allActiveAnsweredThisRound() {
    const active = this._getActivePlayersForQuestion();
    return active.every((p) => {
      const state = this.playerAnswerStates.get(p.playerId);
      return state.answeredThisRound || state.locked;
    });
  }

  _buildLeaderboard() {
    return this.getPlayersArray()
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
        return a.wrongAnswers - b.wrongAnswers; // fewer wrong = better tiebreaker
      })
      .map((p, i) => ({
        rank: i + 1,
        playerId: p.playerId,
        name: p.name,
        score: p.score,
        correctAnswers: p.correctAnswers,
        wrongAnswers: p.wrongAnswers,
        lifelinesRemaining: p.lifelinesRemaining,
        connected: p.connected,
      }));
  }

  _getSettings() {
    return {
      winningScore: this.winningScore,
      mainTimer: this.mainTimerDuration,
      retryTimer: this.retryTimerDuration,
      difficulty: this.difficulty,
      negativePoints: this.negativePoints,
      lifelineCount: this.lifelineCount,
    };
  }

  async _fetchQuestionBatch() {
    const batchSize = Math.min(50, this.winningScore * 3);
    const questions = await QuestionService.fetchQuestions(
      this.difficulty,
      batchSize,
      this.usedQuestionIds
    );

    this.questions = questions;
    this.currentQuestionIndex = -1;

    // Track used IDs
    for (const q of questions) {
      this.usedQuestionIds.push(q._id.toString());
    }
  }

  broadcast(event, data) {
    if (this.io && !this.destroyed) {
      this.io.to(this.roomCode).emit(event, data);
    }
  }

  emitToPlayer(playerId, event, data) {
    const player = this.players.get(playerId);
    if (player && player.socketId && this.io && !this.destroyed) {
      this.io.to(player.socketId).emit(event, data);
    }
  }

  destroy() {
    this.destroyed = true;
    this._clearTimer();
    this.players.clear();
    this.playerAnswerStates.clear();
    this.questions = [];
  }
}

module.exports = GameEngine;
