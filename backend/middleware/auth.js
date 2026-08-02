const crypto = require("crypto");
const jwt = require("jsonwebtoken");

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.userId) {
      return res.status(401).json({ error: "Invalid token payload." });
    }

    req.userId = decoded.userId;
    req.auth = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = { JWT_SECRET, signToken, requireAuth };
