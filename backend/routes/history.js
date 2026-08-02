const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const JobHistory = require("../models/JobHistory");
const User = require("../models/User");
const localStore = require("../utils/localStore");
const { requireAuth } = require("../middleware/auth");

function toScore(body) {
  const raw = body.score ?? body.compatibilityScore ?? body.matchScore;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeMissing(body) {
  const detailedInput = Array.isArray(body.missingDetails)
    ? body.missingDetails
    : Array.isArray(body.missing_skills)
      ? body.missing_skills
      : [];

  const missingDetails = detailedInput
    .map((item) => {
      if (typeof item === "string") {
        return { skill: item, weight: 0 };
      }

      if (item && typeof item === "object" && item.skill) {
        return {
          skill: item.skill,
          weight: Number(item.weight) || 0
        };
      }

      return null;
    })
    .filter(Boolean);

  const missing = Array.isArray(body.missing)
    ? body.missing
    : missingDetails.map((item) => item.skill);

  return { missing, missingDetails };
}

function normalizeEntry(body, score, missing, missingDetails, userId) {
  return {
    entryType: body.entryType || "job-match",
    source: body.source || "platform",
    userId: userId || "",
    resumeProfileId: body.resumeProfileId || "",
    score,
    compatibilityScore: Number(body.compatibilityScore ?? score),
    matched: body.matched || body.matchedSkills || [],
    missing,
    missingDetails,
    recommendation: body.recommendation || "N/A",
    summary: body.summary || "",
    jobTitle: body.jobTitle || "",
    company: body.company || "",
    jobUrl: body.jobUrl || "",
    jobDescription: body.jobDescription || "",
    jobSkills: body.jobSkills || body.job_skills || [],
    targetRole: body.targetRole || body.target_role || "",
    roleDescription: body.roleDescription || body.role_description || "",
    studentSkills: body.studentSkills || body.student_skills || [],
    roadmap: body.roadmap || [],
    allRoleScores: body.allRoleScores || body.all_role_scores || {},
    resumeFileName: body.resumeFileName || ""
  };
}

function buildStats(all) {
  const total = all.length;
  const avgScore = total
    ? Math.round(all.reduce((sum, item) => sum + (item.compatibilityScore ?? item.score ?? 0), 0) / total)
    : 0;
  const resumeAnalysisCount = all.filter((item) => item.entryType === "resume-analysis").length;
  const jobMatchCount = all.filter((item) => item.entryType !== "resume-analysis").length;
  const applyCount = all.filter((item) => item.recommendation?.includes("APPLY NOW")).length;
  const maybeCount = all.filter((item) => item.recommendation?.includes("MAYBE")).length;
  const skipCount = all.filter((item) => item.recommendation?.includes("SKIP")).length;
  const missingFreq = {};

  all.forEach((item) => {
    (item.missing || []).forEach((skill) => {
      missingFreq[skill] = (missingFreq[skill] || 0) + 1;
    });
  });

  const topMissing = Object.entries(missingFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({ skill, count }));

  return {
    total,
    avgScore,
    resumeAnalysisCount,
    jobMatchCount,
    applyCount,
    maybeCount,
    skipCount,
    topMissing
  };
}

function percentileFor(score, peers) {
  if (!peers.length) return 0;
  const belowOrEqual = peers.filter((item) => Number(item.compatibilityScore ?? item.score ?? 0) <= score).length;
  return Math.round((belowOrEqual / peers.length) * 100);
}

// POST /history
router.post("/", requireAuth, async (req, res) => {
  try {
    const score = toScore(req.body);
    if (score === null) {
      return res.status(400).json({ error: "score is required." });
    }

    const { missing, missingDetails } = normalizeMissing(req.body);

    const payload = normalizeEntry(req.body, score, missing, missingDetails, req.userId);
    const entry = localStore.isMongoReady(mongoose)
      ? await new JobHistory(payload).save()
      : localStore.createHistory(payload);

    res.json({ success: true, id: entry._id, entry });
  } catch (err) {
    res.status(500).json({ error: "Failed to save history.", details: err.message });
  }
});

// GET /history
router.get("/", requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const filter = { userId: req.userId };

    if (req.query.entryType) {
      filter.entryType = req.query.entryType;
    }

    if (req.query.source) {
      filter.source = req.query.source;
    }

    const history = localStore.isMongoReady(mongoose)
      ? await JobHistory.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
      : localStore.listHistory({ ...filter, limit });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history." });
  }
});

