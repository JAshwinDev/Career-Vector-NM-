const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { request, json, tokenFor, authHeaders, startServer, stopServer } = require("./helpers");
const { signToken, requireAuth } = require("../middleware/auth");

function mockRes() {
  const res = { statusCode: 0, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

before(startServer);
after(stopServer);

test("requireAuth rejects requests without an Authorization header", () => {
  const req = { headers: {} };
  const res = mockRes();
  let called = false;

  requireAuth(req, res, () => {
    called = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Authentication required.");
  assert.equal(called, false);
});

test("requireAuth rejects non-Bearer schemes", () => {
  const req = { headers: { authorization: "Basic dXNlcjpwYXNz" } };
  const res = mockRes();

  requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Authentication required.");
});

test("requireAuth rejects an invalid/expired token", () => {
  const req = { headers: { authorization: "Bearer not-a-real-token" } };
  const res = mockRes();

  requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Invalid or expired token.");
});

test("requireAuth rejects a valid token without a userId payload", () => {
  const token = signToken({ email: "noid@example.com" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = mockRes();

  requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Invalid token payload.");
});

test("requireAuth accepts a valid token and attaches the user id", () => {
  const token = tokenFor({ userId: "user-42", email: "test@example.com" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = mockRes();
  let nextCalled = false;

  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 0);
  assert.equal(nextCalled, true);
  assert.equal(req.userId, "user-42");
});

test("POST /auth/demo returns a signed token without touching the DB", async () => {
  const { status, body } = await json(await request("/auth/demo", { json: {} }));

  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.ok(body.token);
  assert.ok(body.user.is_demo);
});

test("GET /auth/user/me returns 401 without a token", async () => {
  const { status } = await json(await request("/auth/user/me"));

  assert.equal(status, 401);
});

test("GET /auth/user/me returns the profile for a valid token", async () => {
  const localStore = require("../utils/localStore");
  const user = localStore.upsertUser({ googleId: "g-1", email: "test@example.com", name: "Test Student" });
  const token = signToken({ userId: String(user._id), email: user.email });

  const { status, body } = await json(
    await request("/auth/user/me", { headers: authHeaders(token) })
  );

  assert.equal(status, 200);
  assert.equal(body.email, "test@example.com");
  assert.equal(body.name, "Test Student");
});

test("GET /auth/user/:id forbids viewing another user's profile", async () => {
  const { status, body } = await json(
    await request("/auth/user/someone-else", { headers: authHeaders(tokenFor()) })
  );

  assert.equal(status, 403);
  assert.ok(body.error.includes("own profile"));
});
