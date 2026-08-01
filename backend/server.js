require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

mongoose.set("bufferCommands", false);

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 })
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.warn("MongoDB unavailable, using local JSON store:", err.message));
} else {
  console.warn("MONGO_URI not set, using local JSON store.");
}

app.use("/auth", require("./routes/auth"));
app.use("/match", require("./routes/match"));
app.use("/upload", require("./routes/upload"));
app.use("/analyze", require("./routes/analyze"));
app.use("/history", require("./routes/history"));
app.use("/roles", require("./routes/roles"));
app.use("/jobs", require("./routes/jobs"));
app.use("/quiz", require("./routes/quiz"));
app.use("/interactions", require("./routes/interactions"));
app.use("/workflow", require("./routes/workflow"));

app.get("/", (_req, res) => res.send("AI Job Assistant Backend Running"));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    backend: "up",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "local-fallback",
    ml: "unknown"
  });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
