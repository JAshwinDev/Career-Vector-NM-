const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const User = require("../../models/User");
const localStore = require("../../utils/localStore");
const { requireAuth, signToken, revokeToken } = require("../../middleware/auth");

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const oauthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// POST /auth/google - Verify a Google ID token server-side, then log in / sign up
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "idToken is required." });
    }

    if (!oauthClient) {
      return res.status(503).json({
        error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID in backend/.env."
      });
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ error: "Invalid Google ID token." });
    }

    if (payload.email_verified === false) {
      return res.status(401).json({ error: "Google email is not verified." });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || "";
    const profilePicture = payload.picture || "";

    let user;
    const mongoReady = localStore.isMongoReady(mongoose);

    if (!mongoReady) {
      user = localStore.upsertUser({ googleId, email, name, profilePicture });
    } else {
      user = await User.findOne({ googleId });

      if (!user) {
        user = await User.findOne({ email });

        if (user) {
          user.googleId = googleId;
        } else {
          user = new User({ googleId, email, name, profilePicture });
        }
      } else {
        if (name) user.name = name;
        if (profilePicture) user.profilePicture = profilePicture;
      }

      await user.save();
    }

    const token = signToken({ userId: String(user._id), email: user.email });

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture
      },
      token,
      storage: mongoReady ? "mongo" : "local"
    });
  } catch (err) {
    const message = String(err && err.message ? err.message : err);
    let error = "Google authentication failed.";

    if (/Wrong recipient|audience/i.test(message)) {
      error =
        "Google token audience mismatch: the client ID used to sign in differs from GOOGLE_CLIENT_ID in backend/.env. " +
        "The sign-in button must be configured with: " + (GOOGLE_CLIENT_ID || "(unset)");
    } else if (/No pem found|invalid token|signature/i.test(message)) {
      error =
        "Google ID token could not be verified. It may be malformed, expired, or not issued for this app's Google client ID.";
    }

    console.error("Google auth error:", message);
    return res.status(401).json({ error, details: message });
  }
});

// GET /auth/google/config - Expose the Google client ID so the frontend can
// initialize Google Identity Services with the exact value the backend verifies
// against. Single source of truth: never hardcode the ID in the UI.
router.get("/google/config", (_req, res) => {
  res.json({
    enabled: Boolean(oauthClient),
    clientId: GOOGLE_CLIENT_ID || null
  });
});

// GET /auth/user/me - Current user's own profile (from JWT)
router.get("/user/me", requireAuth, async (req, res) => {
  try {
    const user = localStore.isMongoReady(mongoose)
      ? await User.findById(req.userId)
        .populate("resumeProfiles")
        .populate("jobMatches")
        .lean()
      : localStore.getUserById(req.userId);

    if (!user) {
      if (req.auth && req.auth.is_demo) {
        return res.json({
          _id: req.userId,
          email: req.auth.email || "",
          name: "Demo Student",
          is_demo: true
        });
      }
      return res.status(404).json({ error: "User not found." });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user.", details: err.message });
  }
});

// GET /auth/user/:id - Get user profile (only the authenticated owner)
router.get("/user/:id", requireAuth, async (req, res) => {
  try {
    if (String(req.params.id) !== req.userId) {
      return res.status(403).json({ error: "You can only view your own profile." });
    }

    const user = localStore.isMongoReady(mongoose)
      ? await User.findById(req.params.id)
        .populate("resumeProfiles")
        .populate("jobMatches")
        .lean()
      : localStore.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user.", details: err.message });
  }
});

// PUT /auth/user/:id - Update user profile (only the authenticated owner)
router.put("/user/:id", requireAuth, async (req, res) => {
  try {
    if (String(req.params.id) !== req.userId) {
      return res.status(403).json({ error: "You can only update your own profile." });
    }

    const { name, currentRole, targetRole, preferences } = req.body;

    const updates = {
      ...(name && { name }),
      ...(currentRole && { currentRole }),
      ...(targetRole && { targetRole }),
      ...(preferences && { preferences })
    };

    const user = localStore.isMongoReady(mongoose)
      ? await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      : localStore.updateUser(req.params.id, updates);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update user.", details: err.message });
  }
});

// POST /auth/logout - Revoke the presented token (if any) so cached copies of
// the same session in other clients (e.g. the extension) stop validating.
router.post("/logout", (req, res) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme === "Bearer" && token) {
    revokeToken(token);
  }

  res.json({ success: true, message: "Logged out successfully" });
});

// POST /auth/register - Local email/password signup
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: "User already exists with this email." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ email, password: hashedPassword, name });
    await user.save();

    const token = signToken({ userId: String(user._id), email: user.email });
    return res.json({
      success: true,
      user: { id: user._id, email: user.email, name: user.name },
      token
    });
  } catch (err) {
    return res.status(500).json({ error: "Registration failed.", details: err.message });
  }
});

// POST /auth/login - Local email/password login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = signToken({ userId: String(user._id), email: user.email });
    return res.json({
      success: true,
      user: { id: user._id, email: user.email, name: user.name },
      token
    });
  } catch (err) {
    return res.status(500).json({ error: "Login failed.", details: err.message });
  }
});

// POST /auth/demo - Login as a demo student WITHOUT saving to DB
router.post("/demo", async (req, res) => {
  try {
    const demoEmail = "demo." + Date.now() + "@example.com";
    const demoUser = {
      _id: "demo-" + Date.now(),
      email: demoEmail,
      name: "Demo Student",
      is_demo: true
    };

    const token = signToken({ userId: demoUser._id, email: demoUser.email, is_demo: true });

    return res.json({
      success: true,
      user: {
        id: demoUser._id,
        email: demoUser.email,
        name: demoUser.name,
        is_demo: true
      },
      token
    });
  } catch (err) {
    return res.status(500).json({ error: "Demo login failed.", details: err.message });
  }
});

module.exports = router;
