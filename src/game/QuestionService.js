const Question = require('../models/Question');
const mongoose = require('mongoose');

/**
 * QuestionService — fetches and prepares questions for a game session.
 */
class QuestionService {
  /**
   * Fetch a batch of random, non-repeating questions from MongoDB.
   *
   * @param {string}   difficulty     – 'easy', 'moderate', or 'easy+moderate'
   * @param {number}   count          – how many questions to fetch
   * @param {string[]} excludeIds     – question _ids to exclude (already used)
   * @returns {Promise<Array>}        – array of question documents
   */
  static async fetchQuestions(difficulty, count, excludeIds = []) {
    const filter = {};

    if (difficulty === 'easy') {
      filter.difficulty = 'easy';
    } else if (difficulty === 'moderate') {
      filter.difficulty = 'moderate';
    }
    // 'easy+moderate' → no difficulty filter, fetch both

    if (excludeIds.length > 0) {
      filter._id = { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    // Use MongoDB $sample aggregation for true random selection
    const pipeline = [];
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }
    pipeline.push({ $sample: { size: count } });

    const questions = await Question.aggregate(pipeline);
    return questions;
  }

  /**
   * Prepare a question for sending to clients (strip the correct answer).
   *
   * @param {Object} question – raw question document from DB
   * @returns {{ questionId: string, question: string, options: string[] }}
   */
  static sanitizeForClient(question) {
    return {
      questionId: question._id.toString(),
      question: question.question,
      options: question.options,
    };
  }

  /**
   * Get total question count (optionally by difficulty).
   */
  static async getCount(difficulty) {
    const filter = {};
    if (difficulty === 'easy') filter.difficulty = 'easy';
    else if (difficulty === 'moderate') filter.difficulty = 'moderate';
    return Question.countDocuments(filter);
  }
}

module.exports = QuestionService;
