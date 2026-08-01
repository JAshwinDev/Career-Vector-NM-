const express = require("express");
const {
  createResumeProfile,
  extractSkillsWithMl,
  parsePdfBuffer
} = require("../utils/resumeProfiles");
const { parseSkillsInput, uniqueSkills } = require("../utils/skillUtils");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { fileData, fileName, additionalSkills } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: "No file data provided." });
    }

    const base64 = fileData.includes(",") ? fileData.split(",")[1] : fileData;
    const buffer = Buffer.from(base64, "base64");

    let pdfText = "";

    try {
      pdfText = await parsePdfBuffer(buffer);
    } catch {
      return res.status(400).json({ error: "Could not parse PDF." });
    }

    if (!pdfText || pdfText.length < 50) {
      return res.status(400).json({ error: "PDF appears empty or image-only." });
    }

    const extractedSkills = await extractSkillsWithMl(pdfText);
    const manualSkills = parseSkillsInput(additionalSkills);
    const skills = uniqueSkills([
      ...extractedSkills,
      ...manualSkills
    ]);

    const profile = await createResumeProfile({
      source: "extension",
      sourceType: "pdf",
      fileName: fileName || "resume.pdf",
      rawText: pdfText,
      manualSkills,
      extractedSkills: skills
    });

    return res.json({
      profileId: String(profile._id),
      resumeProfileId: String(profile._id),
      skills,
      fileName: fileName || profile.fileName,
      message: "Resume processed and stored in MongoDB."
    });
  } catch (err) {
    return res.status(500).json({ error: `Internal error: ${err.message}` });
  }
});

module.exports = router;
