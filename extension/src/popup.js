console.log("CareerVector Extension popup loaded - v" + (chrome.runtime.getManifest().version || "1.0"));

let CONFIG = DEFAULT_CONFIG;

let els = {};
let lastDashboardUrl = "";
let sessionExpired = false;

function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Runtime message failed"));
        return;
      }
      resolve(response);
    });
  });
}

function setStatus(message, type) {
  els.status.textContent = message || "";
  els.status.className = "status" + (type ? " " + type : "");
}

// ============================================================================
// VIEW SWITCHING (single popup, two internal views)
// ============================================================================

function showView(name) {
  const home = document.getElementById("view-home");
  const skills = document.getElementById("view-skills");

  if (name === "skills") {
    home.hidden = true;
    skills.hidden = false;
    renderSkillsList();
  } else {
    skills.hidden = true;
    home.hidden = false;
    renderSkillsCount();
    refreshJobPreview();
  }

  document.body.classList.toggle("skills-open", name === "skills");
}

// ============================================================================
// AUTH MODULE
// ============================================================================

const AUTH_SESSION_KEYS = ["cv_authToken", "cv_authUser", "cv_authMethod"];

function setAuthStatus(message, type) {
  els.authStatus.textContent = message || "";
  els.authStatus.className = "auth-status" + (type ? " " + type : "");
}

function renderAuthLoggedOut() {
  els.authButtons.hidden = false;
  els.authSession.hidden = true;
  hideResult();
}

function renderAuthLoggedIn(session) {
  els.authButtons.hidden = true;
  els.authSession.hidden = false;

  const user = session.user || {};
  const displayName = user.name || user.email || "Logged in";
  const email = user.email || "";

  els.authSessionName.textContent = displayName;
  if (els.authSessionEmail) els.authSessionEmail.textContent = email;

  if (els.authSessionAvatar) {
    if (user.profilePicture) {
      els.authSessionAvatar.textContent = "";
      els.authSessionAvatar.style.backgroundImage = `url("${user.profilePicture}")`;
      els.authSessionAvatar.classList.add("has-image");
    } else {
      const initials = String(displayName)
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
      els.authSessionAvatar.textContent = initials;
      els.authSessionAvatar.style.backgroundImage = "";
      els.authSessionAvatar.classList.remove("has-image");
    }
  }
}

function getStoredSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(AUTH_SESSION_KEYS, (items) => {
      if (items.cv_authToken) {
        resolve({
          token: items.cv_authToken,
          user: items.cv_authUser || null,
          method: items.cv_authMethod || ""
        });
        return;
      }

      // No cached token: ask the background to pull the shared session from
      // the web app (localStorage on localhost:3000), so the extension picks
      // up the same account the user logged into on the website.
      sendRuntimeMessage({ type: "GET_SESSION" })
        .then((res) => {
          if (res && res.success && res.token) {
            resolve({
              token: res.token,
              user: res.user || null,
              method: res.method || "google"
            });
          } else {
            resolve({ token: "", user: null, method: "" });
          }
        })
        .catch(() => resolve({ token: "", user: null, method: "" }));
    });
  });
}

function setStoredSession(session) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        cv_authToken: session.token,
        cv_authUser: session.user || null,
        cv_authMethod: session.method
      },
      resolve
    );
  });
}

function clearStoredSession() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(AUTH_SESSION_KEYS, resolve);
  });
}

