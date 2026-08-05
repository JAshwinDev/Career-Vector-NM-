const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sessionStore = require("../utils/sessionStore");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    console.warn(
      "[auth] JWT_SECRET is not set. Using an ephemeral secret — tokens will be invalidated on restart. Set JWT_SECRET in backend/.env."
    );
    return crypto.randomBytes(32).toString("hex");
  })();

const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || "7d";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
    jwtid: crypto.randomBytes(16).toString("hex")
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  if (sessionStore.isRevoked(decoded.jti)) {
    return res.status(401).json({ error: "Session expired." });
  }

  if (!decoded.userId) {
    return res.status(401).json({ error: "Invalid token payload." });
  }

  req.userId = decoded.userId;
  req.auth = decoded;
  req.token = token;
  return next();
}

function revokeToken(token) {
  const decoded = verifyToken(token);
  if (decoded) {
    sessionStore.revoke(decoded.jti);
  }
}

module.exports = { JWT_SECRET, signToken, verifyToken, requireAuth, revokeToken };
