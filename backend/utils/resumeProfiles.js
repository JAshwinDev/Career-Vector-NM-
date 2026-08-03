const path = require("path");
const mongoose = require("mongoose");
const ResumeProfile = require("../models/ResumeProfile");
const localStore = require("./localStore");
const { uniqueSkills } = require("./skillUtils");
const { ML_SERVICE_URL } = require("../services/mlService");
const jobRoleData = require("../../ml-service/data/job_roles.json");
const roleData = jobRoleData.roles || jobRoleData;
const knownSkills = uniqueSkills(
  Object.values(roleData).flatMap((role) => Object.keys(role.required_skills || role.skills || {}))
);

// pdfjs-dist ships ESM only; load the legacy Node build via a cached dynamic
// import (see examples/node/getinfo.mjs in the pdf.js repo).
const pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");

const standardFontDataUrl =
  path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") + path.sep;

async function parsePdfBuffer(buffer) {
  const pdfjs = await pdfjsPromise;
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data, standardFontDataUrl });
  const doc = await loadingTask.promise;

  try {
    const pageTexts = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      try {
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? String(item.str) : ""))
          .join(" ");
        pageTexts.push(pageText);
      } finally {
        page.cleanup();
      }
    }
    return pageTexts.join("\n").trim();
  } finally {
    await loadingTask.destroy();
  }
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
