const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true
    },
    targetRole: {
      type: String,
      required: true
    },
    questions: [
      {
        id: String,
        question: String,
        options: [String],
        correctAnswer: String,
        skill: String,
        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium"
        }
      }
    ],
    userAnswers: [
      {
        questionId: String,
        selectedAnswer: String,
        correct: Boolean
      }
    ],
    score: Number,
    totalQuestions: Number,
    percentageScore: Number,
    timeSpent: Number,
    skillsPerformance: {
      type: Map,
      of: Number
    },
    suggestions: [String],
    completedAt: Date,
    status: {
      type: String,
      enum: ["draft", "in-progress", "completed"],
      default: "draft"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
