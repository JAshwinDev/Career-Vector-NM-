const backendInput = document.getElementById("backend-url");
const frontendInput = document.getElementById("frontend-url");
const googleClientIdInput = document.getElementById("google-client-id");
const redirectUriEl = document.getElementById("redirect-uri");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = kind || "";
}

if (redirectUriEl && chrome.identity && chrome.identity.getRedirectURL) {
  redirectUriEl.textContent = chrome.identity.getRedirectURL();
}

getConfig().then((config) => {
  backendInput.value = config.BACKEND_URL;
  frontendInput.value = config.FRONTEND_URL;
  googleClientIdInput.value = config.GOOGLE_CLIENT_ID;
});

saveBtn.addEventListener("click", async () => {
  const backendUrl = backendInput.value.trim();
  const frontendUrl = frontendInput.value.trim();
  const googleClientId = googleClientIdInput.value.trim();

  if (!backendUrl) {
    setStatus("Backend URL cannot be empty.", "error");
    return;
  }

  await saveConfig({
    BACKEND_URL: backendUrl,
    FRONTEND_URL: frontendUrl,
    GOOGLE_CLIENT_ID: googleClientId
  });
  setStatus("Saved. Reopen the popup to use the new server.", "saved");
});

resetBtn.addEventListener("click", async () => {
  backendInput.value = DEFAULT_CONFIG.BACKEND_URL;
  frontendInput.value = DEFAULT_CONFIG.FRONTEND_URL;
  googleClientIdInput.value = DEFAULT_CONFIG.GOOGLE_CLIENT_ID;
  await saveConfig({
    BACKEND_URL: DEFAULT_CONFIG.BACKEND_URL,
    FRONTEND_URL: DEFAULT_CONFIG.FRONTEND_URL,
    GOOGLE_CLIENT_ID: DEFAULT_CONFIG.GOOGLE_CLIENT_ID
  });
  setStatus("Restored defaults.", "saved");
});
