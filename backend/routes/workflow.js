const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const ResumeProfile = require("../models/ResumeProfile");
const Job = require("../models/Job");
const JobHistory = require("../models/JobHistory");
const Interaction = require("../models/Interaction");
const Quiz = require("../models/Quiz");
const localStore = require("../utils/localStore");
const { ML_SERVICE_URL } = require("../utils/mlService");

const router = express.Router();

router.get("/overview", async (_req, res) => {
  try {
    let ml = "down";

    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      if (mlResponse.ok) {
        ml = "up";
      }
    } catch {
      ml = "down";
    }

    let counts;
    if (localStore.isMongoReady(mongoose)) {
      const [
        users,
        resumeProfiles,
        jobs,
        analyses,
        interactions,
        completedQuizzes,
        avgScoreResult
      ] = await Promise.all([
        User.countDocuments(),
        ResumeProfile.countDocuments(),
        Job.countDocuments(),
        JobHistory.countDocuments(),
        Interaction.countDocuments(),
        Quiz.countDocuments({ status: "completed" }),
        JobHistory.aggregate([
          {
            $group: {
              _id: null,
              avgScore: { $avg: { $ifNull: ["$compatibilityScore", "$score"] } }
            }
          }
        ])
      ]);

      counts = {
        users,
        resumeProfiles,
        jobs,
        analyses,
        interactions,
        completedQuizzes,
        avgMatchScore: Math.round(avgScoreResult[0]?.avgScore || 0)
      };
    } else {
      const data = localStore.readStore();
      const completedQuizzes = data.quizzes.filter((quiz) => quiz.status === "completed").length;
      const scores = data.histories.map((item) => Number(item.compatibilityScore ?? item.score ?? 0));
      const avgMatchScore = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;

      counts = {
        users: data.users.length,
        resumeProfiles: data.resumeProfiles.length,
        jobs: 0,
        analyses: data.histories.length,
        interactions: 0,
        completedQuizzes,
        avgMatchScore
      };
    }

    return res.json({
      status: "ok",
      services: {
        backend: "up",
        mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        ml
      },
      counts,
      workflow: {
        website: [
          { id: "login", label: "Google OAuth Login", path: "/login", ready: true },
          { id: "upload", label: "Upload Resume", path: "/upload", ready: true },
          { id: "dashboard", label: "Show Dashboard", path: "/dashboard", ready: true }
        ],
        extension: [
          { id: "detect", label: "Detect LinkedIn Job", ready: true },
          { id: "extract", label: "Extract Title & Description", ready: true },
          { id: "match", label: "Show Match, Gaps, Decision", ready: true },
          { id: "roadmap", label: "Open Roadmap", path: "/roadmap", ready: true }
        ],
        jobSearch: [
          { id: "select-domain", label: "Select Role / Domain", path: "/jobs", ready: true },
          { id: "filter", label: "Filter Jobs", path: "/jobs", ready: true },
          { id: "profile-match", label: "Match With User Profile", path: "/jobs", ready: true },
          { id: "display-results", label: "Display Results", path: "/jobs", ready: true }
        ],
        roadmap: [
          { id: "select-role", label: "Select Role", path: "/quiz", ready: true },
          { id: "generate-roadmap", label: "Generate Roadmap", path: "/roadmap", ready: true }
        ],
        quiz: [
          { id: "readiness", label: "Check Readiness", path: "/quiz", ready: true },
          { id: "mcq", label: "Generate Skill MCQs", path: "/quiz", ready: true },
          { id: "evaluate", label: "Evaluate Score", path: "/quiz", ready: true },
          { id: "improve", label: "Suggest Improvements", path: "/roadmap", ready: true }
        ]
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to build workflow overview.",
      details: err.message
    });
  }
});

module.exports = router;
