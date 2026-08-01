const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    url: { type: String, default: "" },
    type: { type: String, default: "article" }
  },
  { _id: false }
);

const roadmapItemSchema = new mongoose.Schema(
  {
    skill: { type: String, default: "" },
    duration: { type: String, default: "" },
    start_week: { type: Number, default: null },
    resources: { type: [resourceSchema], default: [] }
  },
  { _id: false }
);

const missingSkillSchema = new mongoose.Schema(
  {
    skill: { type: String, default: "" },
    weight: { type: Number, default: 0 }
  },
  { _id: false }
);

const jobHistorySchema = new mongoose.Schema({
  entryType: { type: String, default: "job-match" },
  source: { type: String, default: "platform" },
  userId: { type: String, default: "" },
  resumeProfileId: { type: String, default: "" },
  score: { type: Number, required: true },
  compatibilityScore: { type: Number, default: null },
  matched: { type: [String], default: [] },
  missing: { type: [String], default: [] },
  missingDetails: { type: [missingSkillSchema], default: [] },
  recommendation: { type: String, default: "N/A" },
  summary: { type: String, default: "" },
  jobTitle: { type: String, default: "" },
  company: { type: String, default: "" },
  jobUrl: { type: String, default: "" },
  jobDescription: { type: String, default: "" },
  jobSkills: { type: [String], default: [] },
  targetRole: { type: String, default: "" },
  roleDescription: { type: String, default: "" },
  studentSkills: { type: [String], default: [] },
  roadmap: { type: [roadmapItemSchema], default: [] },
  allRoleScores: { type: Map, of: Number, default: {} },
  resumeFileName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("JobHistory", jobHistorySchema);
