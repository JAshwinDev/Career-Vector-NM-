console.log("CareerVector content script ready");

const OVERLAY_ID = "cv-job-match-overlay";
const OVERLAY_STYLE_ID = "cv-job-match-overlay-style";
const MIN_DESCRIPTION_LENGTH = 120;
const AUTO_ANALYZE_DELAY_MS = 1200;

const TITLE_SELECTORS = [
  ".job-details-jobs-unified-top-card__job-title",
  ".jobs-unified-top-card__job-title",
  ".jobs-details__main-content h1",
  "h1"
];

const COMPANY_SELECTORS = [
  ".job-details-jobs-unified-top-card__company-name",
  ".jobs-unified-top-card__company-name",
  ".jobs-company__name",
  ".job-details-jobs-unified-top-card__primary-description-container a",
  "[class*='company-name']"
];

const DESCRIPTION_SELECTORS = [
  ".jobs-description--reformatted",
  ".jobs-description",
  ".show-more-less-html__markup",
  ".jobs-description__container",
  ".jobs-description-content__text",
  ".jobs-box__html-content",
  ".job-view-layout",
  "[data-job-description]",
  "[class*='jobs-description']"
];

const DESCRIPTION_KEYWORDS = [
  "responsibilit",
  "requirement",
  "qualification",
  "experience",
  "skills",
  "about the job",
  "about the role"
];

const SKILL_KEYWORDS = [
  "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "PHP", "Ruby", "Go",
  "Swift", "Kotlin", "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express",
  "Django", "Flask", "Spring", "HTML", "CSS", "Tailwind CSS", "SASS", "SQL", "MySQL",
  "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Docker", "Kubernetes", "AWS",
  "Azure", "GCP", "Terraform", "Jenkins", "GitHub Actions", "CI/CD", "Git", "Linux",
  "REST API", "GraphQL", "Microservices", "Machine Learning", "Data Science",
  "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn", "Excel", "Power BI",
  "Tableau", "Agile", "Scrum", "Testing", "Unit Testing", "OAuth", "JWT"
];

let lastAnalyzedSignature = "";
let dismissedSignature = "";
let analysisInFlight = false;
let autoAnalyzeTimer = null;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTextFromSelectors(selectors, minLength = 1) {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      const text = normalizeWhitespace(element?.innerText || element?.textContent || "");
      if (text.length >= minLength) {
        return text;
      }
    } catch (error) {
      console.debug("Selector lookup failed:", selector, error);
    }
  }
  return "";
}

function extractJobTitle() {
  return getTextFromSelectors(TITLE_SELECTORS) || "Unknown Job Title";
}

function extractCompanyName() {
  return getTextFromSelectors(COMPANY_SELECTORS) || "Unknown Company";
}

function countKeywordMatches(text) {
  const lower = String(text || "").toLowerCase();
  return DESCRIPTION_KEYWORDS.reduce(
    (count, keyword) => count + (lower.includes(keyword) ? 1 : 0),
    0
  );
}

function extractJobDescriptionFallback() {
  const workspace =
    document.querySelector("#workspace") ||
    document.querySelector("main[id='workspace']") ||
    document.querySelector("main");

  if (!workspace) {
    return "";
  }

  let bestElement = null;
  let bestLength = 0;

  const candidates = workspace.querySelectorAll("div, p, section");
  for (const element of candidates) {
    const text = normalizeWhitespace(element.innerText || "");
    if (text.length < MIN_DESCRIPTION_LENGTH) {
      continue;
    }
    if (countKeywordMatches(text) < 2) {
      continue;
    }
    if (text.length > bestLength) {
      bestLength = text.length;
      bestElement = element;
    }
  }

  return bestElement ? normalizeWhitespace(bestElement.innerText) : "";
}

function extractJobDescription() {
  const selectorText = getTextFromSelectors(DESCRIPTION_SELECTORS, MIN_DESCRIPTION_LENGTH);

  if (selectorText.length >= MIN_DESCRIPTION_LENGTH) {
    console.debug("CareerVector: job description extracted via selectors");
    return selectorText;
  }

  const fallbackText = extractJobDescriptionFallback();

  if (fallbackText.length >= MIN_DESCRIPTION_LENGTH) {
    console.debug("CareerVector: job description extracted via fallback heuristic");
    return fallbackText;
  }

  console.debug("CareerVector: no job description found via selectors or fallback");
  return "";
}

