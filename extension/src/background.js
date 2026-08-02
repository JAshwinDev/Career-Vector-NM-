importScripts("config.js");

function buildRecommendation(score) {
  if (score >= 65) return "APPLY NOW";
  if (score >= 35) return "MAYBE APPLY";
  return "SKIP - Low Match";
}

async function parseJsonResponse(response, fallbackMessage) {
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

function setStorage(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

async function authHeaders() {
  const stored = await getStorage(["cv_authToken"]);
  return stored.cv_authToken
    ? { Authorization: `Bearer ${stored.cv_authToken}` }
    : {};
}

async function extractResumeSkills(fileData, fileName) {
  const config = await getConfig();
  const response = await fetch(`${config.BACKEND_URL}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileData, fileName })
  });

  return parseJsonResponse(response, "Resume upload failed.");
}

async function fetchRoleRecommendations(skills) {
  const config = await getConfig();
  const response = await fetch(`${config.BACKEND_URL}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills })
  });

  const data = await parseJsonResponse(response, "Role recommendation failed.");
  return Array.isArray(data.recommendations) ? data.recommendations : [];
}

async function generateResumeAnalysis(skills, targetRole) {
  const config = await getConfig();
  const formData = new FormData();
  formData.append("skills", skills.join(", "));
  formData.append("role", targetRole);

  const response = await fetch(`${config.BACKEND_URL}/analyze`, {
    method: "POST",
    body: formData
  });

  return parseJsonResponse(response, "Resume analysis failed.");
}

async function saveResumeAnalysis({ analysis, fileName, source = "extension-resume" }) {
  const config = await getConfig();
  const score = Number(analysis.compatibility_score || 0);
  const missingDetails = Array.isArray(analysis.missing_skills) ? analysis.missing_skills : [];
  const missing = missingDetails.map((item) => item.skill || item).filter(Boolean);

  const storedAuth = await getStorage(["cv_authMethod"]);
  if (storedAuth.cv_authMethod === "demo") {
    return { skipped: true, reason: "demo-account" };
  }

  const response = await fetch(`${config.BACKEND_URL}/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      entryType: "resume-analysis",
      source,
      resumeProfileId: analysis.resumeProfileId || "",
      score,
      compatibilityScore: score,
      matched: analysis.matched_skills || [],
      missing,
      missingDetails,
      recommendation: buildRecommendation(score),
      summary: `Resume analyzed for ${analysis.target_role || "recommended role"}.`,
      targetRole: analysis.target_role || "",
      roleDescription: analysis.role_description || "",
      studentSkills: analysis.student_skills || [],
      roadmap: analysis.roadmap || [],
      allRoleScores: analysis.all_role_scores || {},
      resumeFileName: fileName || ""
    })
  });

  return parseJsonResponse(response, "Failed to save analysis.");
}

async function saveJobAnalysis({
  analysis,
  jobContext,
  jobDescription,
  resumeProfileId,
  source = "extension-popup"
}) {
  const config = await getConfig();
  const score = Number(analysis.matchScore ?? analysis.compatibility_score ?? 0);
  const missingDetails = Array.isArray(analysis.missing_skills) ? analysis.missing_skills : [];
  const missing = Array.isArray(analysis.missingSkills)
    ? analysis.missingSkills
    : missingDetails.map((item) => item.skill).filter(Boolean);

  const storedAuth = await getStorage(["cv_authMethod"]);
  if (storedAuth.cv_authMethod === "demo") {
    return { skipped: true, reason: "demo-account" };
  }

  const response = await fetch(`${config.BACKEND_URL}/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      entryType: "job-match",
      source,
      resumeProfileId: analysis.resumeProfileId || resumeProfileId || "",
      score,
      compatibilityScore: score,
      matched: analysis.matchedSkills || analysis.matched_skills || [],
      missing,
      missingDetails,
      recommendation: analysis.recommendation || buildRecommendation(score),
      summary: analysis.summary || "",
      jobTitle: jobContext.jobTitle || "",
      company: jobContext.company || "",
      jobUrl: jobContext.jobUrl || "",
      jobDescription: String(jobDescription || "").slice(0, 4000),
      jobSkills: analysis.jobSkills || analysis.job_skills || [],
      targetRole: analysis.targetRole || analysis.target_role || "",
      roleDescription: analysis.roleDescription || analysis.role_description || "",
      studentSkills: analysis.studentSkills || analysis.student_skills || [],
      roadmap: analysis.roadmap || [],
      allRoleScores: analysis.allRoleScores || analysis.all_role_scores || {}
    })
  });

  return parseJsonResponse(response, "Failed to save job analysis.");
}

async function handleResumeUpload(message) {
  const uploadData = await extractResumeSkills(message.fileData, message.fileName);
  const skills = Array.isArray(uploadData.skills) ? uploadData.skills : [];

  if (!skills.length) {
    return {
      ...uploadData,
      error: "No skills were extracted from this resume."
    };
  }

  let recommendations = [];
  try {
    recommendations = await fetchRoleRecommendations(skills);
  } catch (error) {
    console.warn("Role recommendation fallback:", error.message);
  }

  const targetRole = message.targetRole || recommendations[0]?.role || "Software Developer";
  const analysis = await generateResumeAnalysis(skills, targetRole);
  analysis.resumeProfileId = uploadData.profileId || "";
  const saved = await saveResumeAnalysis({
    analysis,
    fileName: message.fileName
  });

  const config = await getConfig();
  return {
    ...uploadData,
    targetRole,
    recommendations,
    analysis,
    analysisId: saved.id,
    dashboardUrl: `${config.FRONTEND_URL}/dashboard?analysisId=${saved.id}`
  };
}

