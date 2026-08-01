const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const localStore = require("../utils/localStore");

// POST /auth/google - Handle Google OAuth callback
router.post("/google", async (req, res) => {
  try {
    const { googleId, email, name, profilePicture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: "googleId and email are required." });
    }

    if (!localStore.isMongoReady(mongoose)) {
      const user = localStore.upsertUser({ googleId, email, name, profilePicture });
      const token = Buffer.from(JSON.stringify({ userId: user._id, email: user.email })).toString("base64");

      return res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          profilePicture: user.profilePicture
        },
        token,
        storage: "local"
      });
    }

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        // Update existing user with Google ID
        user.googleId = googleId;
      } else {
        // Create new user
        user = new User({
          googleId,
          email,
          name,
          profilePicture
        });
      }
    } else {
      // Update existing user info
      if (name) user.name = name;
      if (profilePicture) user.profilePicture = profilePicture;
    }

    await user.save();

    // Create JWT token (you'll need to install jsonwebtoken)
    const token = Buffer.from(
      JSON.stringify({ userId: user._id, email: user.email })
    ).toString("base64");

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture
      },
      token
    });
  } catch (err) {
    res.status(500).json({ error: "Authentication failed.", details: err.message });
  }
});

// GET /auth/user/:id - Get user profile
router.get("/user/:id", async (req, res) => {
  try {
    const user = localStore.isMongoReady(mongoose)
      ? await User.findById(req.params.id)
        .populate("resumeProfiles")
        .populate("jobMatches")
        .lean()
      : localStore.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user.", details: err.message });
  }
});

// PUT /auth/user/:id - Update user profile
router.put("/user/:id", async (req, res) => {
  try {
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

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user.", details: err.message });
  }
});

// POST /auth/logout - Logout user (optional)
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});


const bcrypt = require('bcrypt');

// POST /auth/register - Local signup
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

    const token = Buffer.from(JSON.stringify({ userId: user._id, email: user.email })).toString("base64");
    res.json({
      success: true,
      user: { id: user._id, email: user.email, name: user.name },
      token
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed.", details: err.message });
  }
});

// POST /auth/login - Local login
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

    const token = Buffer.from(JSON.stringify({ userId: user._id, email: user.email })).toString("base64");
    res.json({
      success: true,
      user: { id: user._id, email: user.email, name: user.name },
      token
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed.", details: err.message });
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
    
    // We do NOT save to MongoDB as requested.
    const token = Buffer.from(JSON.stringify({ userId: demoUser._id, email: demoUser.email, is_demo: true })).toString("base64");
    
    res.json({
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
    res.status(500).json({ error: "Demo login failed.", details: err.message });
  }
});
module.exports = router;



