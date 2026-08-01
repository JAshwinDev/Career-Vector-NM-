const mongoose = require("mongoose");

const resumeProfileSchema = new mongoose.Schema({
  source: { type: String, default: "extension" },
  sourceType: { type: String, default: "pdf" },
  fileName: { type: String, default: "" },
  rawText: { type: String, default: "" },
  manualSkills: { type: [String], default: [] },
  extractedSkills: { type: [String], default: [] },
  selectedRole: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ResumeProfile", resumeProfileSchema);
