const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractSkillsLocally } = require("../utils/resumeProfiles");

// Current non-deprecated model aliases (see ai.google.dev/gemini-api/docs/models):
//   FLASH_LITE_MODEL -> "gemini-flash-lite-latest" (Flash-Lite family)
//   FLASH_MODEL      -> "gemini-flash-latest"      (Flash family)
const FLASH_LITE_MODEL = "gemini-flash-lite-latest";
const FLASH_MODEL = "gemini-flash-latest";

const GEMINI_TIMEOUT_MS = 20000;
const MAX_RESUME_CHARS = 25000;
const MAX_JOB_DESCRIPTION_CHARS = 25000;

const apiKey = process.env.GEMINI_API_KEY;
const hasGemini = Boolean(apiKey && apiKey !== "your_gemini_api_key_here");

let genAI = null;
if (hasGemini) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (err) {
    console.warn("Gemini API not available:", err.message);
  }
}

function getModel(name) {
  if (!genAI) return null;
  return genAI.getGenerativeModel({
    model: name,
    generationConfig: { responseMimeType: "application/json" }
  });
}

function parseJsonResponse(responseText) {
  const text = String(responseText || "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function sanitizeSkills(skills) {
  return [...new Set((skills || []).map((skill) => String(skill).trim()).filter(Boolean))];
}

function clip(text, max) {
  return String(text || "").slice(0, max);
}

// Extract skills, experience years, and prior roles from raw resume text.
// Returns { skills, experienceYears, priorRoles }. On any parse failure or
// API error, falls back to the local regex extractor so the upload flow
// is never broken by a Gemini outage or a missing/invalid key.
async function extractResumeSkills(resumeText) {
  const fallback = () => ({
    skills: extractSkillsLocally(resumeText),
    experienceYears: null,
    priorRoles: []
  });

  const model = getModel(FLASH_LITE_MODEL);
  if (!model) return fallback();

  const prompt = `You are a resume parser. Extract structured information from the resume text below.

Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "skills": ["Skill A", "Skill B"],
  "experienceYears": 3,
  "priorRoles": ["Role A", "Role B"]
}

Rules:
- "skills" must be a flat array of technical and professional skills mentioned in the resume (languages, frameworks, tools, platforms). Omit generic filler unless it is clearly emphasized.
- "experienceYears" must be the total years of professional experience as a number, or null if not stated.
- "priorRoles" must be a flat array of job titles/roles the candidate has held.
- Use exactly the field names above.

Resume text:
<resume>
${clip(resumeText, MAX_RESUME_CHARS)}
</resume>`;

  try {
    const result = await model.generateContent(
      { contents: [{ role: "user", parts: [{ text: prompt }] }] },
      { timeout: GEMINI_TIMEOUT_MS }
    );
    const data = parseJsonResponse(result.response.text());

    if (!data || !Array.isArray(data.skills)) {
      return fallback();
    }

    const skills = sanitizeSkills(data.skills);
    const experienceYears = typeof data.experienceYears === "number" ? data.experienceYears : null;
    const priorRoles = Array.isArray(data.priorRoles)
      ? data.priorRoles.map((role) => String(role).trim()).filter(Boolean)
      : [];

    return {
      skills: skills.length ? skills : extractSkillsLocally(resumeText),
      experienceYears,
      priorRoles
    };
  } catch (err) {
    console.warn("Gemini resume extraction failed, falling back to local regex:", err.message);
    return fallback();
  }
}

// Score a candidate's skills against a raw job description.
// Returns null on any parse failure or API error so the caller can fall
// through to the existing ML-service / regex match logic.
async function matchResumeToJob(resumeSkills, jobDescription) {
  const model = getModel(FLASH_MODEL);
  if (!model) return null;

  const skillsList = sanitizeSkills(resumeSkills);

  const prompt = `You are a career advisor matching a candidate to a job posting.

Candidate skills: ${skillsList.join(", ")}

Job description:
<job>
${clip(jobDescription, MAX_JOB_DESCRIPTION_CHARS)}
</job>

Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "matchScore": 0-100,
  "recommendation": "APPLY NOW" | "MAYBE APPLY" | "SKIP",
  "missingSkills": [{"skill": "Skill Name", "importance": "high"|"medium"|"low"}],
  "matchedSkills": ["Skill A", "Skill B"],
  "reasoning": "1-2 sentences explaining the verdict."
}

Rules:
- matchScore must be an integer from 0 to 100 reflecting overall fit between the candidate's skills and the job's requirements.
- recommendation must be exactly one of the three allowed values.
- missingSkills lists skills the job requires that the candidate appears to lack, each with its importance to the role.
- matchedSkills lists the candidate's skills that the job clearly requires or values.
- reasoning must be 1-2 sentences.`;

  try {
    const result = await model.generateContent(
      { contents: [{ role: "user", parts: [{ text: prompt }] }] },
      { timeout: GEMINI_TIMEOUT_MS }
    );
    const data = parseJsonResponse(result.response.text());

    if (!data) return null;

    const matchScore = Math.max(0, Math.min(100, Math.round(Number(data.matchScore)) || 0));
    const recommendation = ["APPLY NOW", "MAYBE APPLY", "SKIP"].includes(data.recommendation)
      ? data.recommendation
      : "MAYBE APPLY";
    const missingSkills = Array.isArray(data.missingSkills)
      ? data.missingSkills
          .filter((item) => item && item.skill)
          .map((item) => ({
            skill: String(item.skill).trim(),
            importance: ["high", "medium", "low"].includes(item.importance) ? item.importance : "medium"
          }))
      : [];
    const matchedSkills = sanitizeSkills(data.matchedSkills);
    const reasoning = String(data.reasoning || "").trim();

    return {
      matchScore,
      recommendation,
      missingSkills,
      matchedSkills,
      reasoning
    };
  } catch (err) {
    console.warn("Gemini job match failed, falling back to ML service:", err.message);
    return null;
  }
}

module.exports = {
  extractResumeSkills,
  matchResumeToJob,
  FLASH_LITE_MODEL,
  FLASH_MODEL
};
