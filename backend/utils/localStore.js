const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "local-store.json");

const DEFAULT_DATA = {
  users: [],
  resumeProfiles: [],
  histories: [],
  quizzes: []
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  }
}

function readStore() {
  ensureStore();
  try {
    return { ...DEFAULT_DATA, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
  } catch {
    return clone(DEFAULT_DATA);
  }
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ ...DEFAULT_DATA, ...data }, null, 2));
}

function createId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function sortNewest(items) {
  return [...items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function isMongoReady(mongoose) {
  return Boolean(mongoose?.connection?.readyState === 1);
}

function upsertUser({ googleId, email, name, profilePicture }) {
  const data = readStore();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  let user = data.users.find((item) => (
    (googleId && item.googleId === googleId) || item.email === normalizedEmail
  ));

  if (!user) {
    user = {
      _id: createId(),
      googleId: googleId || "",
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0] || "CareerVector Student",
      profilePicture: profilePicture || "",
      currentRole: "",
      targetRole: "",
      skills: [],
      preferences: { darkMode: true },
      resumeProfiles: [],
      jobMatches: [],
      accountStatus: "active",
      createdAt: now(),
      updatedAt: now()
    };
    data.users.push(user);
  } else {
    user.googleId = user.googleId || googleId || "";
    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;
    user.updatedAt = now();
  }

  writeStore(data);
  return clone(user);
}

function getUserById(id) {
  const data = readStore();
  const user = data.users.find((item) => item._id === id || item.id === id);
  if (!user) return null;

  return clone({
    ...user,
    resumeProfiles: data.resumeProfiles.filter((profile) => profile.userId === user._id),
    jobMatches: data.histories.filter((entry) => entry.userId === user._id)
  });
}

function createResumeProfile(input) {
  const data = readStore();
  const profile = {
    _id: createId(),
    source: input.source || "platform",
    sourceType: input.sourceType || "manual",
    fileName: input.fileName || "",
    rawText: input.rawText || "",
    manualSkills: input.manualSkills || [],
    extractedSkills: input.extractedSkills || [],
    selectedRole: input.selectedRole || "",
    userId: input.userId || "",
    createdAt: now()
  };
  data.resumeProfiles.push(profile);
  writeStore(data);
  return clone(profile);
}

function getResumeProfile(id) {
  const data = readStore();
  return clone(data.resumeProfiles.find((item) => item._id === id || item.id === id) || null);
}

function createHistory(input) {
  const data = readStore();
  const entry = {
    _id: createId(),
    ...input,
    createdAt: input.createdAt || now()
  };
  data.histories.push(entry);
  writeStore(data);
  return clone(entry);
}

function listHistory({ limit = 50, entryType, source, userId } = {}) {
  const data = readStore();
  let items = data.histories;
  if (entryType) items = items.filter((item) => item.entryType === entryType);
  if (source) items = items.filter((item) => item.source === source);
  if (userId) items = items.filter((item) => item.userId === userId);
  return clone(sortNewest(items).slice(0, limit));
}

function getHistoryById(id) {
  const data = readStore();
  return clone(data.histories.find((item) => item._id === id || item.id === id) || null);
}

function deleteHistory(id) {
  const data = readStore();
  const before = data.histories.length;
  data.histories = data.histories.filter((item) => item._id !== id && item.id !== id);
  writeStore(data);
  return before !== data.histories.length;
}

module.exports = {
  createHistory,
  createResumeProfile,
  deleteHistory,
  getHistoryById,
  getResumeProfile,
  getUserById,
  isMongoReady,
  listHistory,
  readStore,
  upsertUser
};
