const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 4,
        message: 'A question must have exactly 4 options',
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, 'Correct answer index is required'],
      min: 0,
      max: 3,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate'],
      required: [true, 'Difficulty is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound index for fetching questions by difficulty
questionSchema.index({ difficulty: 1, category: 1 });
questionSchema.index({ difficulty: 1 });
questionSchema.index({ category: 1 });

module.exports = mongoose.model('Question', questionSchema);