// Validate the cached token against the backend (the single source of truth).
// If the token was revoked or expired, discard the cached session so the popup
// never trusts stale login data.
async function validateSession() {
  const session = await getStoredSession();
  if (!session.token) return session;

  sessionExpired = false;

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/auth/user/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`
      }
    });

    if (response.status === 401) {
      sessionExpired = true;
      await clearStoredSession();
      renderAuthLoggedOut();
      setAuthStatus("Session expired. Please login again.", "error");
      return { token: "", user: null, method: "" };
    }

    if (!response.ok) {
      return session;
    }

    const user = await response.json();
    const refreshed = { ...session, user: user || null };
    await setStoredSession(refreshed);
    return refreshed;
  } catch (err) {
    console.warn("Failed to validate session:", err.message);
    return session;
  }
}

async function apiPost(path, body) {
  const response = await fetch(`${CONFIG.BACKEND_URL}${path}`, {
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

async function handleAuthDemo() {
  setAuthStatus("Signing in…", "loading");
  try {
    const data = await apiPost("/auth/demo");
    const session = { token: data.token, user: data.user, method: "demo" };
    await setStoredSession(session);
    renderAuthLoggedIn(session);
    setAuthStatus("", "");
    showDemoNotice();
    refreshJobPreview();
  } catch (err) {
    setAuthStatus(err.message, "error");
  }
}

function showDemoNotice() {
  const banner = document.createElement("div");
  banner.textContent = "You're using a demo account — job and skill check history won't be saved.";
  banner.style.cssText =
    "margin-top: 8px; padding: 10px 12px; border-radius: 10px; font-size: 11px; line-height: 1.5; " +
    "background: rgba(227, 74, 48, 0.08); border: 1px solid var(--border); color: var(--text-muted); text-align: center;";
  els.authStatus.insertAdjacentElement("afterend", banner);
  setTimeout(() => banner.remove(), 5000);
}

// Google OAuth runs in the background service worker so it survives the popup
// closing while the Google sign-in window is open.
async function handleAuthGoogle() {
  setAuthStatus("Signing in…", "loading");

  try {
    const data = await sendRuntimeMessage({ type: "GOOGLE_AUTH" });

    if (!data || !data.success) {
      throw new Error((data && data.error) || "Google sign-in failed.");
    }

    const session = { token: data.token, user: data.user, method: "google" };

    await setStoredSession(session);
    renderAuthLoggedIn(session);
    setAuthStatus("", "");
    refreshJobPreview();
  } catch (err) {
    setAuthStatus(err.message, "error");
  }
}

async function handleAuthLogout() {
  // Revoke the token on the backend, clear the extension cache, and sign the
  // website out too (shared single session).
  try {
    await sendRuntimeMessage({ type: "EXT_LOGOUT" });
  } catch (err) {
    // Even if the background handshake fails, clear the local session below.
  }
  await clearStoredSession();
  renderAuthLoggedOut();
  setAuthStatus("", "");
  refreshJobPreview();
}

function initAuth() {
  els.authGoogleBtn.addEventListener("click", handleAuthGoogle);
  els.authDemoBtn.addEventListener("click", handleAuthDemo);
  els.authLogoutBtn.addEventListener("click", (event) => {
    event.preventDefault();
    handleAuthLogout();
  });

  getStoredSession().then((session) => {
    if (session.token) {
      validateSession().then((refreshed) => {
        if (refreshed.token) {
          renderAuthLoggedIn(refreshed);
        } else {
          renderAuthLoggedOut();
        }
      });
    } else {
      renderAuthLoggedOut();
    }
  });
}

// ============================================================================
// SKILLS MODULE
// ============================================================================

function renderSkillsCount() {
  chrome.storage.local.get(["userSkills"], (items) => {
    const skills = Array.isArray(items.userSkills) ? items.userSkills : [];
    if (els.skillsCount) els.skillsCount.textContent = String(skills.length);
  });
}

function renderSkillsList() {
  chrome.storage.local.get(["userSkills"], (items) => {
    const skills = Array.isArray(items.userSkills) ? items.userSkills : [];
    renderSkillsCount();

    els.skillsListBody.innerHTML = "";
    if (!skills.length) {
      els.skillsListBody.innerHTML =
        '<div class="skills-list-empty">No skills yet. Add a few above or upload your resume.</div>';
      return;
    }

    skills.forEach((skill, index) => {
      const chip = document.createElement("div");
      chip.className = "skill-chip";

      const label = document.createElement("span");
      label.className = "skill-chip-label";
      label.textContent = skill;

      const removeBtn = document.createElement("button");
      removeBtn.className = "skill-chip-remove";
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", `Remove ${skill}`);
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        const next = skills.slice();
        next.splice(index, 1);
        chrome.storage.local.set({ userSkills: next }, () => {
          renderSkillsList();
        });
      });

      chip.appendChild(label);
      chip.appendChild(removeBtn);
      els.skillsListBody.appendChild(chip);
    });
  });
}

function parseSkillList(value) {
  const seen = new Set();
  const result = [];
  String(value || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .forEach((skill) => {
      const key = skill.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(skill);
      }
    });
  return result;
}

function saveSkills() {
  const typed = parseSkillList(els.manualSkillsInput.value || "");
  if (!typed.length) {
    setStatus("Enter at least one skill, e.g. React, Node.js", "error");
    return;
  }

  chrome.storage.local.get(["userSkills"], (items) => {
    const existing = Array.isArray(items.userSkills) ? items.userSkills : [];
    const seen = new Set(existing.map((skill) => skill.toLowerCase()));
    const merged = existing.slice();
    typed.forEach((skill) => {
      if (!seen.has(skill.toLowerCase())) {
        seen.add(skill.toLowerCase());
        merged.push(skill);
      }
    });

    chrome.storage.local.set({ userSkills: merged }, () => {
      els.manualSkillsInput.value = "";
      setStatus(`✓ Saved ${merged.length} skill${merged.length === 1 ? "" : "s"}.`, "success");
      renderSkillsList();
    });
  });
}

// ============================================================================
// RESUME UPLOAD (from the Update Skills view)
// ============================================================================

function setUploadStatus(message, type) {
  els.uploadStatus.textContent = message || "";
  els.uploadStatus.className = "upload-status" + (type ? " " + type : "");
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

async function handleUploadResume() {
  const file = els.resumeFile.files && els.resumeFile.files[0];
  if (!file) {
    setUploadStatus("Choose a PDF/DOC/DOCX file first.", "error");
    return;
  }

  // Prevent a second upload while one is already in flight (e.g. a stray
  // change event or a double-click on the pick confirm button).
  if (els.uploadResumeBtn.disabled) {
    return;
  }

  const session = await validateSession();
  if (!session.token) {
    setUploadStatus("Sign in to upload a resume.", "error");
    return;
  }

  // Keep the panel responsive and indicate work is happening.
  els.uploadResumeBtn.disabled = true;
  els.uploadResumeBtn.textContent = "Uploading…";
  setUploadStatus("Uploading and extracting skills…", "loading");

  try {
    const fileData = await readFileAsBase64(file);

    const response = await fetch(`${CONFIG.BACKEND_URL}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify({ fileData, fileName: file.name })
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || "Resume upload failed.");
    }

    const uploadedSkills = Array.isArray(data.skills) ? data.skills : [];
    if (!uploadedSkills.length) {
      setUploadStatus("No skills were extracted from this resume.", "error");
      return;
    }

    const existing = await new Promise((resolve) => {
      chrome.storage.local.get(["userSkills"], (items) =>
        resolve(Array.isArray(items.userSkills) ? items.userSkills : [])
      );
    });

    const seen = new Set(existing.map((skill) => skill.toLowerCase()));
    const merged = existing.slice();
    uploadedSkills.forEach((skill) => {
      const key = String(skill).toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(skill);
      }
    });

    await new Promise((resolve) =>
      chrome.storage.local.set(
        {
          userSkills: merged,
          resumeProfileId: data.resumeProfileId || data.profileId || ""
        },
        resolve
      )
    );

    renderSkillsList();
    renderSkillsCount();
    setUploadStatus(
      `✓ Extracted ${merged.length} skill${merged.length === 1 ? "" : "s"} from your resume.`,
      "success"
    );
  } catch (err) {
    setUploadStatus(err.message, "error");
  } finally {
    els.uploadResumeBtn.disabled = false;
    els.uploadResumeBtn.textContent = "Upload Resume";
  }
}