// GET /history/stats
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = String(req.userId || "");
    const all = localStore.isMongoReady(mongoose)
      ? await JobHistory.find(userId ? { userId } : {}).lean()
      : localStore.listHistory({ userId, limit: 10000 });

    res.json(buildStats(all));
  } catch (err) {
    res.status(500).json({ error: "Failed to compute stats." });
  }
});

// GET /history/peer-comparison
router.get("/peer-comparison", requireAuth, async (req, res) => {
  try {
    const role = String(req.query.role || "").trim();
    const score = Number(req.query.score);
    const entryId = String(req.query.entryId || "");

    const all = localStore.isMongoReady(mongoose)
      ? await JobHistory.find({ entryType: "resume-analysis" }).lean()
      : localStore.listHistory({ entryType: "resume-analysis", limit: 10000 });

    const selected = entryId ? all.find((item) => String(item._id) === entryId) : null;
    const targetRole = role || selected?.targetRole || selected?.target_role || "";
    const currentScore = Number.isFinite(score)
      ? score
      : Number(selected?.compatibilityScore ?? selected?.score ?? 0);
    const allInRole = all.filter((item) => {
      const itemRole = item.targetRole || item.target_role || "";
      return targetRole ? itemRole.toLowerCase() === targetRole.toLowerCase() : true;
    });

    const peers = allInRole.filter(item => !(entryId && String(item._id) === entryId));

    const avgScore = peers.length
      ? Math.round(peers.reduce((sum, item) => sum + Number(item.compatibilityScore ?? item.score ?? 0), 0) / peers.length)
      : 0;
    const aheadCount = peers.filter((item) => Number(item.compatibilityScore ?? item.score ?? 0) > currentScore).length;
    const aheadPercent = peers.length ? Math.round((aheadCount / peers.length) * 100) : 0;
    const percentile = percentileFor(currentScore, peers);

    // Fetch user names. JobHistory.userId is stored as a String, but User._id
    // is an ObjectId, so cast valid ids before querying; skip malformed ones
    // (e.g. demo ids like "demo-<timestamp>").
    const userIds = [...new Set(allInRole.map(item => item.userId).filter(Boolean))];
    const objectIds = userIds
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const users = localStore.isMongoReady(mongoose) && objectIds.length
      ? await User.find({ _id: { $in: objectIds } }, "name").lean()
      : [];
    const userMap = users.reduce((acc, user) => {
      acc[String(user._id)] = user.name;
      return acc;
    }, {});

    const allSorted = allInRole
      .sort((a, b) => Number(b.compatibilityScore ?? b.score ?? 0) - Number(a.compatibilityScore ?? a.score ?? 0))
      .map((item, index) => ({
        rank: index + 1,
        label: item.userId ? (userMap[item.userId] || `Student ${String(item.userId).slice(0, 4).toUpperCase()}`) : `Student ${index + 1}`,
        score: Number(item.compatibilityScore ?? item.score ?? 0),
        targetRole: item.targetRole || "",
        isCurrent: entryId ? String(item._id) === entryId : false
      }));

    let leaderboard = allSorted.slice(0, 5);
    const currentUserEntry = allSorted.find(item => item.isCurrent);
    if (currentUserEntry && currentUserEntry.rank > 5) {
      leaderboard.push(currentUserEntry);
    }

    res.json({
      role: targetRole || "Selected role",
      score: currentScore,
      peerCount: peers.length,
      avgScore,
      aheadPercent,
      percentile,
      leaderboard
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute peer comparison.", details: err.message });
  }
});

// GET /history/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const entry = localStore.isMongoReady(mongoose)
      ? await JobHistory.findById(req.params.id).lean()
      : localStore.getHistoryById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "History entry not found." });
    }

    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch entry." });
  }
});

// DELETE /history/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (localStore.isMongoReady(mongoose)) {
      await JobHistory.findByIdAndDelete(req.params.id);
    } else {
      localStore.deleteHistory(req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entry." });
  }
});

module.exports = router;

