// ── Game State Machine ──────────────────────────────────────────────
const GAME_STATES = {
  WAITING: 'WAITING',
  STARTING: 'STARTING',
  QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  RETRY_ACTIVE: 'RETRY_ACTIVE',
  QUESTION_RESULT: 'QUESTION_RESULT',
  GAME_OVER: 'GAME_OVER',
};

// ── Valid Room Settings ─────────────────────────────────────────────
const WINNING_SCORES = [10, 20, 30, 40, 50];
const MAIN_TIMERS = [30, 45];
const RETRY_TIMERS = [10, 15, 20, 30];
const DIFFICULTIES = ['easy', 'moderate', 'easy+moderate'];

// ── Limits ──────────────────────────────────────────────────────────
const MAX_PLAYERS = 8;
const MIN_PLAYERS_TO_START = 2;
const MAX_PLAYER_NAME_LENGTH = 20;
const MIN_PLAYER_NAME_LENGTH = 2;
const ROOM_CODE_LENGTH = 6;

// ── Timing ──────────────────────────────────────────────────────────
const ROOM_EXPIRY_MS = 2 * 60 * 60 * 1000;       // 2 hours
const RESULT_DISPLAY_MS = 5000;                    // 5 seconds between questions
const STARTING_COUNTDOWN_MS = 3000;                // 3 second countdown before first question
const RECONNECT_GRACE_MS = 30 * 1000;              // 30 seconds to reconnect
const MAX_QUESTIONS_PER_GAME = 200;                // safety cap

// ── Categories ──────────────────────────────────────────────────────
const CATEGORIES = [
  'Indian History',
  'World History',
  'Geography',
  'Indian Polity',
  'Science',
  'Space',
  'Sports',
  'Computers',
  'Current Affairs',
  'General Knowledge',
];

// ── Socket.IO Event Names ───────────────────────────────────────────
const SOCKET_EVENTS = {
  // Client → Server
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  START_GAME: 'start_game',
  SUBMIT_ANSWER: 'submit_answer',
  LEAVE_ROOM: 'leave_room',
  RESTART_GAME: 'restart_game',

  // Server → Client
  ROOM_CREATED: 'room_created',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  LOBBY_UPDATED: 'lobby_updated',
  GAME_STARTED: 'game_started',
  NEW_QUESTION: 'new_question',
  TIMER_UPDATE: 'timer_update',
  ANSWER_RESULT: 'answer_result',
  PLAYER_ANSWERED: 'player_answered',
  PLAYER_LOCKED: 'player_locked',
  RETRY_STARTED: 'retry_started',
  QUESTION_RESULT: 'question_result',
  SCORE_UPDATED: 'score_updated',
  GAME_OVER: 'game_over',
  HOST_CHANGED: 'host_changed',
  ROOM_CLOSED: 'room_closed',
  RECONNECTED: 'reconnected',
  ERROR: 'error',
};

module.exports = {
  GAME_STATES,
  WINNING_SCORES,
  MAIN_TIMERS,
  RETRY_TIMERS,
  DIFFICULTIES,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  MAX_PLAYER_NAME_LENGTH,
  MIN_PLAYER_NAME_LENGTH,
  ROOM_CODE_LENGTH,
  ROOM_EXPIRY_MS,
  RESULT_DISPLAY_MS,
  STARTING_COUNTDOWN_MS,
  RECONNECT_GRACE_MS,
  MAX_QUESTIONS_PER_GAME,
  CATEGORIES,
  SOCKET_EVENTS,
};
