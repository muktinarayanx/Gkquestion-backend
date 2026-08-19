const {
  WINNING_SCORES,
  MAIN_TIMERS,
  RETRY_TIMERS,
  DIFFICULTIES,
  MIN_PLAYER_NAME_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
} = require('../utils/constants');

/**
 * Sanitize a string — trim and escape basic HTML entities.
 */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate room creation settings.
 */
function validateRoomSettings(settings) {
  const errors = [];

  if (!settings || typeof settings !== 'object') {
    return ['Settings are required'];
  }

  if (!WINNING_SCORES.includes(settings.winningScore)) {
    errors.push(`winningScore must be one of: ${WINNING_SCORES.join(', ')}`);
  }
  if (!MAIN_TIMERS.includes(settings.mainTimer)) {
    errors.push(`mainTimer must be one of: ${MAIN_TIMERS.join(', ')}`);
  }
  if (!RETRY_TIMERS.includes(settings.retryTimer)) {
    errors.push(`retryTimer must be one of: ${RETRY_TIMERS.join(', ')}`);
  }
  if (!DIFFICULTIES.includes(settings.difficulty)) {
    errors.push(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`);
  }

  return errors;
}

/**
 * Validate a player name.
 */
function validatePlayerName(name) {
  if (!name || typeof name !== 'string') return 'Player name is required';
  const trimmed = name.trim();

  if (trimmed.length < MIN_PLAYER_NAME_LENGTH) {
    return `Name must be at least ${MIN_PLAYER_NAME_LENGTH} characters`;
  }
  if (trimmed.length > MAX_PLAYER_NAME_LENGTH) {
    return `Name must be at most ${MAX_PLAYER_NAME_LENGTH} characters`;
  }
  if (!/^[a-zA-Z0-9_ -]+$/.test(trimmed)) {
    return 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
  }

  return null; // valid
}

/**
 * Validate a room code format.
 */
function validateRoomCode(code) {
  if (!code || typeof code !== 'string') return 'Room code is required';
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length !== 6 || !/^[A-Z0-9]+$/.test(trimmed)) {
    return 'Invalid room code format';
  }
  return null;
}

module.exports = {
  sanitize,
  validateRoomSettings,
  validatePlayerName,
  validateRoomCode,
};
