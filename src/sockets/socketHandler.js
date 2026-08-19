const registerRoomEvents = require('./roomEvents');
const registerGameEvents = require('./gameEvents');

/**
 * Main Socket.IO connection handler.
 * Registers all event handlers for each new socket connection.
 */
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    registerRoomEvents(socket, io);
    registerGameEvents(socket, io);

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err.message);
    });
  });
}

module.exports = setupSocketHandlers;
