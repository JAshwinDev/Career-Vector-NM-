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

function generateAuthNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function apiPost(config, path, body) {
  const response = await fetch(`${config.BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  return data;
}

// Google OAuth runs in the service worker (not the popup) so the flow survives
// the popup closing when the Google sign-in window steals focus.
async function handleGoogleAuth() {
  const config = await getConfig();

  if (!config.GOOGLE_CLIENT_ID) {
    throw new Error("Configure your Google OAuth Client ID in Settings first.");
  }

  const redirectUri = chrome.identity.getRedirectURL();
  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    response_type: "id_token",
    scope: "openid email profile",
    redirect_uri: redirectUri,
    nonce: generateAuthNonce(),
    prompt: "select_account"
  });

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "Google sign-in cancelled."));
          return;
        }
        if (!redirectUrl) {
          reject(new Error("Google sign-in returned no response."));
          return;
        }
        resolve(redirectUrl);
      }
    );
  });

  const idToken = new URLSearchParams(new URL(responseUrl).hash.slice(1)).get("id_token");
  if (!idToken) {
    throw new Error("No ID token returned from Google.");
  }

  const data = await apiPost(config, "/auth/google", { idToken });
  const session = { token: data.token, user: data.user, method: "google" };

  await setStorage({
    cv_authToken: session.token,
    cv_authUser: session.user || null,
    cv_authMethod: session.method
  });

  // The extension and the website share one session: push this token into the
  // web app's localStorage so the website is signed in with the same account.
  await pushTokenToFrontend(session.token, session.user);

  return session;
}

// ============================================================================
// SHARED SESSION (web-app bridge)
//
// The single source of truth for the account is the auth token stored in the
// web app's localStorage (localhost:3000). A content script (src/bridge.js)
// relays it to this service worker. The extension caches it in chrome.storage,
// and any login/logout in either surface is reflected in the other.
// ============================================================================

async function getFrontendTabs() {
  const config = await getConfig();
  const frontend = String(config.FRONTEND_URL || "").replace(/\/+$/, "");
  const all = await chrome.tabs.query({});
  return (all || []).filter((tab) => tab.url && tab.url.startsWith(frontend));
}

async function sendToFrontend(payload) {
  const tabs = await getFrontendTabs();
  const results = [];
  for (const tab of tabs) {
    try {
      const response = await sendToTab(tab.id, payload);
      results.push(response);
    } catch (error) {
      // Content script may not be ready on that tab yet; skip it.
    }
  }
  return results.filter(Boolean);
}

async function readTokenFromFrontend() {
  const results = await sendToFrontend({ type: "BRIDGE_GET_TOKEN" });
  for (const result of results) {
    if (result && result.token) {
      return { token: result.token, user: result.user || null };
    }
  }
  return null;
}

function pushTokenToFrontend(token, user) {
  return sendToFrontend({ type: "BRIDGE_SET_TOKEN", token, user });
}

function clearFrontendAuth() {
  return sendToFrontend({ type: "BRIDGE_CLEAR" });
}

// Resolve the current session: cached token first, then the website's token.
async function getSessionState() {
  const cached = await getStorage(["cv_authToken", "cv_authUser", "cv_authMethod"]);
  if (cached.cv_authToken) {
    return {
      token: cached.cv_authToken,
      user: cached.cv_authUser || null,
      method: cached.cv_authMethod || "google",
      source: "cache"
    };
  }

  const fromWebsite = await readTokenFromFrontend();
  if (fromWebsite && fromWebsite.token) {
    await setStorage({
      cv_authToken: fromWebsite.token,
      cv_authUser: fromWebsite.user || null,
      cv_authMethod: "google"
    });
    return { token: fromWebsite.token, user: fromWebsite.user || null, method: "google", source: "website" };
  }

  return { token: "", user: null, method: "" };
}

async function clearCachedSession() {
  await chrome.storage.local.remove(["cv_authToken", "cv_authUser", "cv_authMethod"]);
}

async function authHeaders() {
  const stored = await getStorage(["cv_authToken"]);
  return stored.cv_authToken
    ? { Authorization: `Bearer ${stored.cv_authToken}` }
    : {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getActiveTab() {
  let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) {
    [tab] = await chrome.tabs.query({ active: true });
  }
  return tab;
}

function sendToTab(tabId, payload) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Tab message failed"));
        return;
      }
      resolve(response);
    });
  });
}

function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["src/config.js", "src/jobExtractor.js", "src/content.js"]
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "Script injection failed"));
          return;
        }
        resolve();
      }
    );
  });
}

// Ask the active tab's content script to talk to LinkedIn. Falls back to
// injecting the content script if it is not present yet.
async function extractFromActiveTab(type) {
  const tab = await getActiveTab();

  if (!tab || !tab.id) {
    throw new Error("No active tab found.");
  }

  if (!tab.url || !tab.url.includes("linkedin.com")) {
    const err = new Error("Open a LinkedIn job listing to use this feature.");
    err.code = "NOT_LINKEDIN";
    throw err;
  }

  try {
    return await sendToTab(tab.id, { type });
  } catch (error) {
    await injectContentScript(tab.id);
    await sleep(500);
    return await sendToTab(tab.id, { type });
  }
}

// Lightweight check of the current tab so the popup can show job status on open.
async function handleGetJobPreview() {
  try {
    const preview = await extractFromActiveTab("EXTRACT_JOB_PREVIEW");

    if (preview && preview.isJobPage) {
      return {
        success: true,
        isJobPage: true,
        jobTitle: preview.jobTitle,
        company: preview.company,
        jobUrl: preview.jobUrl
      };
    }
    return { success: true, isJobPage: false };
  } catch (err) {
    if (err.code === "NOT_LINKEDIN") {
      return { success: true, isJobPage: false };
    }
    return { success: false, error: "Open a LinkedIn job page to analyze." };
  }
}

// Popup-driven analysis: extract the job from the active tab, then match it.
async function handleAnalyzeCurrentJob() {
  const extraction = await extractFromActiveTab("EXTRACT_JOB_DETAILS");

  if (!extraction || !extraction.success || !extraction.jobData) {
    throw new Error((extraction && extraction.error) || "Could not extract LinkedIn job details.");
  }

  return await handleJobAnalysis({ type: "ANALYZE_JOB", jobData: extraction.jobData });
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
    throw new Error("Add skills in the extension popup first.");
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

  const dashboardUrl = saved && saved.id
    ? `${config.FRONTEND_URL}/dashboard?analysisId=${saved.id}`
    : `${config.FRONTEND_URL}/dashboard?tab=history`;

  return {
    success: true,
    analysis: normalizedAnalysis,
    analysisId: saved && saved.id,
    dashboardUrl
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GOOGLE_AUTH") {
    handleGoogleAuth()
      .then((session) => {
        console.log("Google auth completed:", session.user && session.user.email);
        sendResponse({ success: true, ...session });
      })
      .catch((err) => {
        console.error("Google auth error:", err.message);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  // The web app (via src/bridge.js) reports that its session changed.
  if (message.type === "AUTH_SYNC") {
    if (!message.token || message.action === "logout") {
      clearCachedSession()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    } else {
      setStorage({
        cv_authToken: message.token,
        cv_authUser: message.user || null,
        cv_authMethod: "google"
      })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    }

    return true;
  }

  // Popup requests the current shared session.
  if (message.type === "GET_SESSION") {
    getSessionState()
      .then((session) => sendResponse({ success: true, ...session }))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true;
  }

  // Popup logout: revoke the token on the backend, clear the cache, and sign
  // the website out too.
  if (message.type === "EXT_LOGOUT") {
    (async () => {
      try {
        const config = await getConfig();
        const stored = await getStorage(["cv_authToken"]);
        if (stored.cv_authToken) {
          try {
            await fetch(`${config.BACKEND_URL}/auth/logout`, {
              method: "POST",
              headers: { Authorization: `Bearer ${stored.cv_authToken}` }
            });
          } catch (error) {
            // Backend may be offline; still clear local sessions.
          }
        }
        await clearCachedSession();
        await clearFrontendAuth();
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true;
  }

  if (message.type === "GET_JOB_PREVIEW") {
    handleGetJobPreview()
      .then((data) => sendResponse(data))
      .catch((err) => {
        console.error("Job preview error:", err);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (message.type === "ANALYZE_CURRENT_JOB") {
    handleAnalyzeCurrentJob()
      .then((data) => {
        console.log("Job analysis completed:", data && data.analysisId);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("Job analysis error:", err);
        sendResponse({ success: false, error: err.message });
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
    getStorage(["cv_authToken"]).then(({ cv_authToken }) => {
      let url = message.url;
      if (cv_authToken) {
        const parsed = new URL(url);
        parsed.searchParams.set("token", cv_authToken);
        url = parsed.toString();
      }

      chrome.tabs.create({ url, active: true });

      sendResponse({ success: true, message: "Opening dashboard" });
    });

    return true;
  }
});

// The toolbar icon opens the action popup defined by manifest "default_popup".

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
