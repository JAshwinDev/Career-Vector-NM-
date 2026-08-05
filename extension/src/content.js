console.log("CareerVector content script ready");

// ============================================================================
// This script never renders UI into the page. It only reacts to requests from
// the popup (via background.js) and delegates all LinkedIn detection and
// extraction to JobExtractor (src/jobExtractor.js). It also watches for SPA
// navigation so the cached notion of the "current job" stays fresh.
// ============================================================================

var jobWatchStop = null;

function initJobWatcher() {
  if (jobWatchStop) {
    jobWatchStop();
    jobWatchStop = null;
  }
  jobWatchStop = JobExtractor.watch(function (change) {
    console.log("CAREER VECTOR: job change detected ->", change.jobId || change.url);
  });
}

initJobWatcher();

// Lightweight preview for the popup's job status card. Waits briefly for the
// dynamically loaded detail panel so the popup shows the real title/company
// instead of "Unknown Job Title".
async function handleJobPreview() {
  const isJobPage = JobExtractor.isJobPage();

  if (!isJobPage) {
    return { success: true, isJobPage: false };
  }

  console.log("CAREER VECTOR EXTRACTION STARTED (preview)");
  console.log("CURRENT URL:", window.location.href);

  await JobExtractor.waitForJobDetails(4000);

  const preview = JobExtractor.extractJobPreview();

  return {
    success: true,
    isJobPage: true,
    jobTitle: preview.jobTitle,
    company: preview.company,
    jobUrl: preview.url
  };
}

// Full extraction + analysis payload. Returns the Task-7 data shape wrapped in
// the same `jobData` structure background.js expects.
async function handleJobDetails() {
  if (!JobExtractor.isJobPage()) {
    return {
      success: false,
      error: "Open a LinkedIn job detail page to analyze"
    };
  }

  const data = await JobExtractor.extractJobDetails();

  if (!data.description) {
    console.warn("CAREER VECTOR: description extraction failed after waiting.", JobExtractor.debugState());
    return {
      success: false,
      error: "Open a LinkedIn job detail page to analyze"
    };
  }

  return {
    success: true,
    jobData: {
      description: data.description,
      context: {
        jobTitle: data.title,
        company: data.company,
        jobUrl: data.url
      },
      requirements: data.requirements,
      location: data.location,
      jobId: data.jobId
    }
  };
}

// ============================================================================
// MESSAGE LISTENERS
// ============================================================================
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_JOB_PREVIEW") {
    handleJobPreview()
      .then(sendResponse)
      .catch((error) => {
        console.error("Job preview error:", error);
        sendResponse({ success: false, error: error.message || "Job preview failed." });
      });

    return true;
  }

  if (message.type === "EXTRACT_JOB_DETAILS" || message.type === "ANALYZE_JOB") {
    handleJobDetails()
      .then(sendResponse)
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
