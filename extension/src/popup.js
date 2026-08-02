console.log("CareerVector Extension popup loaded - v" + (chrome.runtime.getManifest().version || "1.0"));

let CONFIG = DEFAULT_CONFIG;

// Fetch AI-generated quiz questions from backend (Gemini)
async function fetchAiQuizQuestions(skills) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/quiz/generate-from-skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        resumeSkills: skills.slice(0, 5),
        numQuestions: 5
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && Array.isArray(data.questions)) {
      return data.questions;
    } else if (Array.isArray(data.questions)) {
      return data.questions;
    } else {
      throw new Error("Invalid response format");
    }
  } catch (err) {
    console.warn("Failed to fetch AI quiz, using fallback:", err.message);
    return generateFallbackQuizFromSkills(skills);
  }
}

// Fallback quiz generation for when API is unavailable
function generateFallbackQuizFromSkills(skills) {
  const quizQuestions = [
    {
      question: "Which of these skills do you feel most confident with?",
      options: skills.slice(0, 4).length > 0 ? skills.slice(0, 4) : ["JavaScript", "Python", "React", "Node.js"],
      skill: "Self Assessment"
    },
    {
      question: "Which skill would you like to improve the most?",
      options: skills.slice(4, 8).length > 0 ? skills.slice(4, 8) : ["Machine Learning", "DevOps", "System Design", "Data Structures"],
      skill: "Learning Goals"
    },
    {
      question: "How many years of professional experience do you have?",
      options: ["0-1 years", "1-3 years", "3-5 years", "5+ years"],
      skill: "Experience"
    },
    {
      question: "What type of roles interest you most?",
      options: ["Backend Development", "Frontend Development", "Full Stack", "DevOps/Cloud"],
      skill: "Role Interest"
    },
    {
      question: "Are you open to learning new technologies for a job match?",
      options: ["Yes, actively learning", "Yes, but prefer existing skills", "Maybe, depends on role", "No, prefer roles matching skills"],
      skill: "Learning Openness"
    }
  ];

  return quizQuestions;
}

// Show quiz modal
function showQuizModal(skills, onComplete) {
  const quizModal = document.getElementById("quiz-modal");
  const quizForm = document.getElementById("quiz-form");
  const closeBtn = document.getElementById("quiz-close-btn");
  const cancelBtn = document.getElementById("quiz-cancel-btn");

  if (!quizModal || !quizForm) {
    return;
  }

  closeBtn.onclick = () => {
    quizModal.style.display = "none";
  };

  cancelBtn.onclick = () => {
    quizModal.style.display = "none";
  };

  // Show loading state
  quizForm.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="color: var(--text-muted); margin-top: 12px;">Generating skill verification questions...</p>
    </div>
  `;
  quizModal.style.display = "block";

  // Fetch AI questions
  fetchAiQuizQuestions(skills)
    .then((questions) => {
      // Clear previous form
      quizForm.innerHTML = "";

      // Generate form questions
      questions.forEach((q, index) => {
        const questionDiv = document.createElement("div");
        questionDiv.style.marginBottom = "16px";
        questionDiv.innerHTML = `
          <label style="display: block; font-size: 11px; font-weight: 600; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">Q${index + 1}: ${q.question}</label>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${q.options.map((opt, optIdx) => `
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--text);">
                <input type="radio" name="q${index}" value="${opt}" style="cursor: pointer;" />
                <span>${opt}</span>
              </label>
            `).join("")}
          </div>
        `;
        quizForm.appendChild(questionDiv);
      });

      // Attach submit handler
      const submitBtn = document.getElementById("quiz-submit-btn");
      submitBtn.onclick = () => {
        const formData = new FormData(quizForm);
        const answers = Object.fromEntries(formData);

        // Check if all questions answered
        if (Object.keys(answers).length < questions.length) {
          alert("Please answer all questions before submitting");
          return;
        }

        quizModal.style.display = "none";

        // Save quiz completion
        chrome.storage.local.set(
          { quizCompleted: true, quizAnswers: answers, quizTimestamp: Date.now() },
          () => {
            if (onComplete) {
              onComplete();
            }
          }
        );
      };
    })
    .catch((err) => {
      console.error("Quiz loading error:", err);
      quizForm.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--danger);">
          <p>Failed to load quiz questions. Please try again.</p>
        </div>
      `;
    });
}

