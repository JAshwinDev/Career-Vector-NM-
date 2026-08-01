const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      sparse: true
    },
    resumeProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumeProfile",
      sparse: true
    },
    interactionType: {
      type: String,
      enum: [
        "resume_upload",
        "job_view",
        "job_apply",
        "match_check",
        "roadmap_view",
        "roadmap_follow",
        "quiz_attempt",
        "quiz_complete"
      ],
      required: true
    },
    matchScore: Number,
    actionDetails: mongoose.Schema.Types.Mixed,
    timeSpent: Number,
    status: {
      type: String,
      enum: ["initiated", "completed", "abandoned"],
      default: "completed"
    },
    notes: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interaction", interactionSchema);
