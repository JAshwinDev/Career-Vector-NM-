console.log("CareerVector Extension popup loaded - v2.3");

// Fetch AI-generated quiz questions from backend (Gemini)
async function fetchAiQuizQuestions(skills) {
  try {
    const response = await fetch("http://localhost:5000/quiz/generate-from-skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  
  // Show loading state
  quizForm.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="color: var(--text-muted); margin-top: 12px;">Generating skill verification questions...</p>
    </div>
  `;
  quizModal.style.display = "block";

  // Fetch AI questions
  fetchAiQuizQuestions(skills).then(questions => {
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

    // Attach event handlers
    attachQuizHandlers(quizForm, questions, quizModal, onComplete);
  }).catch(err => {
    console.error("Quiz loading error:", err);
    quizForm.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--danger);">
        <p>Failed to load quiz questions. Please try again.</p>
      </div>
    `;
  });
}

// Attach event handlers to quiz buttons
function attachQuizHandlers(quizForm, questions, quizModal, onComplete) {
  const closeBtn = document.getElementById("quiz-close-btn");
  const cancelBtn = document.getElementById("quiz-cancel-btn");
  const submitBtn = document.getElementById("quiz-submit-btn");

  closeBtn.onclick = () => {
    quizModal.style.display = "none";
  };

  cancelBtn.onclick = () => {
    quizModal.style.display = "none";
  };

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
}

// ============================================================================
// MAIN INITIALIZATION - ALL CODE RUNS INSIDE DOMContentLoaded
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  try {
    // DOM elements
    const uploadStatus = document.getElementById("upload-status");
    const uploadBtn = document.getElementById("uploadBtn");
    const fileInput = document.getElementById("resumeFile");
    const dropzone = document.getElementById("dropzone");
    const serverDot = document.getElementById("server-dot");
    const serverLabel = document.getElementById("server-label");
    const tabs = document.querySelectorAll(".tab");
    const panels = document.querySelectorAll(".panel");
    const analyzeJobBtn = document.getElementById("analyzeJobBtn");
    const analysisStatus = document.getElementById("analysis-status");

    if (!serverDot || !serverLabel || !uploadBtn || !fileInput || !dropzone || !uploadStatus) {
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
            files: ["content.js"]
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

    const dashboardButtons = document.querySelectorAll("#openDashboardBtn, #footer-dashboard-link");
    dashboardButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        openDashboard("http://localhost:3000/dashboard");
      });
    });

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
        fetch("http://localhost:5000/upload", {
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
    // HEALTH CHECK
    // ────────────────────────────────────────────
    fetch("http://localhost:5000/health", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3000)
    })
      .then((response) => {
        if (response.ok) {
          serverDot.classList.add("connected");
          serverLabel.textContent = "Server connected";
        } else {
          serverLabel.textContent = "Server offline";
        }
      })
      .catch(() => {
        serverLabel.textContent = "Server offline";
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
              openDashboard(result.dashboardUrl || "http://localhost:3000/dashboard?tab=history");
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

    // ────────────────────────────────────────────
    // HEALTH CHECK (SECOND CHECK)
    // ────────────────────────────────────────────
    fetch("http://localhost:5000/health", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3000)
    })
      .then((response) => {
        if (response.ok) {
          if (serverDot) serverDot.classList.add("connected");
          if (serverLabel) serverLabel.textContent = "Server connected";
        } else {
          if (serverLabel) serverLabel.textContent = "Server offline";
        }
      })
      .catch(() => {
        if (serverLabel) serverLabel.textContent = "Server offline";
      });

  } catch (error) {
    console.error("CareerVector popup error:", error);
  }
});
// ============================================================================
// END OF INITIALIZATION - ALL CODE ABOVE IS INSIDE DOMContentLoaded LISTENER
// ============================================================================