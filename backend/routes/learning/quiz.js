const express = require("express");
const router = express.Router();
const Quiz = require("../../models/Quiz");
const { requireAuth } = require("../../middleware/auth");
const { ML_SERVICE_URL } = require("../../services/mlService");

// Initialize Gemini API
let geminiModel = null;
try {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "your_gemini_api_key_here") {
    const genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
  }
} catch (err) {
  console.warn("Gemini API not available:", err.message);
}

// Generate and sanitize MCQ questions with Gemini. Throws on failure so
// callers can decide whether to fall back to a local question bank.
async function generateQuestionsWithGemini(skills, numQuestions) {
  if (!geminiModel) {
    throw new Error("Gemini API not configured");
  }

  const skillsList = skills.slice(0, 5).join(", ");

  const prompt = `Generate ${numQuestions} technical skill verification quiz questions based on these skills: ${skillsList}.

    For each question, create a realistic technical question that verifies if the person actually has that skill.

    Return a JSON array with this exact format (no markdown, just raw JSON):
    [
      {
        "question": "specific technical question about the skill",
        "options": ["correct answer", "distractor 1", "distractor 2", "distractor 3"],
        "correctAnswer": "correct answer",
        "skill": "the skill name",
        "difficulty": "easy|medium|hard"
      }
    ]

    Make questions practical and real-world relevant. Shuffle option order so correct answer is not always first.`;

  const result = await geminiModel.generateContent(prompt);
  const responseText = result.response.text();

  let questions = [];
  try {
    questions = JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      questions = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("Could not parse Gemini response");
    }
  }

  const sanitized = questions
    .filter(q => q.question && Array.isArray(q.options) && q.correctAnswer && q.skill)
    .slice(0, numQuestions)
    .map((q, idx) => ({
      id: `q${idx + 1}`,
      question: q.question,
      options: q.options.slice(0, 4),
      correctAnswer: q.correctAnswer,
      skill: q.skill,
      difficulty: q.difficulty || "medium"
    }));

  if (sanitized.length === 0) {
    throw new Error("No valid questions generated");
  }

  return sanitized;
}

// POST /quiz/generate-from-skills - Generate quiz questions from resume skills using Gemini
router.post("/generate-from-skills", async (req, res) => {
  try {
    const { resumeSkills = [], numQuestions = 5 } = req.body;

    if (!Array.isArray(resumeSkills) || resumeSkills.length === 0) {
      return res.status(400).json({ error: "resumeSkills array is required and cannot be empty." });
    }

    if (!geminiModel) {
      return res.status(503).json({ error: "Gemini API not configured. Using fallback questions." });
    }

    const questions = await generateQuestionsWithGemini(resumeSkills, numQuestions);

    res.json({
      success: true,
      questions,
      totalQuestions: questions.length,
      source: "gemini",
      skills: resumeSkills
    });
  } catch (err) {
    console.error("Gemini quiz generation error:", err);
    res.status(500).json({
      error: "Failed to generate quiz with AI",
      details: err.message,
      fallback: true
    });
  }
});

// POST /quiz/generate - Generate MCQ questions for a role
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { targetRole, numQuestions = 10 } = req.body;
    const userId = req.userId || null;

    if (!targetRole) {
      return res.status(400).json({ error: "targetRole is required." });
    }

    // Fetch role information from ML service
    let roleSkills = [];
    try {
      const response = await fetch(`${ML_SERVICE_URL}/roles`);
      if (response.ok) {
        const roles = await response.json();
        const role = roles[targetRole];
        if (role) {
          roleSkills = Object.keys(role.required_skills || {});
        }
      }
    } catch (err) {
      console.error("Failed to fetch role from ML service:", err.message);
    }

    // Prefer AI-generated questions; fall back to the local question bank if
    // Gemini is unavailable or returns nothing usable.
    let questions;
    let source = "gemini";
    try {
      const geminiSourceSkills = roleSkills.length ? roleSkills : [targetRole];
      questions = await generateQuestionsWithGemini(geminiSourceSkills, numQuestions);
    } catch (err) {
      console.warn("Gemini generation failed, using question bank:", err.message);
      questions = generateMCQQuestions(targetRole, roleSkills, numQuestions);
      source = "bank";
    }

    // Create quiz document (demo users don't exist in the DB, so store no userId)
    const isDemo = Boolean(req.auth && req.auth.is_demo);
    const quiz = new Quiz({
      userId: isDemo ? null : (userId || null),
      targetRole,
      questions,
      totalQuestions: questions.length,
      status: "draft"
    });

    await quiz.save();

    res.json({
      quizId: quiz._id,
      targetRole,
      source,
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        skill: q.skill,
        difficulty: q.difficulty
      }))
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate quiz.", details: err.message });
  }
});