function extractSkillsFromText(text) {
  const normalizedText = String(text || "").toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => normalizedText.includes(skill.toLowerCase()));
}

function extractRequirementLines(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const results = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const looksLikeRequirement =
      /^[\-*\u2022]/.test(line) ||
      /^\d+\./.test(line) ||
      lower.includes("requirement") ||
      lower.includes("qualification") ||
      lower.includes("must have") ||
      lower.includes("nice to have") ||
      /\b\d+\+?\s+years?\b/.test(lower);

    if (looksLikeRequirement) {
      results.push(line);
    }
    if (results.length >= 10) break;
  }
  return results;
}

function getJobContext() {
  return {
    jobTitle: extractJobTitle(),
    company: extractCompanyName(),
    jobUrl: window.location.href
  };
}

function buildJobData() {
  const description = extractJobDescription();
  return {
    description,
    context: getJobContext(),
    requirements: {
      skills: extractSkillsFromText(description),
      requirements: extractRequirementLines(description)
    }
  };
}

function getJobSignature(jobData) {
  return [
    jobData.context.jobUrl,
    jobData.context.jobTitle,
    jobData.description.slice(0, 800)
  ].join("::");
}

function isLinkedInJobPage() {
  return window.location.hostname.includes("linkedin.com") &&
    (window.location.pathname.includes("/jobs/") || document.querySelector(".jobs-search-two-pane__wrapper"));
}

function readStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || "Runtime message failed"));
        return;
      }
      resolve(response);
    });
  });
}

async function waitForJobContent(maxAttempts = 10, delayMs = 400) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const description = extractJobDescription();
    if (description.length >= MIN_DESCRIPTION_LENGTH) {
      return true;
    }
    if (attempt < maxAttempts - 1) {
      await wait(delayMs);
    }
  }
  return false;
}

function getScoreColor(score) {
  if (score >= 65) return "#4d7c5a";
  if (score >= 35) return "#c58b2d";
  return "#b84a3a";
}

