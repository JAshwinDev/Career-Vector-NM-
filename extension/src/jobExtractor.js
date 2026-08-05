// CareerVector LinkedIn job extractor.
//
// Loaded as a classic script (before content.js) so `content.js` can use the
// global `JobExtractor`. Handles LinkedIn's SPA job pages (job details, job
// collections, job search) where the detail panel loads asynchronously. Uses
// multiple fallback strategies instead of trusting one generated class name.
var JobExtractor = (function () {
  "use strict";

  var MIN_DESCRIPTION_LENGTH = 120;
  var PREVIEW_WAIT_MS = 4000;
  var DETAIL_WAIT_MS = 15000;
  var POLL_INTERVAL_MS = 400;

  var DESCRIPTION_KEYWORDS = [
    "about the job",
    "responsibilit",
    "requirement",
    "qualification",
    "experience",
    "skills",
    "what you'll",
    "what you will",
    "you will",
    "job description",
    "about the role",
    "who you are"
  ];

  var SKILL_KEYWORDS = [
    "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "PHP", "Ruby", "Go",
    "Swift", "Kotlin", "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express",
    "Django", "Flask", "Spring", "HTML", "CSS", "Tailwind CSS", "SASS", "SQL", "MySQL",
    "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Docker", "Kubernetes", "AWS",
    "Azure", "GCP", "Terraform", "Jenkins", "GitHub Actions", "CI/CD", "Git", "Linux",
    "REST API", "GraphQL", "Microservices", "Machine Learning", "Data Science",
    "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn", "Excel", "Power BI",
    "Tableau", "Agile", "Scrum", "Testing", "Unit Testing", "OAuth", "JWT"
  ];

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  // Visible text that keeps line structure (for descriptions / requirement lists).
  function descriptionText(el) {
    if (!el) return "";
    var text = el.innerText || el.textContent || "";
    return String(text)
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function cleanText(el) {
    return el ? normalizeWhitespace(el.innerText || el.textContent || "") : "";
  }

  function isLinkedInHost() {
    return window.location.hostname.indexOf("linkedin.com") !== -1;
  }

  // Extract the job id from either /jobs/view/{id} or ?currentJobId={id}.
  function getCurrentJobId() {
    var href = window.location.href;
    var match = href.match(/[?&]currentJobId=(\d+)/);
    if (match) return match[1];
    match = href.match(/\/jobs\/view\/(\d+)/);
    if (match) return match[1];
    return "";
  }

  // Detect every LinkedIn job surface: /jobs/*, job search, job collections.
  function isJobPage() {
    if (!isLinkedInHost()) return false;
    var path = window.location.pathname;
    if (path.indexOf("/jobs/") !== -1) return true;
    if (document.querySelector(".jobs-search-two-pane__wrapper")) return true;
    if (document.querySelector(".job-view-layout")) return true;
    if (document.querySelector("[class*='job-details']")) return true;
    return false;
  }

  // The right-hand detail pane (dynamically loaded on collection / search pages).
  function getDetailsContainer() {
    var selectors = [
      ".jobs-search__job-details--container",
      ".jobs-search__job-details",
      ".job-view-layout",
      "#job-details",
      "[class*='job-details-container']",
      "[class*='job-view-container']",
      "[class*='job-view']",
      "[class*='job-details']"
    ];
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = document.querySelector(selectors[i]);
        if (el) return el;
      } catch (err) {
        // Invalid selector; skip.
      }
    }
    return document.querySelector(".jobs-search-two-pane__wrapper") || document.body;
  }

  function textFromSelectors(selectors, minLength) {
    for (var i = 0; i < selectors.length; i++) {
      try {
        var text = cleanText(document.querySelector(selectors[i]));
        if (text.length >= (minLength || 1)) return text;
      } catch (err) {
        // Invalid selector; skip.
      }
    }
    return "";
  }

  function pickTitleLikeHeading(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      var text = cleanText(nodes[i]);
      if (!text || text.length >= 140) continue;
      if (/\b(LinkedIn|Jobs|Home|Search|Notifications|Messaging|Connections|Premium)\b/i.test(text)) continue;
      return text;
    }
    return "";
  }

  // ---- JOB TITLE (multiple fallbacks) ----
  function extractTitle() {
    // 1. Semantic job-title selectors (current + legacy LinkedIn classes).
    var title = textFromSelectors([
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title",
      ".jobs-details__main-content h1",
      ".job-details__main-content h1",
      ".jobs-job-card-list__title",
      ".job-title",
      "[class*='job-title']",
      "[class*='jobTitle']"
    ]);
    if (title) return title;

    // 2. Main h1 elements (prefer the most title-like heading).
    var heading = pickTitleLikeHeading(document.querySelectorAll("h1"));
    if (heading) return heading;

    // 3. Current job detail card text: strong / heading inside the detail pane.
    var details = getDetailsContainer();
    var strong = details.querySelector("strong");
    var strongText = strong ? cleanText(strong) : "";
    if (strongText && strongText.length < 140) return strongText;

    var headingEl = details.querySelector("h1, h2, [class*='title']");
    var headingText = headingEl ? cleanText(headingEl) : "";
    if (headingText && headingText.length < 140) return headingText;

    return "";
  }

  // ---- COMPANY (multiple fallbacks) ----
  function extractCompany() {
    // 1. Semantic company selectors.
    var company = textFromSelectors([
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name",
      ".jobs-company__name",
      "[class*='company-name']",
      "[class*='companyName']"
    ]);
    if (company) return company;

    // 2. Anchor linking to the company page.
    var details = getDetailsContainer();
    var companyLink = details.querySelector("a[href*='/company/']") || document.querySelector("a[href*='/company/']");
    var linkText = companyLink ? cleanText(companyLink) : "";
    if (linkText) return linkText;

    // 3. First meaningful anchor near the title in the detail pane.
    var anchors = details.querySelectorAll("a");
    for (var i = 0; i < anchors.length; i++) {
      var href = anchors[i].getAttribute("href") || "";
      var text = cleanText(anchors[i]);
      if (/\/company\//.test(href) && text) return text;
      if (text && text.length > 1 && text.length < 100 && !/^(more|see more|view|save|share|report)\b/i.test(text)) {
        return text;
      }
    }

    return "";
  }

  // ---- LOCATION ----
  function extractLocation() {
    return textFromSelectors([
      ".job-details-jobs-unified-top-card__location",
      ".jobs-unified-top-card__location",
      ".jobs-details__main-content [class*='location']",
      "[class*='location']"
    ]);
  }

  // ---- DESCRIPTION (keyword-driven, multiple containers) ----
  function countKeywordMatches(text) {
    var lower = String(text || "").toLowerCase();
    return DESCRIPTION_KEYWORDS.reduce(function (count, keyword) {
      return count + (lower.indexOf(keyword) !== -1 ? 1 : 0);
    }, 0);
  }

  function extractDescription() {
    var details = getDetailsContainer();
    if (!details) return "";

    // 1. Known description containers, scored by keyword coverage + length.
    var containers = details.querySelectorAll(
      ".jobs-description--reformatted, " +
      ".jobs-description, " +
      ".jobs-box__html-content, " +
      ".jobs-description-content__text, " +
      ".jobs-description-content, " +
      ".jobs-description__container, " +
      ".show-more-less-html__markup, " +
      "article, " +
      "section"
    );

    var best = { text: "", score: 0 };
    for (var i = 0; i < containers.length; i++) {
      var text = descriptionText(containers[i]);
      if (text.length < MIN_DESCRIPTION_LENGTH) continue;
      var score = countKeywordMatches(text) + Math.min(text.length / 500, 1);
      if (score > best.score) {
        best = { text: text, score: score };
      }
    }
    if (best.text) return best.text;

    // 2. Keyword-driven scan of every visible text block in the detail pane.
    var candidates = details.querySelectorAll("div, p, section, article");
    var bestBlock = { text: "", score: 0 };
    for (var j = 0; j < candidates.length; j++) {
      var candidateText = descriptionText(candidates[j]);
      if (candidateText.length < MIN_DESCRIPTION_LENGTH) continue;
      if (countKeywordMatches(candidateText) < 2) continue;
      if (candidateText.length > bestBlock.text.length) {
        bestBlock = { text: candidateText, score: countKeywordMatches(candidateText) };
      }
    }

    return bestBlock.text;
  }

  // ---- REQUIREMENTS / SKILLS ----
  function extractRequirementLines(text) {
    var lines = String(text || "")
      .split(/\r?\n/)
      .map(function (line) {
        return normalizeWhitespace(line);
      })
      .filter(Boolean);

    var results = [];
    for (var i = 0; i < lines.length; i++) {
      var lower = lines[i].toLowerCase();
      var looksLikeRequirement =
        /^[\-*\u2022]/.test(lines[i]) ||
        /^\d+\./.test(lines[i]) ||
        lower.indexOf("requirement") !== -1 ||
        lower.indexOf("qualification") !== -1 ||
        lower.indexOf("must have") !== -1 ||
        lower.indexOf("nice to have") !== -1 ||
        /\b\d+\+?\s+years?\b/.test(lower);

      if (looksLikeRequirement) {
        results.push(lines[i]);
      }
      if (results.length >= 10) break;
    }
    return results;
  }

  function extractSkillsFromText(text) {
    var normalized = String(text || "").toLowerCase();
    var found = [];
    for (var i = 0; i < SKILL_KEYWORDS.length; i++) {
      if (normalized.indexOf(SKILL_KEYWORDS[i].toLowerCase()) !== -1) {
        found.push(SKILL_KEYWORDS[i]);
      }
    }
    return found;
  }

  // ---- LOADING STATE ----
  function hasJobDetails() {
    if (extractTitle()) return true;

    var details = getDetailsContainer();
    if (!details) return false;

    var desc = details.querySelector(
      ".jobs-description, " +
      ".jobs-box__html-content, " +
      ".show-more-less-html__markup, " +
      "article, " +
      "[class*='jobs-description']"
    );
    return Boolean(desc && cleanText(desc).length >= MIN_DESCRIPTION_LENGTH);
  }

  // Wait for the dynamic detail panel using a MutationObserver plus polling.
  function waitForCondition(condition, timeoutMs) {
    return new Promise(function (resolve) {
      if (condition()) {
        resolve(true);
        return;
      }

      var observer = null;
      var timer = null;
      var poll = null;

      function cleanup() {
        clearTimeout(timer);
        clearInterval(poll);
        if (observer) observer.disconnect();
      }

      function done(result) {
        cleanup();
        resolve(result);
      }

      timer = setTimeout(function () {
        done(false);
      }, timeoutMs || DETAIL_WAIT_MS);

      poll = setInterval(function () {
        if (condition()) done(true);
      }, POLL_INTERVAL_MS);

      try {
        observer = new MutationObserver(function () {
          if (condition()) done(true);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      } catch (err) {
        // MutationObserver unavailable; polling still covers the wait.
      }
    });
  }

  function waitForJobDetails(timeoutMs) {
    return waitForCondition(hasJobDetails, timeoutMs);
  }

  // ---- DEBUG (Task 5) ----
  function debugState() {
    var h1s = [];
    var headings = document.querySelectorAll("h1");
    for (var i = 0; i < headings.length; i++) {
      h1s.push(cleanText(headings[i]).slice(0, 80));
    }

    var sections = [];
    var secs = document.querySelectorAll("section");
    for (var j = 0; j < secs.length && j < 12; j++) {
      var text = cleanText(secs[j]);
      if (text.length > 20) sections.push(text.slice(0, 60));
    }

    return {
      url: window.location.href,
      currentJobId: getCurrentJobId(),
      h1s: h1s,
      detailsText: cleanText(getDetailsContainer()).slice(0, 400),
      sections: sections
    };
  }

  // ---- PUBLIC API ----
  // Lightweight, synchronous preview for the popup status card.
  function extractJobPreview() {
    var isJob = isJobPage();
    return {
      isJobPage: isJob,
      jobTitle: isJob ? extractTitle() : "",
      company: isJob ? extractCompany() : "",
      location: isJob ? extractLocation() : "",
      jobId: getCurrentJobId(),
      url: window.location.href
    };
  }

  // Full extraction with a loading wait. Returns the Task-7 data shape.
  async function extractJobDetails(options) {
    console.log("CAREER VECTOR EXTRACTION STARTED");
    console.log("CURRENT URL:", window.location.href);
    console.log("CURRENT JOB ID:", getCurrentJobId());

    var waitMs = (options && options.timeoutMs) || DETAIL_WAIT_MS;
    var ready = await waitForJobDetails(waitMs);

    if (!ready) {
      console.warn("CAREER VECTOR: LinkedIn job details did not finish loading.");
      console.warn("CAREER VECTOR AVAILABLE STATE:", debugState());
    }

    var title = extractTitle();
    var company = extractCompany();
    var location = extractLocation();
    var description = extractDescription();

    console.log("EXTRACTED JOB:", {
      title: title,
      company: company,
      descriptionLength: description.length,
      location: location,
      jobId: getCurrentJobId(),
      url: window.location.href
    });

    if (!title || !company || !description) {
      console.warn("CAREER VECTOR: Partial extraction (missing title, company, or description).");
      console.warn("CAREER VECTOR AVAILABLE STATE:", debugState());
    }

    return {
      title: title || "Unknown Job Title",
      company: company || "Unknown Company",
      description: description,
      location: location,
      jobId: getCurrentJobId(),
      url: window.location.href,
      requirements: {
        skills: extractSkillsFromText(description),
        requirements: extractRequirementLines(description)
      }
    };
  }

  // Detect SPA navigation (URL or currentJobId changes) so extraction re-runs.
  function watch(onChange) {
    var lastJobId = getCurrentJobId();
    var lastUrl = window.location.href;

    var interval = setInterval(function () {
      var newJobId = getCurrentJobId();
      var newUrl = window.location.href;
      if (newUrl !== lastUrl || newJobId !== lastJobId) {
        lastUrl = newUrl;
        lastJobId = newJobId;
        console.log("CAREER VECTOR: LinkedIn job changed (SPA navigation). currentJobId:", newJobId);
        if (typeof onChange === "function") {
          onChange({ jobId: newJobId, url: newUrl });
        }
      }
    }, 1000);

    return function stop() {
      clearInterval(interval);
    };
  }

  return {
    isJobPage: isJobPage,
    getCurrentJobId: getCurrentJobId,
    extractJobPreview: extractJobPreview,
    extractJobDetails: extractJobDetails,
    waitForJobDetails: waitForJobDetails,
    extractTitle: extractTitle,
    extractCompany: extractCompany,
    extractLocation: extractLocation,
    extractDescription: extractDescription,
    watch: watch,
    debugState: debugState
  };
})();
