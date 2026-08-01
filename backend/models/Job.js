const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    externalJobId: {
      type: String,
      unique: true,
      sparse: true
    },
    title: {
      type: String,
      required: true
    },
    company: {
      type: String,
      required: true
    },
    location: {
      city: String,
      state: String,
      country: String,
      remote: Boolean
    },
    description: {
      type: String,
      required: true
    },
    requirements: [String],
    skills: [String],
    salary: {
      min: Number,
      max: Number,
      currency: String
    },
    jobType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "freelance"],
      default: "full-time"
    },
    experience_level: {
      type: String,
      enum: ["entry", "mid", "senior", "lead"],
      default: "mid"
    },
    url: {
      type: String
    },
    source: {
      type: String,
      enum: ["linkedin", "jsearch", "indeed", "glassdoor"],
      default: "jsearch"
    },
    externalUrl: String,
    postedDate: Date,
    applicationDeadline: Date,
    companyLogo: String,
    industryCategory: String,
    ingestedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", description: "text", skills: 1 });
jobSchema.index({ source: 1, externalJobId: 1 });

module.exports = mongoose.model("Job", jobSchema);