async function handleJobAnalysis(message) {
  const config = await getConfig();
  const description = String(message.jobData?.description || "").trim();
  const jobContext = message.jobData?.context || {};
  const requirements = message.jobData?.requirements || {};
  const stored = await getStorage(["userSkills", "resumeProfileId"]);
  const userSkills = Array.isArray(stored.userSkills) ? stored.userSkills : [];
  const resumeProfileId = stored.resumeProfileId || "";

  if (!description) {
    throw new Error("Could not extract job details from the page.");
  }

  if (!userSkills.length && !resumeProfileId) {
    throw new Error("Upload your resume first to analyze job matches.");
  }

  const response = await fetch(`${config.BACKEND_URL}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobDescription: description,
      userSkills,
      resumeProfileId,
      jobRequirements: Array.isArray(requirements.skills) ? requirements.skills : [],
      jobRequirementsText: Array.isArray(requirements.requirements) ? requirements.requirements : []
    })
  });

  const analysis = await parseJsonResponse(response, "Job analysis failed.");
  const saved = await saveJobAnalysis({
    analysis,
    jobContext,
    jobDescription: description,
    resumeProfileId
  });

  const score = Number(analysis.matchScore ?? analysis.compatibility_score ?? 0);
  const matchedSkills = Array.isArray(analysis.matchedSkills)
    ? analysis.matchedSkills
    : Array.isArray(analysis.matched_skills)
      ? analysis.matched_skills
      : [];
  const missingSkills = Array.isArray(analysis.missingSkills)
    ? analysis.missingSkills
    : Array.isArray(analysis.missing_skills)
      ? analysis.missing_skills.map((item) => item.skill || item).filter(Boolean)
      : [];
  const normalizedAnalysis = {
    ...analysis,
    matchScore: score,
    matchedSkills,
    missingSkills,
    jobTitle: analysis.jobTitle || jobContext.jobTitle || "",
    company: analysis.company || jobContext.company || "",
    jobUrl: analysis.jobUrl || jobContext.jobUrl || ""
  };

  await setStorage({
    latestAnalysisId: saved.id,
    latestJobAnalysis: normalizedAnalysis,
    lastJobAnalysis: normalizedAnalysis,
    lastAnalyzedJob: jobContext,
    matchScore: score,
    missingSkills,
    resumeProfileId: analysis.resumeProfileId || resumeProfileId || ""
  });

  return {
    success: true,
    analysis: normalizedAnalysis,
    analysisId: saved.id,
    dashboardUrl: `${config.FRONTEND_URL}/dashboard?analysisId=${saved.id}`
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPLOAD_RESUME") {
    handleResumeUpload(message)
      .then((data) => {
        // Store successful upload data
        chrome.storage.local.set({
          lastResumeUpload: {
            fileName: message.fileName,
            timestamp: new Date().toISOString(),
            skills: data.skills || [],
            targetRole: data.targetRole || "",
            analysisId: data.analysisId || ""
          }
        });
        sendResponse(data);
      })
      .catch((err) => {
        console.error("Resume upload error:", err);
        sendResponse({ error: err.message });
      });

    return true;
  }

  if (message.type === "ANALYZE_JOB") {
    handleJobAnalysis(message)
      .then((data) => {
        console.log("Job analysis completed:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("Job analysis error:", err);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (message.type === "OPEN_WEB_APP") {
    chrome.tabs.create({ url: message.url });
    sendResponse({ success: true, message: "Opening dashboard" });
    return true;
  }

  if (message.type === "GET_HEALTH_CHECK") {
    // Test backend connectivity
    getConfig().then((config) => {
      fetch(`${config.BACKEND_URL}/health`)
        .then(res => res.ok ? { healthy: true } : { healthy: false })
        .catch(() => ({ healthy: false }))
        .then(result => sendResponse(result));
    });
    return true;
  }

  if (message.type === "GET_STORED_DATA") {
    chrome.storage.local.get(null, (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === "CLEAR_STORED_DATA") {
    chrome.storage.local.clear(() => {
      sendResponse({ success: true, message: "Storage cleared" });
    });
    return true;
  }

  if (message.type === "REQUEST_JOB_EXTRACTION") {
    // Send message to content script to extract job details from current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "EXTRACT_JOB_DETAILS"
        }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ 
              error: "Could not extract job details from this page. Make sure you're on a LinkedIn job posting."
            });
          } else {
            sendResponse(response);
          }
        });
      }
    });
    return true;
  }
});

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log("Career Vector extension installed");
  
  // Set default storage values
  chrome.storage.local.get(["initialized"], (result) => {
    if (!result.initialized) {
      chrome.storage.local.set({
        initialized: true,
        userSkills: [],
        resumeProfileId: "",
        lastJobAnalysis: null,
        lastResumeUpload: null,
        analysisHistory: []
      });
      console.log("Initialized extension storage");
    }
  });
});

// Listen for tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("linkedin.com")) {
    // Inject content script for LinkedIn pages
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"]
    }).catch(err => console.log("Content script already injected or error:", err));
  }
});
