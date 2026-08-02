const axios = require("axios");

function baseUrl() {
  return (process.env.REMOTIVE_API_URL || "https://remotive.com/api/remote-jobs").replace(/\/+$/, "");
}

function cacheTtlMs() {
  return Number(process.env.REMOTIVE_CACHE_TTL_MS) || 10 * 60 * 1000;
}

function rateLimitMs() {
  return Number(process.env.REMOTIVE_RATE_LIMIT_MS) || 2000;
}

// In-memory response cache keyed by search term.
const cache = new Map();

// Serialized queue so external calls respect the minimum spacing enforced by
// the rate limiter (Remotive does not publish a strict limit, so be polite).
let queue = Promise.resolve();
let lastRequestAt = 0;

function cacheKey(search) {
  const key = String(search || "").trim().toLowerCase();
  return key ? `search:${key}` : "all";
}

function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > cacheTtlMs()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function writeCache(key, data) {
  cache.set(key, { data, cachedAt: Date.now() });
}

async function throttle() {
  const wait = rateLimitMs() - (Date.now() - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

async function fetchFromRemotive(search) {
  const url = search ? `${baseUrl()}?search=${encodeURIComponent(search)}` : baseUrl();
  const response = await axios.get(url, { timeout: 15000 });
  return response.data;
}

/**
 * Fetch remote jobs from Remotive with rate limiting and response caching.
 * Returns { jobs, total, cached } where jobs is already sliced to `limit`.
 */
async function getRemotiveJobs({ search, limit = 20 } = {}) {
  const key = cacheKey(search);
  const max = Number(limit) || 20;

  const cached = readCache(key);
  if (cached) {
    return {
      jobs: (cached.jobs || []).slice(0, max),
      total: cached.jobs ? cached.jobs.length : 0,
      cached: true
    };
  }

  const result = await queue.then(() => throttle().then(() => fetchFromRemotive(search)));
  queue = queue.catch(() => {});

  writeCache(key, result);

  return {
    jobs: (result.jobs || []).slice(0, max),
    total: result.jobs ? result.jobs.length : 0,
    cached: false
  };
}

function clearCache() {
  cache.clear();
  lastRequestAt = 0;
  queue = Promise.resolve();
}

module.exports = { getRemotiveJobs, clearCache };
