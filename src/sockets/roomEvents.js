const roomManager = require('../game/RoomManager');
const { SOCKET_EVENTS, GAME_STATES } = require('../utils/constants');
const { sanitize, validatePlayerName, validateRoomCode } = require('../middleware/validation');

/**
 * Room-related socket event handlers.
 */
module.exports = function registerRoomEvents(socket, io) {
  // ── Map socket to room/player for disconnect tracking ────────────
  // These are set after join/create
  socket.playerData = null; // { roomCode, playerId }

  // ── CREATE_ROOM ──────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.CREATE_ROOM, async (data, callback) => {
    try {
      const cb = typeof callback === 'function' ? callback : () => {};
      const { playerName, settings } = data || {};

      const nameError = validatePlayerName(playerName);
      if (nameError) return cb({ error: nameError });

      const { roomCode, playerId } = await roomManager.createRoom(
        sanitize(playerName),
        settings
      );

      const engine = roomManager.getEngine(roomCode);
      if (engine) engine.setPlayerSocket(playerId, socket.id);

      // Join the Socket.IO room
      socket.join(roomCode);
      socket.playerData = { roomCode, playerId };

      cb({
        success: true,
        roomCode,
        playerId,
        players: engine.getPlayersArray(),
        hostId: engine.hostId,
        settings: {
          winningScore: engine.winningScore,
          mainTimer: engine.mainTimerDuration,
          retryTimer: engine.retryTimerDuration,
          difficulty: engine.difficulty,
        },
      });
    } catch (err) {
      const cb = typeof callback === 'function' ? callback : () => {};
      cb({ error: err.message || 'Failed to create room' });
    }
  });

  // ── JOIN_ROOM ────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.JOIN_ROOM, async (data, callback) => {
    try {
      const cb = typeof callback === 'function' ? callback : () => {};
      const { playerName, roomCode } = data || {};

      const nameError = validatePlayerName(playerName);
      if (nameError) return cb({ error: nameError });

      const codeError = validateRoomCode(roomCode);
      if (codeError) return cb({ error: codeError });

      const code = roomCode.toUpperCase().trim();

      // Check if this socket is trying to reconnect
      const engine = roomManager.getEngine(code);
      if (engine && data.playerId) {
        const existingPlayer = engine.getPlayer(data.playerId);
        if (existingPlayer && !existingPlayer.connected) {
          // Reconnection
          const state = roomManager.reconnectPlayer(code, data.playerId, socket.id);
          socket.join(code);
          socket.playerData = { roomCode: code, playerId: data.playerId };

          // Notify others
          socket.to(code).emit(SOCKET_EVENTS.PLAYER_JOINED, {
            player: {
              playerId: data.playerId,
              name: existingPlayer.name,
              connected: true,
            },
            isReconnect: true,
          });

          return cb({
            success: true,
            roomCode: code,
            playerId: data.playerId,
            reconnected: true,
            state,
          });
        }
      }

      // Regular join
      const { playerId, isGameInProgress } = await roomManager.joinRoom(sanitize(playerName), code);

      const eng = roomManager.getEngine(code);
      if (eng) eng.setPlayerSocket(playerId, socket.id);

      socket.join(code);
      socket.playerData = { roomCode: code, playerId };

      // Notify all other players in the room
      socket.to(code).emit(SOCKET_EVENTS.PLAYER_JOINED, {
        player: {
          playerId,
          name: sanitize(playerName),
          connected: true,
        },
      });

      if (isGameInProgress) {
        // Mid-game join: send full game state so they jump right in
        const state = eng.getFullStateForPlayer(playerId);
        cb({
          success: true,
          roomCode: code,
          playerId,
          midGameJoin: true,
          state,
          players: eng.getPlayersArray(),
          hostId: eng.hostId,
          settings: eng._getSettings(),
        });
      } else {
        // Normal lobby join
        cb({
          success: true,
          roomCode: code,
          playerId,
          players: eng.getPlayersArray(),
          hostId: eng.hostId,
          settings: eng._getSettings(),
        });
      }

      // Broadcast updated lobby/player list to everyone
      io.to(code).emit(SOCKET_EVENTS.LOBBY_UPDATED, {
        players: eng.getPlayersArray(),
        hostId: eng.hostId,
        settings: eng._getSettings(),
        state: eng.state,
      });
    } catch (err) {
      const cb = typeof callback === 'function' ? callback : () => {};
      cb({ error: err.message || 'Failed to join room' });
    }
  });

  // ── LEAVE_ROOM ───────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, async (data, callback) => {
    try {
      const cb = typeof callback === 'function' ? callback : () => {};

      if (!socket.playerData) return cb({ error: 'Not in a room' });
      const { roomCode, playerId } = socket.playerData;

      const engine = roomManager.getEngine(roomCode);
      const playerName = engine
        ? engine.getPlayer(playerId)?.name || 'Unknown'
        : 'Unknown';

      const result = await roomManager.removePlayer(roomCode, playerId);

      socket.leave(roomCode);
      socket.playerData = null;

      if (result.roomClosed) {
        io.to(roomCode).emit(SOCKET_EVENTS.ROOM_CLOSED, { reason: 'All players left' });
      } else {
        // Notify remaining players
        io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_LEFT, {
          playerId,
          name: playerName,
        });

        if (result.newHostId) {
          const eng = roomManager.getEngine(roomCode);
          const newHost = eng ? eng.getPlayer(result.newHostId) : null;
          io.to(roomCode).emit(SOCKET_EVENTS.HOST_CHANGED, {
            newHostId: result.newHostId,
            newHostName: newHost ? newHost.name : 'Unknown',
          });
        }

        // Broadcast updated lobby
        const eng = roomManager.getEngine(roomCode);
        if (eng) {
          io.to(roomCode).emit(SOCKET_EVENTS.LOBBY_UPDATED, {
            players: eng.getPlayersArray(),
            hostId: eng.hostId,
            settings: {
              winningScore: eng.winningScore,
              mainTimer: eng.mainTimerDuration,
              retryTimer: eng.retryTimerDuration,
              difficulty: eng.difficulty,
            },
            state: eng.state,
          });
        }
      }

      cb({ success: true });
    } catch (err) {
      const cb = typeof callback === 'function' ? callback : () => {};
      cb({ error: err.message || 'Failed to leave room' });
    }
  });

  // ── DISCONNECT ───────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    if (!socket.playerData) return;
    const { roomCode, playerId } = socket.playerData;

    const engine = roomManager.getEngine(roomCode);
    if (!engine) return;

    const playerName = engine.getPlayer(playerId)?.name || 'Unknown';

    const result = roomManager.handleDisconnect(roomCode, playerId);
    if (!result) return;

    if (result.allDisconnected) {
      // All disconnected — wait for reconnection, then cleanup
      setTimeout(async () => {
        const eng = roomManager.getEngine(roomCode);
        if (eng && eng.getConnectedPlayers().length === 0) {
          await roomManager.closeRoom(roomCode);
        }
      }, 60000); // 1 minute grace period
    } else {
      io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_LEFT, {
        playerId,
        name: playerName,
        disconnected: true,
      });

      if (result.newHostId) {
        const newHost = engine.getPlayer(result.newHostId);
        io.to(roomCode).emit(SOCKET_EVENTS.HOST_CHANGED, {
          newHostId: result.newHostId,
          newHostName: newHost ? newHost.name : 'Unknown',
        });
      }

      // Broadcast updated lobby
      io.to(roomCode).emit(SOCKET_EVENTS.LOBBY_UPDATED, {
        players: engine.getPlayersArray(),
        hostId: engine.hostId,
        settings: {
          winningScore: engine.winningScore,
          mainTimer: engine.mainTimerDuration,
          retryTimer: engine.retryTimerDuration,
          difficulty: engine.difficulty,
        },
        state: engine.state,
      });
    }
  });
};
