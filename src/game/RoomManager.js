const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const GameEngine = require('./GameEngine');
const { generateUniqueRoomCode } = require('../utils/roomCodeGenerator');
const {
  ROOM_EXPIRY_MS,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  MAX_PLAYER_NAME_LENGTH,
  MIN_PLAYER_NAME_LENGTH,
  WINNING_SCORES,
  MAIN_TIMERS,
  RETRY_TIMERS,
  DIFFICULTIES,
  GAME_STATES,
} = require('../utils/constants');

/**
 * RoomManager — manages all active rooms and their GameEngine instances.
 * Singleton; one per server process.
 */
class RoomManager {
  constructor() {
    /** @type {Map<string, GameEngine>} roomCode → GameEngine */
    this.engines = new Map();
    this.io = null;
  }

  /** Inject the Socket.IO server instance. */
  setIO(io) {
    this.io = io;
  }

  // ─── Room Creation ──────────────────────────────────────────────────

  /**
   * Create a new room and return the room code + player ID for the host.
   */
  async createRoom(playerName, settings) {
    // Validate settings
    this._validateSettings(settings);
    this._validatePlayerName(playerName);

    const roomCode = await generateUniqueRoomCode(async (code) => {
      // Check both DB and in-memory
      if (this.engines.has(code)) return true;
      const existing = await Room.findOne({ roomCode: code });
      return !!existing;
    });

    const playerId = uuidv4();
    const now = new Date();

    // Persist to MongoDB
    const roomDoc = await Room.create({
      roomCode,
      hostId: playerId,
      winningScore: settings.winningScore,
      mainTimer: settings.mainTimer,
      retryTimer: settings.retryTimer,
      difficulty: settings.difficulty,
      negativePoints: settings.negativePoints || false,
      status: GAME_STATES.WAITING,
      players: [
        {
          playerId,
          name: playerName,
          score: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          connected: true,
          isHost: true,
          joinedAt: now,
        },
      ],
      createdAt: now,
      expiresAt: new Date(now.getTime() + ROOM_EXPIRY_MS),
    });

    // Create in-memory GameEngine
    const engine = new GameEngine(
      {
        roomCode,
        hostId: playerId,
        winningScore: settings.winningScore,
        mainTimer: settings.mainTimer,
        retryTimer: settings.retryTimer,
        difficulty: settings.difficulty,
        negativePoints: settings.negativePoints || false,
        lifelineCount: settings.lifelineCount || 0,
      },
      this.io
    );

    engine.addPlayer(playerId, playerName, null);
    this.engines.set(roomCode, engine);

    return { roomCode, playerId };
  }

  // ─── Join / Leave ───────────────────────────────────────────────────

  /**
   * Add a player to an existing room. Returns { playerId }.
   */
  async joinRoom(playerName, roomCode) {
    this._validatePlayerName(playerName);
    roomCode = (roomCode || '').toUpperCase().trim();

    const engine = this.engines.get(roomCode);

    // Room might exist in DB but not in memory (server restart)
    if (!engine) {
      const roomDoc = await Room.findOne({ roomCode });
      if (!roomDoc) throw new Error('Room not found');
      if (roomDoc.expiresAt && roomDoc.expiresAt < new Date()) {
        throw new Error('This room has expired');
      }
      throw new Error('Room is no longer active');
    }

    // Block joining if game is over
    if (engine.state === GAME_STATES.GAME_OVER) {
      throw new Error('Game has already ended');
    }

    if (engine.getPlayerCount() >= MAX_PLAYERS) {
      throw new Error(`Room is full (max ${MAX_PLAYERS} players)`);
    }

    // Check duplicate names (case-insensitive)
    const nameLower = playerName.toLowerCase().trim();
    const players = engine.getPlayersArray();
    if (players.some((p) => p.name.toLowerCase() === nameLower)) {
      throw new Error('This name is already taken in this room');
    }

    const playerId = uuidv4();
    engine.addPlayer(playerId, playerName, null);

    // If game is in progress, initialize this player for the current question
    const isGameInProgress = engine.state !== GAME_STATES.WAITING;
    if (isGameInProgress) {
      engine.initializeNewPlayerMidGame(playerId);
    }

    // Persist to MongoDB
    await Room.updateOne(
      { roomCode },
      {
        $push: {
          players: {
            playerId,
            name: playerName,
            score: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            connected: true,
            isHost: false,
            joinedAt: new Date(),
          },
        },
      }
    );

    return { playerId, isGameInProgress };
  }

