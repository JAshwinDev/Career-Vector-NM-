const express = require("express");
const mongoose = require("mongoose");
const ResumeProfile = require("../../models/ResumeProfile");
const localStore = require("../../utils/localStore");
const { extractSkillsLocally } = require("../../utils/resumeProfiles");
const { ML_SERVICE_URL } = require("../../services/mlService");

const router = express.Router();

function uniqueSkills(skills) {
  return [...new Set((skills || []).map((skill) => String(skill).trim()).filter(Boolean))];
}

function buildRecommendation(score) {
  if (score >= 65) return "APPLY NOW";
  if (score >= 35) return "MAYBE APPLY";
  return "SKIP - Low Match";
}

router.post("/", async (req, res) => {
  try {
    const { jobDescription, userSkills, resumeProfileId, jobRequirements, jobRequirementsText } = req.body;
    if (!jobDescription) {
      return res.status(400).json({ error: "jobDescription is required." });
    }

    let mergedSkills = uniqueSkills(userSkills);
    let resumeProfile = null;

    if (resumeProfileId) {
      resumeProfile = localStore.isMongoReady(mongoose)
        ? await ResumeProfile.findById(resumeProfileId).lean()
        : localStore.getResumeProfile(resumeProfileId);
      if (resumeProfile?.extractedSkills?.length) {
        mergedSkills = uniqueSkills([
          ...resumeProfile.extractedSkills,
          ...mergedSkills
        ]);
      }
    }

    if (!mergedSkills.length) {
      return res.status(400).json({ error: "userSkills are required." });
    }

    const response = await fetch(`${ML_SERVICE_URL}/job-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription,
        userSkills: mergedSkills,
        jobRequirements: jobRequirements || [],
        jobRequirementsText: jobRequirementsText || []
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json({
      ...data,
      resumeProfileId: resumeProfile ? String(resumeProfile._id) : (resumeProfileId || ""),
      studentSkills: mergedSkills,
      student_skills: mergedSkills
    });
  } catch (err) {
    console.error("ML match error:", err.message);

    const mergedSkills = uniqueSkills(req.body.userSkills);
    const descriptionLower = String(req.body.jobDescription || "").toLowerCase();
    // missingSkills = job-required skills the user lacks (not the inverse).
    const jobSkills = extractSkillsLocally(descriptionLower);
    const userSkillSet = new Set(mergedSkills.map((skill) => skill.toLowerCase()));
    const matchedSkills = jobSkills.filter((skill) => userSkillSet.has(skill.toLowerCase()));
    const missingSkills = jobSkills.filter((skill) => !userSkillSet.has(skill.toLowerCase())).slice(0, 8);
    const matchScore = Math.round((matchedSkills.length / Math.max(jobSkills.length, 1)) * 100);

    return res.json({
      matchScore,
      compatibility_score: matchScore,
      matchedSkills,
      matched_skills: matchedSkills,
      missingSkills,
      missing_skills: missingSkills.map((skill) => ({ skill, weight: 0.5 })),
      roadmap: [],
      allRoleScores: {},
      all_role_scores: {},
      targetRole: "",
      target_role: "",
      roleDescription: "",
      role_description: "",
      recommendation: buildRecommendation(matchScore),
      summary: "Fallback keyword match used because the ML service was unavailable.",
      studentSkills: mergedSkills,
      student_skills: mergedSkills,
      jobSkills: [],
      job_skills: []
    });
  }
});

module.exports = router;