function ensureOverlayStyles() {
  if (document.getElementById(OVERLAY_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = OVERLAY_STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2147483647;
      width: 320px;
      font-family: 'Inter', Arial, sans-serif;
      color: #111111;
    }

    #${OVERLAY_ID} .cvjm-card {
      background: #f8f6f2;
      border: 1px solid #d8d2ca;
      border-radius: 16px;
      box-shadow: 0 18px 45px rgba(17, 17, 17, 0.08);
      overflow: hidden;
    }

    #${OVERLAY_ID} .cvjm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: linear-gradient(135deg, #e85b3b, #f07a5d);
      color: #ffffff;
    }

    #${OVERLAY_ID} .cvjm-title {
      font-size: 14px;
      font-weight: 700;
      margin: 0;
    }

    #${OVERLAY_ID} .cvjm-subtitle {
      font-size: 11px;
      opacity: 0.88;
      margin-top: 2px;
    }

    #${OVERLAY_ID} .cvjm-close {
      border: 0;
      background: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }

    #${OVERLAY_ID} .cvjm-body {
      padding: 16px;
    }

    #${OVERLAY_ID} .cvjm-score-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }

    #${OVERLAY_ID} .cvjm-score-ring {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    #${OVERLAY_ID} .cvjm-score-inner {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
    }

    #${OVERLAY_ID} .cvjm-pill {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: #ffffff;
    }

    #${OVERLAY_ID} .cvjm-summary {
      font-size: 12px;
      line-height: 1.5;
      color: #4f4a45;
      margin-bottom: 14px;
    }

    #${OVERLAY_ID} .cvjm-section {
      margin-bottom: 12px;
    }

    #${OVERLAY_ID} .cvjm-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #7b746d;
      margin-bottom: 6px;
    }

    #${OVERLAY_ID} .cvjm-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    #${OVERLAY_ID} .cvjm-tag {
      padding: 5px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }

    #${OVERLAY_ID} .cvjm-tag.matched {
      background: rgba(77, 124, 90, 0.12);
      color: #2d4a36;
    }

    #${OVERLAY_ID} .cvjm-tag.missing {
      background: rgba(184, 74, 58, 0.1);
      color: #6b3528;
    }

    #${OVERLAY_ID} .cvjm-actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;
    }

    #${OVERLAY_ID} .cvjm-button {
      flex: 1;
      border: 0;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    #${OVERLAY_ID} .cvjm-button.primary {
      background: #e85b3b;
      color: #ffffff;
    }

    #${OVERLAY_ID} .cvjm-button.secondary {
      background: #ebe7e1;
      color: #111111;
    }

    #${OVERLAY_ID} .cvjm-button.improve {
      width: 100%;
      margin-top: 8px;
      background: #ffffff;
      color: #e85b3b;
      border: 2px solid #e85b3b;
    }
  `;

  document.documentElement.appendChild(style);
}

function removeOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
}

function renderTags(items, className, emptyText) {
  if (!items.length) {
    return `<span class="cvjm-tag ${className}">${escapeHtml(emptyText)}</span>`;
  }
  return items.map((item) => (
    `<span class="cvjm-tag ${className}">${escapeHtml(item)}</span>`
  )).join("");
}

function showOverlay(result, jobContext) {
  return getConfig().then((config) => {
    const analysis = result.analysis || {};
    const score = Number(analysis.matchScore ?? analysis.compatibility_score ?? 0);
    const scoreColor = getScoreColor(score);
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
    const recommendation = analysis.recommendation || "Analysis ready";
    const summary = analysis.summary || "Your current resume was compared against this job.";
    const dashboardUrl = result.dashboardUrl ||
      (result.analysisId ? `${config.FRONTEND_URL}/dashboard?analysisId=${result.analysisId}` : `${config.FRONTEND_URL}/dashboard?tab=history`);

    ensureOverlayStyles();
    removeOverlay();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="cvjm-card">
        <div class="cvjm-header">
          <div>
            <div class="cvjm-title">${escapeHtml(jobContext.jobTitle || "LinkedIn job match")}</div>
            <div class="cvjm-subtitle">${escapeHtml(jobContext.company || "CareerVector")}</div>
          </div>
          <button type="button" class="cvjm-close" id="cvjm-close" aria-label="Close">x</button>
        </div>
        <div class="cvjm-body">
          <div class="cvjm-score-row">
            <div class="cvjm-score-ring" style="background: conic-gradient(${scoreColor} ${Math.max(0, Math.min(score, 100)) * 3.6}deg, #ebe7e1 0deg);">
              <div class="cvjm-score-inner">${score}%</div>
            </div>
            <div>
              <div class="cvjm-pill" style="background: ${scoreColor};">${escapeHtml(recommendation)}</div>
              <div class="cvjm-subtitle" style="color: #4f4a45; margin-top: 8px;">CareerVector live match</div>
            </div>
          </div>
          <div class="cvjm-summary">${escapeHtml(summary)}</div>
          <div class="cvjm-section">
            <div class="cvjm-section-title">Matched skills</div>
            <div class="cvjm-tags">${renderTags(matchedSkills.slice(0, 8), "matched", "No direct matches yet")}</div>
          </div>
          <div class="cvjm-section">
            <div class="cvjm-section-title">Skills to learn</div>
            <div class="cvjm-tags">${renderTags(missingSkills.slice(0, 8), "missing", "Strong overall fit")}</div>
          </div>
          <div class="cvjm-actions">
            <button type="button" class="cvjm-button primary" id="cvjm-dashboard">View dashboard</button>
            <button type="button" class="cvjm-button secondary" id="cvjm-dismiss">Dismiss</button>
          </div>
          <button type="button" class="cvjm-button improve" id="cvjm-improve">Improve skills</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#cvjm-close")?.addEventListener("click", () => {
      dismissedSignature = lastAnalyzedSignature;
      removeOverlay();
    });

    overlay.querySelector("#cvjm-dismiss")?.addEventListener("click", () => {
      dismissedSignature = lastAnalyzedSignature;
      removeOverlay();
    });

    overlay.querySelector("#cvjm-dashboard")?.addEventListener("click", async () => {
      try {
        await sendRuntimeMessage({
          type: "OPEN_WEB_APP",
          url: dashboardUrl
        });
      } catch (error) {
        console.error("Failed to open dashboard:", error);
        window.open(dashboardUrl, "_blank", "noopener,noreferrer");
      }
    });

    overlay.querySelector("#cvjm-improve")?.addEventListener("click", async () => {
      const analysisId = result.analysisId || "";
      const redirectPath = analysisId ? `/roadmap?analysisId=${analysisId}` : "/roadmap";
      const stored = await readStorage(["cv_authToken"]);
      const url = stored.cv_authToken
        ? `${config.FRONTEND_URL}${redirectPath}`
        : `${config.FRONTEND_URL}/login?redirect=${encodeURIComponent(redirectPath)}`;
      try {
        await sendRuntimeMessage({
          type: "OPEN_WEB_APP",
          url
        });
      } catch (error) {
        console.error("Failed to open roadmap:", error);
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
  });
}

async function extractJobDataForMessage() {
  const hasContent = await waitForJobContent();
  const jobData = buildJobData();

  if (!hasContent || jobData.description.length < MIN_DESCRIPTION_LENGTH) {
    return {
      success: false,
      error: "Could not extract the LinkedIn job description yet. Open a job details panel and wait for it to finish loading."
    };
  }

  return {
    success: true,
    jobData
  };
}

async function analyzeCurrentJob(force = false) {
  if (!isLinkedInJobPage() || analysisInFlight) {
    return;
  }

  const storage = await readStorage(["userSkills", "resumeProfileId"]);
  const userSkills = Array.isArray(storage.userSkills) ? storage.userSkills : [];
  const resumeProfileId = String(storage.resumeProfileId || "");

  if (!userSkills.length && !resumeProfileId) {
    return;
  }

  const extracted = await extractJobDataForMessage();

  if (!extracted.success) {
    console.log("Job data extraction failed:", extracted.error);
    return;
  }

  const signature = getJobSignature(extracted.jobData);

  if (!force && signature === lastAnalyzedSignature) {
    return;
  }

  if (signature === dismissedSignature) {
    return;
  }

  lastAnalyzedSignature = signature;
  analysisInFlight = true;

  try {
    const result = await sendRuntimeMessage({
      type: "ANALYZE_JOB",
      jobData: extracted.jobData
    });

    if (result && result.success && result.analysis) {
      await showOverlay(result, extracted.jobData.context);
    }
  } catch (error) {
    const errorMsg = (error?.message || "").toLowerCase();
    if (errorMsg.includes("extension context invalidated") || errorMsg.includes("receiving end does not exist")) {
      console.debug("Extension context invalidated or service worker not ready - will retry on next page");
      return;
    }
    console.error("Job analysis failed:", error);
  } finally {
    analysisInFlight = false;
  }
}

function scheduleAutoAnalysis(force = false) {
  clearTimeout(autoAnalyzeTimer);
  autoAnalyzeTimer = setTimeout(() => {
    analyzeCurrentJob(force);
  }, AUTO_ANALYZE_DELAY_MS);
}

function observeJobChanges() {
  const observer = new MutationObserver(() => {
    scheduleAutoAnalysis(false);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// ============================================================================
// MESSAGE LISTENERS & EVENT HANDLERS
// ============================================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ANALYZE_JOB" || message.type === "EXTRACT_JOB_DETAILS") {
    extractJobDataForMessage()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Job extraction error:", error);
        sendResponse({
          success: false,
          error: error.message || "Failed to extract LinkedIn job details."
        });
      });

    return true;
  }

  return false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.userSkills || changes.resumeProfileId) {
    scheduleAutoAnalysis(true);
  }
});

// ============================================================================
// INITIALIZE ON PAGE LOAD
// ============================================================================

if (isLinkedInJobPage()) {
  observeJobChanges();
  scheduleAutoAnalysis(false);
}