  /**
   * Remove a player from a room. Handles host transfer if needed.
   * @returns {{ roomClosed: boolean, newHostId?: string }}
   */
  async removePlayer(roomCode, playerId) {
    const engine = this.engines.get(roomCode);
    if (!engine) return { roomClosed: true };

    engine.removePlayer(playerId);

    // If no connected players remain, close the room
    const connected = engine.getConnectedPlayers();
    if (connected.length === 0) {
      await this.closeRoom(roomCode);
      return { roomClosed: true };
    }

    // If the host left, transfer host
    let newHostId = null;
    if (playerId === engine.hostId) {
      const newHost = connected[0];
      engine.transferHost(newHost.playerId);
      newHostId = newHost.playerId;
      await Room.updateOne({ roomCode }, { hostId: newHostId });
    }

    // Persist removal
    await Room.updateOne(
      { roomCode },
      { $pull: { players: { playerId } } }
    );

    return { roomClosed: false, newHostId };
  }

  /**
   * Handle player disconnect (might reconnect).
   */
  handleDisconnect(roomCode, playerId) {
    const engine = this.engines.get(roomCode);
    if (!engine) return null;

    engine.setPlayerConnected(playerId, false);

    // Check if all players disconnected
    const connected = engine.getConnectedPlayers();
    if (connected.length === 0) {
      // Don't close immediately — allow reconnection grace period
      return { allDisconnected: true };
    }

    // If disconnected player is host, transfer
    let newHostId = null;
    if (playerId === engine.hostId) {
      const newHost = connected[0];
      engine.transferHost(newHost.playerId);
      newHostId = newHost.playerId;
    }

    // If game is active, check if we need to resolve the current question
    if (
      engine.state === GAME_STATES.QUESTION_ACTIVE ||
      engine.state === GAME_STATES.RETRY_ACTIVE
    ) {
      engine.checkAllPlayersAnswered();
    }

    return { allDisconnected: false, newHostId };
  }

  /**
   * Reconnect a player — restore their socket and resync state.
   */
  reconnectPlayer(roomCode, playerId, socketId) {
    const engine = this.engines.get(roomCode);
    if (!engine) return null;

    const player = engine.getPlayer(playerId);
    if (!player) return null;

    engine.setPlayerConnected(playerId, true);
    engine.setPlayerSocket(playerId, socketId);

    return engine.getFullStateForPlayer(playerId);
  }

  // ─── Room Lifecycle ─────────────────────────────────────────────────

  async closeRoom(roomCode) {
    const engine = this.engines.get(roomCode);
    if (engine) {
      engine.destroy();
      this.engines.delete(roomCode);
    }
    await Room.deleteOne({ roomCode });
  }

  getEngine(roomCode) {
    return this.engines.get(roomCode) || null;
  }

  // ─── Validation Helpers ─────────────────────────────────────────────

  _validateSettings(settings) {
    if (!settings) throw new Error('Room settings are required');
    if (!WINNING_SCORES.includes(settings.winningScore)) {
      throw new Error('Invalid winning score');
    }
    if (!MAIN_TIMERS.includes(settings.mainTimer)) {
      throw new Error('Invalid main timer value');
    }
    if (!DIFFICULTIES.includes(settings.difficulty)) {
      throw new Error('Invalid difficulty');
    }
  }

  _validatePlayerName(name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Player name is required');
    }
    const trimmed = name.trim();
    if (trimmed.length < MIN_PLAYER_NAME_LENGTH) {
      throw new Error(`Name must be at least ${MIN_PLAYER_NAME_LENGTH} characters`);
    }
    if (trimmed.length > MAX_PLAYER_NAME_LENGTH) {
      throw new Error(`Name must be at most ${MAX_PLAYER_NAME_LENGTH} characters`);
    }
    if (!/^[a-zA-Z0-9_ -]+$/.test(trimmed)) {
      throw new Error('Name can only contain letters, numbers, spaces, hyphens, and underscores');
    }
  }
}

// Export singleton
module.exports = new RoomManager();