// POST /quiz/:id/submit - Submit quiz answers
router.post("/:id/submit", async (req, res) => {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "answers array is required." });
    }

    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    // Evaluate answers
    let correctCount = 0;
    const userAnswers = [];
    const skillsPerformance = {};

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);

      if (!question) continue;

      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      const skill = question.skill;

      userAnswers.push({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        correct: isCorrect
      });

      if (isCorrect) {
        correctCount++;
      }

      // Track skill performance
      if (!skillsPerformance[skill]) {
        skillsPerformance[skill] = { correct: 0, total: 0 };
      }
      skillsPerformance[skill].total++;
      if (isCorrect) {
        skillsPerformance[skill].correct++;
      }
    }

    const percentageScore = Math.round((correctCount / Math.max(answers.length, 1)) * 100);

    // Generate suggestions
    const suggestions = generateSuggestions(skillsPerformance, quiz.targetRole);

    // Update quiz
    quiz.userAnswers = userAnswers;
    quiz.score = correctCount;
    quiz.percentageScore = percentageScore;
    quiz.timeSpent = req.body.timeSpent || 0;
    quiz.skillsPerformance = skillsPerformance;
    quiz.suggestions = suggestions;
    quiz.completedAt = new Date();
    quiz.status = "completed";

    await quiz.save();

    res.json({
      success: true,
      score: correctCount,
      totalQuestions: quiz.totalQuestions,
      percentageScore,
      skillsPerformance: Object.fromEntries(
        Object.entries(skillsPerformance).map(([skill, data]) => [
          skill,
          Math.round((data.correct / data.total) * 100)
        ])
      ),
      suggestions,
      feedback: generateFeedback(percentageScore, quiz.targetRole)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit quiz.", details: err.message });
  }
});

// GET /quiz/user - Current user's quiz history (from JWT)
router.get("/user", requireAuth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quizzes.", details: err.message });
  }
});

// GET /quiz/:id - Get quiz details
router.get("/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found." });
    }

    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quiz.", details: err.message });
  }
});

// Helper function to generate MCQ questions
function generateMCQQuestions(targetRole, roleSkills, numQuestions) {
  const questions = [];
  const questionBank = getMCQQuestionBank(targetRole, roleSkills);

  // Shuffle and select questions
  for (let i = 0; i < Math.min(numQuestions, questionBank.length); i++) {
    const randomIndex = Math.floor(Math.random() * questionBank.length);
    const question = questionBank[randomIndex];
    questions.push({
      id: `q${i + 1}`,
      ...question
    });
    questionBank.splice(randomIndex, 1);
  }

  return questions;
}

// MCQ Question Bank
function getMCQQuestionBank(targetRole, roleSkills) {
  const questionBank = [
    {
      question: "What is the primary purpose of version control?",
      options: [
        "To track changes and collaborate on code",
        "To compile code",
        "To optimize performance",
        "To secure the network"
      ],
      correctAnswer: "To track changes and collaborate on code",
      skill: "Git",
      difficulty: "easy"
    },
    {
      question: "Which of the following is NOT a JavaScript framework?",
      options: ["React", "Angular", "Vue", "Django"],
      correctAnswer: "Django",
      skill: "JavaScript",
      difficulty: "easy"
    },
    {
      question: "What does REST stand for?",
      options: [
        "Representational State Transfer",
        "Remote Service Transfer",
        "Request Service Task",
        "Response Service Task"
      ],
      correctAnswer: "Representational State Transfer",
      skill: "REST API",
      difficulty: "medium"
    },
    {
      question: "In SQL, which command is used to retrieve data?",
      options: ["GET", "FETCH", "SELECT", "RETRIEVE"],
      correctAnswer: "SELECT",
      skill: "SQL",
      difficulty: "easy"
    },
    {
      question: "What is the time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n²)", "O(n log n)"],
      correctAnswer: "O(log n)",
      skill: "Data Structures",
      difficulty: "medium"
    },
    {
      question: "Which design pattern ensures only one instance of a class exists?",
      options: ["Factory", "Singleton", "Observer", "Strategy"],
      correctAnswer: "Singleton",
      skill: "OOP",
      difficulty: "medium"
    },
    {
      question: "What is the main purpose of Docker?",
      options: [
        "Containerization and deployment consistency",
        "Database management",
        "Version control",
        "Code compilation"
      ],
      correctAnswer: "Containerization and deployment consistency",
      skill: "Docker",
      difficulty: "medium"
    },
    {
      question: "Which of the following is a NoSQL database?",
      options: ["PostgreSQL", "MongoDB", "MySQL", "SQLite"],
      correctAnswer: "MongoDB",
      skill: "NoSQL",
      difficulty: "easy"
    }
  ];

  return questionBank;
}

// Helper function to generate suggestions
function generateSuggestions(skillsPerformance, targetRole) {
  const suggestions = [];

  for (const [skill, performance] of Object.entries(skillsPerformance)) {
    const percentage = Math.round((performance.correct / performance.total) * 100);

    if (percentage < 50) {
      suggestions.push(`Improve your ${skill} knowledge - Current: ${percentage}%`);
    } else if (percentage < 80) {
      suggestions.push(`Review advanced concepts in ${skill} - Current: ${percentage}%`);
    }
  }

  if (suggestions.length === 0) {
    suggestions.push(`Excellent! You have strong knowledge in this domain.`);
  }

  return suggestions;
}

// Helper function to generate feedback
function generateFeedback(score, targetRole) {
  if (score >= 80) {
    return {
      message: `Great job! You're ready for ${targetRole} roles.`,
      recommendation: "Apply to relevant positions now!"
    };
  } else if (score >= 60) {
    return {
      message: `Good progress! Focus on filling knowledge gaps.`,
      recommendation: "Complete the recommended learning roadmap and retake the quiz."
    };
  } else {
    return {
      message: `You need more preparation for ${targetRole} roles.`,
      recommendation: "Follow the detailed learning roadmap and practice more."
    };
  }
}

module.exports = router;
