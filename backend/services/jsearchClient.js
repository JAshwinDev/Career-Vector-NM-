const axios = require("axios");

// Default target region for the recommendation feed. The main audience is
// Indian students, so we bias strongly toward Tamil Nadu / India and make it
// configurable through env so no code change is needed to retarget another
// state or country.
const DEFAULT_COUNTRY = process.env.JSEARCH_COUNTRY || "IN";
const DEFAULT_LOCATION = process.env.JSEARCH_LOCATION || "Tamil Nadu, India";

function apiKey() {
  return process.env.JSEARCH_API_KEY || "";
}

function apiHost() {
  return process.env.JSEARCH_HOST || "jsearch.p.rapidapi.com";
}

function baseUrl() {
  return (process.env.JSEARCH_API_URL || "https://search.p.rapidapi.com/search").replace(/\/+$/, "");
}

function cacheTtlMs() {
  return Number(process.env.JSEARCH_CACHE_TTL_MS) || 15 * 60 * 1000;
}

// In-memory response cache keyed by query + location.
const cache = new Map();

// Serialized queue so external calls respect the RapidAPI free-tier rate
// limit (typically ~5 req/second on the free plan; stay well under it).
let queue = Promise.resolve();
let lastRequestAt = 0;

function cacheKey(query, location) {
  return `${String(query || "").trim().toLowerCase()}|${String(location || "")
    .trim()
    .toLowerCase()}`;
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
  const wait = 1200 - (Date.now() - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

/**
 * Fetch jobs from the JSearch (RapidAPI) endpoint with rate limiting and
 * response caching. Returns { jobs, total, cached }.
 *
 * If no API key is configured this resolves to an empty result so callers
 * can fall back to another source (e.g. Remotive).
 */
async function getJSearchJobs({ query, location, country, limit = 20 } = {}) {
  const key = apiKey();
  if (!key) {
    return { jobs: [], total: 0, configured: false };
  }

  const loc = location || DEFAULT_LOCATION;
  const cnt = country || DEFAULT_COUNTRY;
  const cacheK = cacheKey(query, loc);
  const max = Number(limit) || 20;

  const cached = readCache(cacheK);
  if (cached) {
    return { jobs: (cached.jobs || []).slice(0, max), total: cached.jobs ? cached.jobs.length : 0, cached: true, configured: true };
  }

  const response = await queue.then(() =>
    throttle().then(() =>
      axios.get(baseUrl(), {
        timeout: 15000,
        params: {
          query: query || "developer",
          location: loc,
          country: cnt,
          num_pages: 1
        },
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": apiHost()
        }
      })
    )
  );
  queue = queue.catch(() => {});

  const rawJobs = Array.isArray(response.data?.data) ? response.data.data : [];
  writeCache(cacheK, { jobs: rawJobs });

  return { jobs: rawJobs.slice(0, max), total: rawJobs.length, cached: false, configured: true };
}

function clearCache() {
  cache.clear();
  lastRequestAt = 0;
  queue = Promise.resolve();
}

module.exports = { getJSearchJobs, clearCache, DEFAULT_LOCATION, DEFAULT_COUNTRY };