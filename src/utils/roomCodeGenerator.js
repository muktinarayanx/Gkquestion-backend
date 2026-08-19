const { ROOM_CODE_LENGTH } = require('./constants');

// Exclude visually ambiguous characters: I, O, 0, 1
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random alphanumeric code of the given length.
 */
function generateCode(length = ROOM_CODE_LENGTH) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

/**
 * Generate a unique room code that doesn't exist in any active room.
 * @param {Function} existsCheck – async fn(code) => boolean
 * @returns {Promise<string>}
 */
async function generateUniqueRoomCode(existsCheck) {
  const MAX_ATTEMPTS = 20;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = generateCode();
    const exists = await existsCheck(code);
    if (!exists) return code;
  }

  throw new Error('Failed to generate a unique room code after multiple attempts');
}

module.exports = { generateCode, generateUniqueRoomCode };