// ============================================================================
// JOB DETECTION + ANALYSIS
// ============================================================================

function setJobStatus(message, detected) {
  els.jobStatus.textContent = message;
  els.jobStatus.className = "job-card-status" + (detected ? " job-detected" : "");
}

async function refreshJobPreview() {
  setJobStatus("Checking current tab…");
  els.jobDetail.hidden = true;

  try {
    const res = await sendRuntimeMessage({ type: "GET_JOB_PREVIEW" });

    if (res && res.success && res.isJobPage) {
      els.jobDetail.hidden = false;
      const label = [res.jobTitle, res.company].filter(Boolean).join(" — ");
      els.jobDetail.textContent = label || "Job details detected on this page";
      setJobStatus("LinkedIn job detected", true);
    } else if (res && res.error) {
      setJobStatus(res.error, false);
    } else {
      setJobStatus("Open a LinkedIn job page to analyze.", false);
    }
  } catch (err) {
    setJobStatus("Open a LinkedIn job page to analyze.", false);
  }
}

function hideResult() {
  els.resultCard.hidden = true;
  lastDashboardUrl = "";
}

function normalizeSkillList(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => (typeof item === "string" ? item : item && item.skill))
    .filter(Boolean);
}

function renderTags(container, items, emptyText) {
  container.innerHTML = "";
  if (!items.length) {
    const tag = document.createElement("span");
    tag.className = "result-tag muted";
    tag.textContent = emptyText;
    container.appendChild(tag);
    return;
  }
  items.slice(0, 12).forEach((item) => {
    const tag = document.createElement("span");
    tag.className = "result-tag";
    tag.textContent = item;
    container.appendChild(tag);
  });
}

