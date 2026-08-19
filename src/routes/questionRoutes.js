const express = require('express');
const QuestionService = require('../game/QuestionService');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ── GET /api/questions/count — Get question count by difficulty ──────
router.get('/count', apiLimiter, async (req, res) => {
  try {
    const { difficulty } = req.query;
    const count = await QuestionService.getCount(difficulty || undefined);
    return res.status(200).json({ count });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch question count' });
  }
});

module.exports = router;