// ============================================================================
// AUTH MODULE
// ============================================================================

const AUTH_SESSION_KEYS = ["cv_authToken", "cv_authUser", "cv_authMethod"];

const AUTH_ICONS = {
  google:
    '<svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">' +
    '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
    '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
    '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
    '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
    "</svg>",
  demo:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>' +
    '<path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>'
};

let authEls = {};

function setAuthStatus(message, type) {
  authEls.status.textContent = message || "";
  authEls.status.className = "auth-status" + (type ? " " + type : "");
}

function renderAuthLoggedOut() {
  authEls.buttons.hidden = false;
  authEls.session.hidden = true;
}

function renderAuthLoggedIn(session) {
  authEls.buttons.hidden = true;
  authEls.session.hidden = false;

  authEls.sessionIcon.innerHTML = AUTH_ICONS[session.method] || AUTH_ICONS.google;
  const user = session.user || {};
  const displayName = user.name || user.email || "Logged in";
  authEls.sessionName.textContent = displayName;
}

function getStoredSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(AUTH_SESSION_KEYS, (items) => {
      resolve({
        token: items.cv_authToken || "",
        user: items.cv_authUser || null,
        method: items.cv_authMethod || ""
      });
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
  authEls.status.insertAdjacentElement("afterend", banner);
  setTimeout(() => banner.remove(), 5000);
}

function generateAuthNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleAuthGoogle() {
  const clientId = CONFIG.GOOGLE_CLIENT_ID;

  if (!clientId) {
    setAuthStatus("Configure your Google OAuth Client ID in Settings first.", "error");
    return;
  }

  const redirectUri = chrome.identity.getRedirectURL();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "id_token",
    scope: "openid email profile",
    redirect_uri: redirectUri,
    nonce: generateAuthNonce(),
    prompt: "select_account"
  });

  setAuthStatus("Signing in…", "loading");

  let responseUrl;
  try {
    responseUrl = await new Promise((resolve, reject) => {
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
  } catch (err) {
    setAuthStatus(err.message, "error");
    return;
  }

  const idToken = new URLSearchParams(new URL(responseUrl).hash.slice(1)).get("id_token");
  if (!idToken) {
    setAuthStatus("No ID token returned from Google.", "error");
    return;
  }

  try {
    const data = await apiPost("/auth/google", { idToken });
    const session = { token: data.token, user: data.user, method: "google" };
    await setStoredSession(session);
    renderAuthLoggedIn(session);
    setAuthStatus("", "");
  } catch (err) {
    setAuthStatus(err.message, "error");
  }
}

async function handleAuthLogout() {
  await clearStoredSession();
  renderAuthLoggedOut();
  setAuthStatus("", "");
}

function initAuth() {
  authEls = {
    buttons: document.getElementById("authButtons"),
    session: document.getElementById("authSession"),
    sessionIcon: document.getElementById("authSessionIcon"),
    sessionName: document.getElementById("authSessionName"),
    status: document.getElementById("authStatus"),
    googleBtn: document.getElementById("authGoogleBtn"),
    demoBtn: document.getElementById("authDemoBtn"),
    logoutBtn: document.getElementById("authLogoutBtn")
  };

  authEls.googleBtn.addEventListener("click", handleAuthGoogle);
  authEls.demoBtn.addEventListener("click", handleAuthDemo);
  authEls.logoutBtn.addEventListener("click", (event) => {
    event.preventDefault();
    handleAuthLogout();
  });

  getStoredSession().then((session) => {
    if (session.token) {
      renderAuthLoggedIn(session);
    } else {
      renderAuthLoggedOut();
    }
  });
}

// ============================================================================
// MAIN INITIALIZATION - ALL CODE RUNS INSIDE DOMContentLoaded
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    CONFIG = await getConfig();

    initAuth();

    // DOM elements
    const uploadStatus = document.getElementById("upload-status");
    const uploadBtn = document.getElementById("uploadBtn");
    const fileInput = document.getElementById("resumeFile");
    const dropzone = document.getElementById("dropzone");
    const tabs = document.querySelectorAll(".tab");
    const panels = document.querySelectorAll(".panel");
    const analyzeJobBtn = document.getElementById("analyzeJobBtn");
    const analysisStatus = document.getElementById("analysis-status");

    if (!uploadBtn || !fileInput || !dropzone || !uploadStatus) {
      console.error("CareerVector: Required DOM elements not found");
      return;
    }

    // ────────────────────────────────────────────
    // TAB SWITCHING
    // ────────────────────────────────────────────
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const tabName = tab.getAttribute("data-tab");
        
        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));
        
        tab.classList.add("active");
        document.getElementById(`panel-${tabName}`).classList.add("active");
      });
    });

    function setStatus(element, type, message) {
      if (element) {
        element.className = `status ${type}`;
        element.textContent = message;
      }
    }

    function handleFile(file) {
      if (!file) return;
      if (file.type !== "application/pdf") {
        setStatus(uploadStatus, "error", "Please upload a PDF file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setStatus(uploadStatus, "error", "File too large. Max 10MB.");
        return;
      }

      dropzone.classList.add("success");
      const icon = dropzone.querySelector(".dropzone-icon");
      const title = dropzone.querySelector(".dropzone-title");
      const sub = dropzone.querySelector(".dropzone-sub");
      
      if (icon) icon.textContent = "✓";
      if (title) title.textContent = file.name;
      if (sub) sub.textContent = `${(file.size / 1024).toFixed(0)} KB - Click to change`;
      
      uploadBtn.disabled = false;
      uploadBtn._file = file;
    }

    function isRestrictedUrl(url) {
      return !url ||
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("edge://") ||
        url.startsWith("about:");
    }

    function isMissingReceiverError(message) {
      return message.includes("Could not establish connection") ||
        message.includes("Receiving end does not exist");
    }

    function queryActiveTab() {
      return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabList) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!tabList[0]?.id) {
            reject(new Error("No active tab found"));
            return;
          }

          resolve(tabList[0]);
        });
      });
    }

    function sendMessageToTab(tabId, payload) {
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, payload, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || "Message failed"));
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
            files: ["src/config.js", "src/content.js"]
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

    async function requestJobExtraction(tabId) {
      try {
        return await sendMessageToTab(tabId, { type: "ANALYZE_JOB" });
      } catch (error) {
        if (!isMissingReceiverError(error.message || "")) {
          throw error;
        }

        // Content script not injected, inject it and retry
        console.log("Injecting content script...");
        await injectContentScript(tabId);
        
        // Give the script a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return sendMessageToTab(tabId, { type: "ANALYZE_JOB" });
      }
    }

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

    function openDashboard(url) {
      if (!url) return;
      chrome.tabs.create({ url, active: true });
    }

    const dashboardButtons = document.querySelectorAll("#openDashboardBtn");
    dashboardButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openDashboard(`${CONFIG.FRONTEND_URL}/dashboard`);
      });
    });

    const versionBadge = document.getElementById("versionBadge");
    if (versionBadge && chrome.runtime.getManifest) {
      versionBadge.textContent = `v${chrome.runtime.getManifest().version}`;
    }

    // ────────────────────────────────────────────
    // DROPZONE EVENTS
    // ────────────────────────────────────────────
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("drag");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("drag");
      handleFile(event.dataTransfer.files[0]);
    });

    fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));

    // ────────────────────────────────────────────
    // UPLOAD BUTTON
    // ────────────────────────────────────────────
    uploadBtn.addEventListener("click", () => {
      const file = uploadBtn._file;
      if (!file) {
        setStatus(uploadStatus, "error", "Select a PDF first.");
        return;
      }

      setStatus(uploadStatus, "loading", "Uploading resume to MongoDB...");
      uploadBtn.disabled = true;

      const reader = new FileReader();
      reader.onload = () => {
        fetch(`${CONFIG.BACKEND_URL}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: reader.result,
            fileName: file.name,
            additionalSkills: ""
          })
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            uploadBtn.disabled = false;

            if (data.error) {
              setStatus(uploadStatus, "error", data.error);
              return;
            }

            if (!data.skills) {
              setStatus(uploadStatus, "error", "No skills extracted from resume");
              return;
            }

            chrome.storage.local.set(
              {
                userSkills: data.skills || [],
                resumeProfileId: data.profileId || data.resumeProfileId || "",
                resumeUploaded: true,
                uploadTimestamp: Date.now(),
                quizCompleted: false  // Reset quiz on new upload
              },
              () => {
                setStatus(uploadStatus, "success", `✓ Resume saved! Starting quiz...`);
                
                // Show quiz after upload
                showQuizModal(data.skills || [], () => {
                  setTimeout(() => {
                    setStatus(uploadStatus, "success", `✓ Quiz completed! Resume ready for analysis.`);
                    dropzone.classList.remove("success");
                    fileInput.value = "";
                    uploadBtn._file = null;
                  }, 800);
                });
              }
            );
          })
          .catch((err) => {
            uploadBtn.disabled = false;
            console.error("Upload error:", err);
            setStatus(uploadStatus, "error", `Upload failed: ${err.message}`);
          });
      };
      reader.readAsDataURL(file);
    });

    // ────────────────────────────────────────────
    // ANALYZE JOB BUTTON - WITH QUIZ FLOW
    // ────────────────────────────────────────────
    if (analyzeJobBtn) {
      analyzeJobBtn.addEventListener("click", async () => {
        // Check if quiz is completed
        chrome.storage.local.get(["quizCompleted", "userSkills"], async (data) => {
          if (!data.quizCompleted) {
            // Show quiz first
            const skills = data.userSkills || ["JavaScript", "Python", "React", "Node.js"];
            showQuizModal(skills, () => {
              // After quiz, proceed with analysis
              performJobAnalysis();
            });
          } else {
            // Quiz already completed, proceed with analysis
            performJobAnalysis();
          }
        });

        async function performJobAnalysis() {
          setStatus(analysisStatus, "loading", "Extracting job details...");

          try {
            const currentTab = await queryActiveTab();
            const tabUrl = currentTab.url || "";

            if (isRestrictedUrl(tabUrl)) {
              setStatus(analysisStatus, "error", "Click extension icon on a web page");
              return;
            }

            if (!tabUrl.includes("linkedin.com")) {
              setStatus(analysisStatus, "error", "Only works on LinkedIn job pages");
              return;
            }

            const response = await requestJobExtraction(currentTab.id);

            if (!response) {
              setStatus(analysisStatus, "error", "No response from page - please wait for page to load");
              return;
            }

            if (response.error) {
              setStatus(analysisStatus, "error", response.error);
              return;
            }

            if (!response.success || !response.jobData) {
              setStatus(analysisStatus, "error", "Could not extract job details. Make sure you're viewing the job description panel.");
              return;
            }

            setStatus(analysisStatus, "loading", "Analyzing match...");
            const result = await sendRuntimeMessage({ type: "ANALYZE_JOB", jobData: response.jobData });

            if (result && result.success) {
              setStatus(analysisStatus, "success", "Analysis complete! Opening dashboard...");
              openDashboard(result.dashboardUrl || `${CONFIG.FRONTEND_URL}/dashboard?tab=history`);
              setTimeout(() => window.close(), 1200);
              return;
            }

            setStatus(analysisStatus, "error", result?.error || "Analysis failed");
          } catch (error) {
            const errorMsg = error.message || "";
            console.error("Message error:", errorMsg);

            if (isMissingReceiverError(errorMsg)) {
              setStatus(analysisStatus, "error", "Extension not loaded on this page. Refresh LinkedIn job page and try again.");
            } else {
              setStatus(analysisStatus, "error", "Connection error - refresh page and try again");
            }
          }
        }
      });
    }

  } catch (error) {
    console.error("CareerVector popup error:", error);
  }
});
// ============================================================================
// END OF INITIALIZATION - ALL CODE ABOVE IS INSIDE DOMContentLoaded LISTENER
// ============================================================================