const express = require('express');
const roomManager = require('../game/RoomManager');
const {
  validateRoomSettings,
  validatePlayerName,
  validateRoomCode,
  sanitize,
} = require('../middleware/validation');
const { createRoomLimiter, joinRoomLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ── POST /api/rooms — Create a new room ─────────────────────────────
router.post('/', createRoomLimiter, async (req, res) => {
  try {
    const { playerName, settings } = req.body;

    const nameError = validatePlayerName(playerName);
    if (nameError) {
      return res.status(400).json({ error: nameError });
    }

    const settingsErrors = validateRoomSettings(settings);
    if (settingsErrors.length > 0) {
      return res.status(400).json({ error: settingsErrors.join('; ') });
    }

    const { roomCode, playerId } = await roomManager.createRoom(
      sanitize(playerName),
      settings
    );

    return res.status(201).json({ roomCode, playerId });
  } catch (err) {
    console.error('[POST /api/rooms] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to create room' });
  }
});

// ── POST /api/rooms/join — Join an existing room ────────────────────
router.post('/join', joinRoomLimiter, async (req, res) => {
  try {
    const { playerName, roomCode } = req.body;

    const nameError = validatePlayerName(playerName);
    if (nameError) {
      return res.status(400).json({ error: nameError });
    }

    const codeError = validateRoomCode(roomCode);
    if (codeError) {
      return res.status(400).json({ error: codeError });
    }

    const { playerId } = await roomManager.joinRoom(
      sanitize(playerName),
      roomCode
    );

    return res.status(200).json({ playerId, roomCode: roomCode.toUpperCase().trim() });
  } catch (err) {
    const status = err.message.includes('not found')
      ? 404
      : err.message.includes('expired')
      ? 410
      : err.message.includes('already started')
      ? 409
      : err.message.includes('full') || err.message.includes('taken')
      ? 409
      : 400;

    return res.status(status).json({ error: err.message });
  }
});

// ── GET /api/rooms/:roomCode — Get room info ────────────────────────
router.get('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const engine = roomManager.getEngine(roomCode.toUpperCase().trim());

    if (!engine) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.status(200).json({
      roomCode: engine.roomCode,
      state: engine.state,
      hostId: engine.hostId,
      players: engine.getPlayersArray().map((p) => ({
        playerId: p.playerId,
        name: p.name,
        connected: p.connected,
      })),
      settings: {
        winningScore: engine.winningScore,
        mainTimer: engine.mainTimerDuration,
        retryTimer: engine.retryTimerDuration,
        difficulty: engine.difficulty,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch room info' });
  }
});

module.exports = router;
