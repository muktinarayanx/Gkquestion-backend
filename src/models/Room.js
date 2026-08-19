const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    playerId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    socketId: { type: String, default: null },
    score: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    connected: { type: Boolean, default: true },
    isHost: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    hostId: { type: String, required: true },
    winningScore: {
      type: Number,
      required: true,
      enum: [10, 20, 30, 40, 50],
    },
    mainTimer: {
      type: Number,
      required: true,
      enum: [30, 45],
    },
    retryTimer: {
      type: Number,
      required: true,
      enum: [10, 15, 20, 30],
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'moderate', 'easy+moderate'],
    },
    status: {
      type: String,
      default: 'WAITING',
      enum: [
        'WAITING',
        'STARTING',
        'QUESTION_ACTIVE',
        'RETRY_ACTIVE',
        'QUESTION_RESULT',
        'GAME_OVER',
      ],
    },
    players: [playerSchema],
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// TTL index — MongoDB automatically deletes documents when expiresAt is reached
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Room', roomSchema);
