require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gk-battle';
const TARGET_QUESTIONS = 1000;
const BATCH_SIZE = 50;

function decodeBase64(str) {
  return Buffer.from(str, 'base64').toString('utf-8');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchQuestions() {
  let questionsAdded = 0;
  
  while (questionsAdded < TARGET_QUESTIONS) {
    console.log(`\nFetching batch... (${questionsAdded}/${TARGET_QUESTIONS})`);
    
    try {
      // Use base64 encoding to avoid HTML entities parsing issues
      const res = await fetch(`https://opentdb.com/api.php?amount=${BATCH_SIZE}&type=multiple&encode=base64`);
      
      if (res.status === 429) {
        console.log("Rate limited! Waiting 5 seconds...");
        await delay(5000);
        continue;
      }

      const data = await res.json();
      
      if (data.response_code !== 0) {
        console.log("OpenTDB API returned error code:", data.response_code);
        await delay(3000);
        continue;
      }

      const formattedQuestions = data.results.map(q => {
        const difficulty = decodeBase64(q.difficulty);
        // Map OpenTDB difficulty to our schema (easy, moderate)
        let mappedDifficulty = 'moderate';
        if (difficulty === 'easy') mappedDifficulty = 'easy';
        
        // Combine correct and incorrect answers and shuffle them
        const correctAnswerString = decodeBase64(q.correct_answer);
        const incorrectAnswersString = q.incorrect_answers.map(decodeBase64);
        
        const options = [...incorrectAnswersString, correctAnswerString];
        // Simple shuffle
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
        
        const correctIndex = options.indexOf(correctAnswerString);
        
        return {
          question: decodeBase64(q.question),
          options: options,
          correctAnswer: correctIndex,
          difficulty: mappedDifficulty,
          category: decodeBase64(q.category)
        };
      });

      // Insert to DB
      await Question.insertMany(formattedQuestions);
      questionsAdded += formattedQuestions.length;
      console.log(`Successfully inserted ${formattedQuestions.length} questions.`);

    } catch (error) {
      console.error("Error fetching or inserting questions:", error);
    }

    // OpenTDB strictly requires 1 request per second max, wait 2 seconds to be safe
    console.log("Waiting 2 seconds before next request...");
    await delay(2000);
  }
}

async function start() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB!");
    
    console.log(`Starting to fetch ${TARGET_QUESTIONS} questions from OpenTDB...`);
    await fetchQuestions();
    
    console.log(`\n🎉 Successfully finished fetching ${TARGET_QUESTIONS} questions!`);
    
    const count = await Question.countDocuments();
    console.log(`Total questions in database now: ${count}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
}

start();
