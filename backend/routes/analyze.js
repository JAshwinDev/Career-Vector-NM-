const express = require("express");
const multer = require("multer");
const {
  createResumeProfile,
  extractSkillsWithMl,
  parsePdfBuffer
} = require("../utils/resumeProfiles");
const { parseSkillsInput, uniqueSkills } = require("../utils/skillUtils");
const jobRoleData = require("../../ml-service/data/job_roles.json");
const { ML_SERVICE_URL } = require("../utils/mlService");
const roleData = jobRoleData.roles || jobRoleData;

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

function roleSkills(roleName) {
  const role = roleData[roleName] || {};
  const required = role.required_skills || role.skills || {};
  if (Array.isArray(required)) return required;
  return Object.keys(required);
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function skillMatches(userSkill, requiredSkill) {
  const user = normalize(userSkill);
  const required = normalize(requiredSkill);
  return user === required || user.includes(required) || required.includes(user);
}

function buildRoadmap(missingSkills) {
  return missingSkills.slice(0, 6).map((item, index) => ({
    skill: item.skill,
    duration: `${Math.max(1, index + 1)} week${index ? "s" : ""}`,
    start_week: index + 1,
    resources: [
      {
        title: `${item.skill} practical tutorial`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.skill} tutorial for beginners`)}`,
        type: "video"
      }
    ]
  }));
}

function fallbackAnalyze(skills, targetRole) {
  const roles = Object.keys(roleData);
  const selectedRole = targetRole && roleData[targetRole] ? targetRole : roles[0];
  const allRoleScores = {};

  for (const role of roles) {
    const required = roleSkills(role);
    const matched = required.filter((requiredSkill) =>
      skills.some((skill) => skillMatches(skill, requiredSkill))
    );
    allRoleScores[role] = Math.round((matched.length / Math.max(required.length, 1)) * 100);
  }

  const requiredSkills = roleSkills(selectedRole);
  const matchedSkills = requiredSkills.filter((requiredSkill) =>
    skills.some((skill) => skillMatches(skill, requiredSkill))
  );
  const missingSkills = requiredSkills
    .filter((skill) => !matchedSkills.includes(skill))
    .slice(0, 10)
    .map((skill) => ({ skill, weight: 0.7 }));
  const score = allRoleScores[selectedRole] || 0;

  return {
    student_skills: skills,
    target_role: selectedRole,
    compatibility_score: score,
    matched_skills: matchedSkills,
    missing_skills: missingSkills,
    roadmap: buildRoadmap(missingSkills),
    all_role_scores: allRoleScores,
    role_description: roleData[selectedRole]?.description || `Preparation score for ${selectedRole}.`,
    recommendation: score >= 65 ? "APPLY NOW" : score >= 35 ? "MAYBE APPLY" : "BUILD SKILLS FIRST",
    summary: "Local analysis used because the ML service was unavailable.",
    is_fallback: true
  };
}

router.post("/", upload.single("resume"), async (req, res) => {
  try {
    const targetRole = req.body.role || "";
    const manualSkills = parseSkillsInput(req.body.skills);
    let rawText = "";
    let extractedSkills = [];

    if (req.file) {
      try {
        rawText = await parsePdfBuffer(req.file.buffer);
      } catch {
        return res.status(400).json({ error: "Could not parse PDF." });
      }

      if (!rawText || rawText.length < 50) {
        return res.status(400).json({ error: "PDF appears empty or image-only." });
      }

      extractedSkills = await extractSkillsWithMl(rawText);
    }

    const mergedSkills = uniqueSkills([
      ...extractedSkills,
      ...manualSkills
    ]);

    if (!mergedSkills.length) {
      return res.status(400).json({
        error: "No skills found. Please upload a resume or enter skills manually."
      });
    }

    const formData = new FormData();

    if (targetRole) formData.append("role", targetRole);
    if (mergedSkills.length) {
      formData.append("skills", mergedSkills.join(", "));
    } else if (req.body.skills) {
      formData.append("skills", req.body.skills);
    }

    let data;
    try {
      const response = await fetch(`${ML_SERVICE_URL}/analyze`, {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        data = await response.json();
      } else {
        const errBody = await response.json().catch(() => ({}));
        console.warn("ML service error:", response.status, errBody.error);
        data = fallbackAnalyze(mergedSkills, targetRole);
      }
    } catch (err) {
      console.warn("ML service unavailable, using fallback:", err.message);
      data = fallbackAnalyze(mergedSkills, targetRole);
    }

    const storedSkills = uniqueSkills(data.student_skills || mergedSkills);
    const profile = await createResumeProfile({
      source: "platform",
      sourceType: req.file ? "pdf" : "manual",
      fileName: req.file?.originalname || "",
      rawText,
      manualSkills,
      extractedSkills: storedSkills,
      selectedRole: targetRole
    });

    return res.json({
      ...data,
      resumeProfileId: String(profile._id),
      profileId: String(profile._id),
      resumeFileName: req.file?.originalname || ""
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to analyze resume.",
      details: err.message
    });
  }
});

module.exports = router;
