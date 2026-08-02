const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");

const { request, json, tokenFor, authHeaders, startServer, stopServer } = require("./helpers");

// A tiny mock of the Remotive API so /jobs tests run offline.
const MOCK_JOBS = [
  {
    id: 1001,
    title: "Python Developer",
    company_name: "Acme Remote",
    candidate_required_location: "Worldwide",
    job_type: "full_time",
    tags: ["python", "django", "git"],
    description: "Build and maintain Python services.",
    url: "https://remotive.com/remote-jobs/1001-python-developer"
  },
  {
    id: 1002,
    title: "React Frontend Developer",
    company_name: "Beta Remote",
    candidate_required_location: "Worldwide",
    job_type: "full_time",
    tags: ["react", "javascript", "css"],
    description: "Build modern React interfaces.",
    url: "https://remotive.com/remote-jobs/1002-react-frontend"
  }
];

let mockRemotive;
let requestCount = 0;

before(async () => {
  mockRemotive = http.createServer((req, res) => {
    requestCount += 1;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ jobs: MOCK_JOBS }));
  });
  await new Promise((resolve) => mockRemotive.listen(0, "127.0.0.1", resolve));
  process.env.REMOTIVE_API_URL = `http://127.0.0.1:${mockRemotive.address().port}/remote-jobs`;

  await startServer();
});

after(async () => {
  await new Promise((resolve) => mockRemotive.close(resolve));
  await stopServer();
});

test("GET /health reports the backend as up", async () => {
  const { status, body } = await json(await request("/health"));

  assert.equal(status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.backend, "up");
});

test("POST /match falls back to local keyword matching when the ML service is down", async () => {
  const { status, body } = await json(await request("/match", {
    json: { jobDescription: "We need a Python developer who knows Django and Git.", userSkills: ["Python", "Django"] }
  }));

  assert.equal(status, 200);
  assert.equal(typeof body.matchScore, "number");
  assert.ok(body.matchedSkills.includes("Python"));
  assert.ok(body.summary.includes("Fallback"));
});

test("POST /match rejects a missing job description", async () => {
  const { status, body } = await json(await request("/match", { json: { userSkills: ["Python"] } }));

  assert.equal(status, 400);
  assert.ok(body.error.includes("jobDescription"));
});

test("POST /analyze rejects input with no skills", async () => {
  const { status, body } = await json(await request("/analyze", { json: { skills: "" } }));

  assert.equal(status, 400);
  assert.ok(body.error.includes("No skills found"));
});

test("POST /upload rejects a request with no file data", async () => {
  const { status, body } = await json(await request("/upload", { json: {} }));

  assert.equal(status, 400);
  assert.ok(body.error.includes("No file data"));
});

test("GET /roles returns a catalog (fallback when the ML service is down)", async () => {
  const { status, body } = await json(await request("/roles"));

  assert.equal(status, 200);
  assert.ok(typeof body === "object");
  assert.ok(Object.keys(body).length > 0);
});

test("GET /jobs fetches and maps jobs from the Remotive API", async () => {
  const { status, body } = await json(await request("/jobs"));

  assert.equal(status, 200);
  assert.equal(body.total, 2);
  assert.equal(body.jobs.length, 2);
  assert.equal(body.jobs[0].title, "Python Developer");
  assert.equal(body.jobs[0].source, "remotive");
});

test("GET /jobs caches repeated calls to Remotive", async () => {
  const beforeCount = requestCount;

  await request("/jobs?search=caching-test");
  await request("/jobs?search=caching-test");
  await request("/jobs?search=caching-test");

  // Only the first call should hit the mock server; the rest must be served
  // from the in-memory cache.
  assert.equal(requestCount, beforeCount + 1);
});

test("POST /jobs/search/by-match ranks jobs against user skills", async () => {
  const { status, body } = await json(await request("/jobs/search/by-match", {
    json: { userSkills: ["Python", "Django"] }
  }));

  assert.equal(status, 200);
  assert.ok(Array.isArray(body.jobs));
  assert.equal(body.jobs[0].title, "Python Developer");
  assert.ok(body.jobs[0].matchScore > body.jobs[1].matchScore);
});

test("POST /jobs/search/by-match rejects missing userSkills", async () => {
  const { status, body } = await json(await request("/jobs/search/by-match", { json: {} }));

  assert.equal(status, 400);
  assert.ok(body.error.includes("userSkills"));
});

test("POST /history requires authentication", async () => {
  const { status } = await json(await request("/history", { json: { score: 80 } }));

  assert.equal(status, 401);
});

test("POST /history saves a match using the local store when Mongo is absent", async () => {
  const { status, body } = await json(await request("/history", {
    json: {
      score: 82,
      recommendation: "APPLY NOW",
      matched: ["Python"],
      missing: ["Docker"]
    },
    headers: authHeaders(tokenFor())
  }));

  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.ok(body.id);
});

test("GET /history lists entries scoped to the authenticated user", async () => {
  const { status, body } = await json(
    await request("/history", { headers: authHeaders(tokenFor()) })
  );

  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
  assert.equal(body.length, 1);
  assert.equal(body[0].score, 82);
});

test("POST /quiz/generate-from-skills rejects an empty skills array", async () => {
  const { status, body } = await json(
    await request("/quiz/generate-from-skills", { json: { resumeSkills: [] } })
  );

  assert.equal(status, 400);
  assert.ok(body.error.includes("resumeSkills"));
});

test("POST /interactions validates interactionType after auth", async () => {
  const { status, body } = await json(
    await request("/interactions", { json: {}, headers: authHeaders(tokenFor()) })
  );

  assert.equal(status, 400);
  assert.ok(body.error.includes("interactionType"));
});

test("GET /workflow/overview works without Mongo via local-store counts", async () => {
  const { status, body } = await json(await request("/workflow/overview"));

  assert.equal(status, 200);
  assert.equal(body.status, "ok");
  assert.equal(typeof body.counts.users, "number");
  assert.equal(typeof body.counts.analyses, "number");
});
