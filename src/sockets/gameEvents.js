const roomManager = require('../game/RoomManager');
const { SOCKET_EVENTS, GAME_STATES } = require('../utils/constants');

/**
 * Game-related socket event handlers.
 */
module.exports = function registerGameEvents(socket, io) {
  // ── START_GAME ────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.START_GAME, async (data, callback) => {
    try {
      const cb = typeof callback === 'function' ? callback : () => {};

      if (!socket.playerData) return cb({ error: 'Not in a room' });
      const { roomCode, playerId } = socket.playerData;

      const engine = roomManager.getEngine(roomCode);
      if (!engine) return cb({ error: 'Room not found' });

      // Only the host can start the game
      if (engine.hostId !== playerId) {
        return cb({ error: 'Only the host can start the game' });
      }

      await engine.startGame();

      cb({ success: true });
    } catch (err) {
      const cb = typeof callback === 'function' ? callback : () => {};
      cb({ error: err.message || 'Failed to start game' });
    }
  });

  // ── SUBMIT_ANSWER ─────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.SUBMIT_ANSWER, (data, callback) => {
    try {
      const cb = typeof callback === 'function' ? callback : () => {};

      if (!socket.playerData) return cb({ error: 'Not in a room' });
      const { roomCode, playerId } = socket.playerData;

      const engine = roomManager.getEngine(roomCode);
      if (!engine) return cb({ error: 'Room not found' });

      // Validate that the game is in an answerable state
      if (
        engine.state !== GAME_STATES.QUESTION_ACTIVE &&
        engine.state !== GAME_STATES.RETRY_ACTIVE
      ) {
        return cb({ error: 'Not accepting answers right now' });
      }

      const { optionIndex } = data || {};
      if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex > 3) {
        return cb({ error: 'Invalid option index' });
      }

      // Process the answer through the GameEngine
      const result = engine.submitAnswer(playerId, optionIndex);

      if (result.error) {
        return cb({ error: result.error });
      }

      // Send personal result to the answering player
      cb({
        success: true,
        correct: result.correct,
        pointAwarded: result.pointAwarded || false,
        usedOptions: result.usedOptions,
        locked: result.locked || false,
      });
    } catch (err) {
      const cb = typeof callback === 'function' ? callback : () => {};
      cb({ error: err.message || 'Failed to submit answer' });
    }
  });

  // ── SKIP_QUESTION ─────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.SKIP_QUESTION, (data, callback) => {
    try {
      const cb = typeof callback === 'function' ? callback : () => {};

      if (!socket.playerData) return cb({ error: 'Not in a room' });
      const { roomCode, playerId } = socket.playerData;

      const engine = roomManager.getEngine(roomCode);
      if (!engine) return cb({ error: 'Room not found' });

      const result = engine.skipQuestion(playerId);

      if (result.error) {
        return cb({ error: result.error });
      }

      cb({ success: true });
    } catch (err) {
      const cb = typeof callback === 'function' ? callback : () => {};
      cb({ error: err.message || 'Failed to skip question' });
    }
  });

  // ── USE_LIFELINE ──────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.USE_LIFELINE, (data, callback) => {
    try {
      const cb = typeof callback === 'function' ? callback : () => {};

      if (!socket.playerData) return cb({ error: 'Not in a room' });
      const { roomCode, playerId } = socket.playerData;

      const engine = roomManager.getEngine(roomCode);
      if (!engine) return cb({ error: 'Room not found' });

      const result = engine.useLifeline(playerId);

      if (result.error) {
        return cb({ error: result.error });
      }

      cb({
        success: true,
        removedOptions: result.removedOptions,
        lifelinesRemaining: result.lifelinesRemaining,
      });
    } catch (err) {
      const cb = typeof callback === 'function' ? callback : () => {};
      cb({ error: err.message || 'Failed to use lifeline' });
    }
  });

  // ── RESTART_GAME ──────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.RESTART_GAME, async (data, callback) => {
    try {
      const cb = typeof callback === 'function' ? callback : () => {};

      if (!socket.playerData) return cb({ error: 'Not in a room' });
      const { roomCode, playerId } = socket.playerData;

      const engine = roomManager.getEngine(roomCode);
      if (!engine) return cb({ error: 'Room not found' });

      // Only the host can restart
      if (engine.hostId !== playerId) {
        return cb({ error: 'Only the host can restart the game' });
      }

      if (engine.state !== GAME_STATES.GAME_OVER) {
        return cb({ error: 'Game is not over yet' });
      }

      await engine.restartGame();

      cb({ success: true });
    } catch (err) {
      const cb = typeof callback === 'function' ? callback : () => {};
      cb({ error: err.message || 'Failed to restart game' });
    }
  });
};
