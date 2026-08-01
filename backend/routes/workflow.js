const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const ResumeProfile = require("../models/ResumeProfile");
const Job = require("../models/Job");
const JobHistory = require("../models/JobHistory");
const Interaction = require("../models/Interaction");
const Quiz = require("../models/Quiz");

const router = express.Router();

router.get("/overview", async (_req, res) => {
  try {
    let ml = "down";

    try {
      const mlResponse = await fetch("http://localhost:5001/health", {
        signal: AbortSignal.timeout(2000)
      });
      if (mlResponse.ok) {
        ml = "up";
      }
    } catch {
      ml = "down";
    }

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

    return res.json({
      status: "ok",
      services: {
        backend: "up",
        mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        ml
      },
      counts: {
        users,
        resumeProfiles,
        jobs,
        analyses,
        interactions,
        completedQuizzes,
        avgMatchScore: Math.round(avgScoreResult[0]?.avgScore || 0)
      },
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