function renderResult(res) {
  const analysis = res.analysis || {};
  const score = Number(analysis.matchScore ?? analysis.compatibility_score ?? 0);

  els.resultScore.textContent = `${score}%`;
  els.resultScore.style.color = score >= 65 ? "#3b7a60" : score >= 35 ? "#c58b2d" : "#b24442";
  els.resultRecommendation.textContent = analysis.recommendation || "Analysis ready";
  els.resultJob.textContent = [analysis.jobTitle, analysis.company].filter(Boolean).join(" · ");

  renderTags(els.resultMatched, normalizeSkillList(analysis.matchedSkills || analysis.matched_skills), "No direct matches yet");
  renderTags(els.resultMissing, normalizeSkillList(analysis.missingSkills || analysis.missing_skills), "Strong overall fit");

  lastDashboardUrl = res.dashboardUrl || `${CONFIG.FRONTEND_URL}/dashboard?tab=history`;
  els.resultCard.hidden = false;
}

async function handleAnalyze() {
  const session = await validateSession();

  if (!session.token) {
    setStatus(
      sessionExpired ? "Session expired. Please login again." : "Sign in to analyze jobs.",
      "error"
    );
    return;
  }

  const items = await new Promise((resolve) => {
    chrome.storage.local.get(["userSkills"], (items) => resolve(items));
  });
  const skills = Array.isArray(items.userSkills) ? items.userSkills : [];

  if (!skills.length) {
    setStatus("Add skills first, then analyze.", "error");
    return;
  }

  hideResult();
  setStatus("Analyzing job…", "loading");

  try {
    const res = await sendRuntimeMessage({ type: "ANALYZE_CURRENT_JOB" });

    if (!res || !res.success) {
      throw new Error((res && res.error) || "Analysis failed.");
    }

    renderResult(res);
    setStatus("", "");
  } catch (err) {
    setStatus(err.message, "error");
  }
}

// ============================================================================
// SYNC
// ============================================================================

async function handleSync() {
  setStatus("Syncing…", "loading");

  try {
    const session = await validateSession();

    if (!session.token) {
      setStatus(
        sessionExpired ? "Session expired. Please login again." : "Sign in to sync your skills.",
        "error"
      );
      return;
    }

    renderAuthLoggedIn(session);

    const user = session.user || {};
    const extracted = (Array.isArray(user.resumeProfiles) ? user.resumeProfiles : [])
      .flatMap((profile) => (Array.isArray(profile.extractedSkills) ? profile.extractedSkills : []));

    if (extracted.length) {
      const existing = await new Promise((resolve) => {
        chrome.storage.local.get(["userSkills"], (items) =>
          resolve(Array.isArray(items.userSkills) ? items.userSkills : [])
        );
      });
      const seen = new Set(existing.map((skill) => skill.toLowerCase()));
      const merged = existing.slice();
      extracted.forEach((skill) => {
        const key = String(skill).toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          merged.push(skill);
        }
      });
      await new Promise((resolve) => chrome.storage.local.set({ userSkills: merged }, resolve));
      renderSkillsList();
    }

    await refreshJobPreview();
    setStatus("✓ Synced.", "success");
  } catch (err) {
    setStatus(err.message, "error");
  }
}

