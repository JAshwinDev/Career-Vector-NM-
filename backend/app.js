require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

// Chrome extension CORS allowlist: comma-separated extension IDs (see
// .env.example). Empty = accept any chrome-extension:// origin (legacy dev
// behavior, unchanged until the operator configures it).
const allowedExtensionIds = (process.env.ALLOWED_EXTENSION_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

// Security headers for API responses. CSP is off (JSON only, no HTML is
// served) and CORP is cross-origin so the frontend and Chrome extension
// can still read responses cross-origin.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Basic abuse protection: 300 requests / 15 min / IP (tunable via
// RATE_LIMIT_MAX). Skipped under NODE_ENV=test so the test suite never
// trips its own limiter.
if (process.env.NODE_ENV !== "test") {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_MAX) || 300,
    standardHeaders: true,
    legacyHeaders: false
  }));
}

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (curl, ML service, server-to-server calls).
    if (!origin) return callback(null, true);

    // Allow the known web frontend origins.
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow the Chrome extension. Origin is chrome-extension://<id>.
    // When ALLOWED_EXTENSION_IDS is configured, only those IDs pass;
    // otherwise any extension is accepted (previous behavior).
    if (origin.startsWith("chrome-extension://")) {
      const extId = origin.slice("chrome-extension://".length);
      if (allowedExtensionIds.length === 0 || allowedExtensionIds.includes(extId)) {
        return callback(null, true);
      }
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
}));
app.use(express.json({ limit: "10mb" }));

mongoose.set("bufferCommands", false);

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 })
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.warn("MongoDB unavailable, using local JSON store:", err.message));
} else {
  console.warn("MONGO_URI not set, using local JSON store.");
}

app.use("/auth", require("./routes/auth/auth"));
app.use("/match", require("./routes/jobs/match"));
app.use("/upload", require("./routes/resume/upload"));
app.use("/analyze", require("./routes/resume/analyze"));
app.use("/history", require("./routes/analytics/history"));
app.use("/roles", require("./routes/jobs/roles"));
app.use("/jobs", require("./routes/jobs/jobs"));
app.use("/quiz", require("./routes/learning/quiz"));
app.use("/interactions", require("./routes/analytics/interactions"));
app.use("/workflow", require("./routes/learning/workflow"));

app.get("/", (_req, res) => res.send("AI Job Assistant Backend Running"));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    backend: "up",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "local-fallback",
    ml: "unknown"
  });
});

// Error handler: return a clean 403 for CORS rejections, 500 otherwise.
app.use((err, _req, res, _next) => {
  if (err && String(err.message).includes("not allowed by CORS")) {
    return res.status(403).json({ error: err.message });
  }
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error." });
});

module.exports = app;
