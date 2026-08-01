const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const ResumeProfile = require("../models/ResumeProfile");
const localStore = require("./localStore");
const { uniqueSkills } = require("./skillUtils");
const jobRoleData = require("../../ml-service/data/job_roles.json");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";
const roleData = jobRoleData.roles || jobRoleData;
const knownSkills = uniqueSkills(
  Object.values(roleData).flatMap((role) => Object.keys(role.required_skills || role.skills || {}))
);

async function parsePdfBuffer(buffer) {
  const pdfData = await pdfParse(buffer);
  return String(pdfData.text || "").trim();
}

async function extractSkillsWithMl(rawText) {
  try {
    const formData = new FormData();
    formData.append("text", rawText);

    const response = await fetch(`${ML_SERVICE_URL}/skills/extract`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      console.warn('ML service responded with error:', data.error);
      return extractSkillsLocally(rawText);
    }
    const skills = uniqueSkills(data.skills || []);
    return skills.length ? skills : extractSkillsLocally(rawText);
  } catch (err) {
    console.warn('Failed to contact ML service:', err.message);
    return extractSkillsLocally(rawText);
  }
}

function extractSkillsLocally(rawText) {
  const text = String(rawText || "").toLowerCase();
  return knownSkills.filter((skill) => {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
  });
}

async function createResumeProfile({
  source = "platform",
  sourceType = "manual",
  fileName = "",
  rawText = "",
  manualSkills = [],
  extractedSkills = [],
  selectedRole = ""
}) {
  const payload = {
    source,
    sourceType,
    fileName,
    rawText,
    manualSkills: uniqueSkills(manualSkills),
    extractedSkills: uniqueSkills(extractedSkills),
    selectedRole
  };

  if (!localStore.isMongoReady(mongoose)) {
    return localStore.createResumeProfile(payload);
  }

  return ResumeProfile.create(payload);
}

module.exports = {
  createResumeProfile,
  extractSkillsWithMl,
  extractSkillsLocally,
  parsePdfBuffer
};
