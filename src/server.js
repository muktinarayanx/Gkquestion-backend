require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const roomRoutes = require('./routes/roomRoutes');
const questionRoutes = require('./routes/questionRoutes');
const setupSocketHandlers = require('./sockets/socketHandler');
const roomManager = require('./game/RoomManager');
const { apiLimiter } = require('./middleware/rateLimiter');

// ── Config ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/gk-battle';

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'production') {
      // In production, strictly use the CLIENT_URL
      callback(null, process.env.CLIENT_URL);
    } else {
      // In development, allow all origins so mobile devices can connect
      callback(null, true);
    }
  },
  credentials: true,
};

// ── Express App ─────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.IO ───────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Give RoomManager access to the io instance
roomManager.setIO(io);

// ── Middleware ───────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api/rooms', roomRoutes);
app.use('/api/questions', questionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Socket.IO Handlers ─────────────────────────────────────────────
setupSocketHandlers(io);

// ── MongoDB Connection & Server Start ───────────────────────────────
async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO accepting connections`);
      console.log(`🌐 Client URL: ${CLIENT_URL}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  io.close();
  await mongoose.connection.close();
  server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  io.close();
  await mongoose.connection.close();
  server.close();
  process.exit(0);
});

start();
