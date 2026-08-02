// CareerVector extension shared configuration.
//
// Loaded as a classic script in popup.html and content scripts, and via
// importScripts("config.js") in the MV3 background service worker.
// Overrides are persisted in chrome.storage.sync so the API base URL is
// configurable instead of hardcoded to localhost.

var DEFAULT_CONFIG = {
  BACKEND_URL: "http://localhost:5000",
  FRONTEND_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: ""
};

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getConfig() {
  return new Promise(function (resolve) {
    chrome.storage.sync.get(DEFAULT_CONFIG, function (items) {
      resolve({
        BACKEND_URL: stripTrailingSlash(items.BACKEND_URL || DEFAULT_CONFIG.BACKEND_URL),
        FRONTEND_URL: stripTrailingSlash(items.FRONTEND_URL || DEFAULT_CONFIG.FRONTEND_URL),
        GOOGLE_CLIENT_ID: items.GOOGLE_CLIENT_ID || DEFAULT_CONFIG.GOOGLE_CLIENT_ID
      });
    });
  });
}

function saveConfig(patch) {
  return new Promise(function (resolve) {
    chrome.storage.sync.set(patch, function () {
      resolve();
    });
  });
}
