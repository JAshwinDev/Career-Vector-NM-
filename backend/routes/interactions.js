const express = require("express");
const Interaction = require("../models/Interaction");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      userId,
      jobId,
      resumeProfileId,
      interactionType,
      matchScore,
      actionDetails,
      timeSpent,
      status,
      notes
    } = req.body;

    if (!interactionType) {
      return res.status(400).json({ error: "interactionType is required." });
    }

    const interaction = await Interaction.create({
      userId: userId || undefined,
      jobId: jobId || undefined,
      resumeProfileId: resumeProfileId || undefined,
      interactionType,
      matchScore: Number.isFinite(Number(matchScore)) ? Number(matchScore) : undefined,
      actionDetails: actionDetails || {},
      timeSpent: Number.isFinite(Number(timeSpent)) ? Number(timeSpent) : undefined,
      status: status || "completed",
      notes: notes || ""
    });

    return res.status(201).json({
      success: true,
      id: interaction._id
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to save interaction.",
      details: err.message
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { userId, interactionType, limit = 25 } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (interactionType) filter.interactionType = interactionType;

    const interactions = await Interaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.json(interactions);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch interactions.",
      details: err.message
    });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const [total, grouped, recent] = await Promise.all([
      Interaction.countDocuments(),
      Interaction.aggregate([
        {
          $group: {
            _id: "$interactionType",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Interaction.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select("interactionType matchScore status createdAt")
        .lean()
    ]);

    return res.json({
      total,
      byType: grouped.map((item) => ({
        type: item._id,
        count: item.count
      })),
      recent
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch interaction stats.",
      details: err.message
    });
  }
});

module.exports = router;
