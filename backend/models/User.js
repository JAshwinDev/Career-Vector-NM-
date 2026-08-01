const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true
    },
    password: {
      type: String
    },
    isDemo: {
      type: Boolean,
      default: false
    },
    name: {
      type: String
    },
    profilePicture: {
      type: String
    },
    resumeProfiles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ResumeProfile"
      }
    ],
    jobMatches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobHistory"
      }
    ],
    currentRole: {
      type: String,
      default: ""
    },
    targetRole: {
      type: String,
      default: ""
    },
    skills: [String],
    preferences: {
      notificationEmail: Boolean,
      darkMode: {
        type: Boolean,
        default: true
      },
      preferredJobLocations: [String],
      minSalary: Number
    },
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
