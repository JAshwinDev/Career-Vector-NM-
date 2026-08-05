const fs = require("fs");
const os = require("os");
const path = require("path");

// Isolate the local JSON store to a temp dir before the app (and its
// modules) is required, so tests never write to backend/data.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "careervector-test-"));
process.env.DATA_DIR = DATA_DIR;

// Speed up tests that touch the Remotive client.
process.env.REMOTIVE_RATE_LIMIT_MS = "0";
process.env.REMOTIVE_CACHE_TTL_MS = "60000";

// Keep tests offline/deterministic: never call the Gemini API, so routes
// always exercise the local fallback path.
process.env.GEMINI_API_KEY = "";

// Isolate from any real Mongo in backend/.env so tests never touch a live
// database (also lets the process exit cleanly after the suite runs).
process.env.MONGO_URI = "";

// Force /match onto the local keyword fallback regardless of whether the
// ML service happens to be running during the test run.
process.env.ML_SERVICE_URL = "http://127.0.0.1:1";

const app = require("../app");
const { signToken } = require("../middleware/auth");

let server = null;
let baseUrl = "";

async function startServer() {
  if (server) return baseUrl;
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

async function stopServer() {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
  server = null;
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}

async function request(pathname, options = {}) {
  const url = await startServer();
  const headers = {
    ...(options.json !== undefined && { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };
  const body = options.json !== undefined ? JSON.stringify(options.json) : options.body;
  return fetch(`${url}${pathname}`, {
    method: options.method || (body ? "POST" : "GET"),
    headers,
    body
  });
}

function tokenFor(payload) {
  return signToken(payload || { userId: "test-user-123", email: "test@example.com" });
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function json(res) {
  return { status: res.status, body: await res.json() };
}

module.exports = { request, json, tokenFor, authHeaders, startServer, stopServer, DATA_DIR };