// ============================================================================
// OPEN DASHBOARD (with token hand-off to the website)
// ============================================================================

function openDashboard(url) {
  if (!url) return;

  getStoredSession().then((session) => {
    let targetUrl = url;
    if (session.token) {
      const parsed = new URL(targetUrl);
      parsed.searchParams.set("token", session.token);
      targetUrl = parsed.toString();
    }

    chrome.tabs.create({ url: targetUrl, active: true });
  });
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    CONFIG = await getConfig();

    els = {
      authButtons: document.getElementById("authButtons"),
      authSession: document.getElementById("authSession"),
      authSessionAvatar: document.getElementById("authSessionAvatar"),
      authSessionName: document.getElementById("authSessionName"),
      authSessionEmail: document.getElementById("authSessionEmail"),
      authStatus: document.getElementById("authStatus"),
      authGoogleBtn: document.getElementById("authGoogleBtn"),
      authDemoBtn: document.getElementById("authDemoBtn"),
      authLogoutBtn: document.getElementById("authLogoutBtn"),
      jobStatus: document.getElementById("jobStatus"),
      jobDetail: document.getElementById("jobDetail"),
      analyzeJobBtn: document.getElementById("analyzeJobBtn"),
      syncBtn: document.getElementById("syncBtn"),
      skillsCount: document.getElementById("skillsCount"),
      manualSkillsInput: document.getElementById("manualSkills"),
      saveSkillsBtn: document.getElementById("saveSkillsBtn"),
      skillsListBody: document.getElementById("skillsListBody"),
      resumeFile: document.getElementById("resumeFile"),
      uploadResumeBtn: document.getElementById("uploadResumeBtn"),
      uploadStatus: document.getElementById("uploadStatus"),
      resultCard: document.getElementById("resultCard"),
      resultScore: document.getElementById("resultScore"),
      resultRecommendation: document.getElementById("resultRecommendation"),
      resultJob: document.getElementById("resultJob"),
      resultMatched: document.getElementById("resultMatched"),
      resultMissing: document.getElementById("resultMissing"),
      openResultDashboardBtn: document.getElementById("openResultDashboardBtn"),
      status: document.getElementById("app-status")
    };

    initAuth();
    renderSkillsCount();

    document.getElementById("openDashboardBtn").addEventListener("click", (event) => {
      event.preventDefault();
      openDashboard(`${CONFIG.FRONTEND_URL}/dashboard`);
    });

    document.getElementById("dismissBtn").addEventListener("click", () => {
      window.close();
    });

    document.getElementById("updateSkillsBtn").addEventListener("click", () => showView("skills"));
    document.getElementById("mySkillsRow").addEventListener("click", () => showView("skills"));
    document.getElementById("backBtn").addEventListener("click", () => showView("home"));
    document.getElementById("saveSkillsDoneBtn").addEventListener("click", () => showView("home"));

    els.analyzeJobBtn.addEventListener("click", handleAnalyze);
    els.syncBtn.addEventListener("click", handleSync);
    els.saveSkillsBtn.addEventListener("click", saveSkills);
    els.manualSkillsInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveSkills();
      }
    });
    els.uploadResumeBtn.addEventListener("click", () => els.resumeFile.click());
    els.resumeFile.addEventListener("change", handleUploadResume);
    els.openResultDashboardBtn.addEventListener("click", () => {
      openDashboard(lastDashboardUrl);
    });

    const versionBadge = document.getElementById("versionBadge");
    if (versionBadge && chrome.runtime.getManifest) {
      versionBadge.textContent = `v${chrome.runtime.getManifest().version}`;
    }

    refreshJobPreview();
  } catch (error) {
    console.error("CareerVector popup error:", error);
  }
});
