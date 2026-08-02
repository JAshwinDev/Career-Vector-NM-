const backendInput = document.getElementById("backend-url");
const frontendInput = document.getElementById("frontend-url");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = kind || "";
}

getConfig().then((config) => {
  backendInput.value = config.BACKEND_URL;
  frontendInput.value = config.FRONTEND_URL;
});

saveBtn.addEventListener("click", async () => {
  const backendUrl = backendInput.value.trim();
  const frontendUrl = frontendInput.value.trim();

  if (!backendUrl) {
    setStatus("Backend URL cannot be empty.", "error");
    return;
  }

  await saveConfig({ BACKEND_URL: backendUrl, FRONTEND_URL: frontendUrl });
  setStatus("Saved. Reopen the popup to use the new server.", "saved");
});

resetBtn.addEventListener("click", async () => {
  backendInput.value = DEFAULT_CONFIG.BACKEND_URL;
  frontendInput.value = DEFAULT_CONFIG.FRONTEND_URL;
  await saveConfig({ BACKEND_URL: DEFAULT_CONFIG.BACKEND_URL, FRONTEND_URL: DEFAULT_CONFIG.FRONTEND_URL });
  setStatus("Restored defaults.", "saved");
});
