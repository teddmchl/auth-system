const { verifyAccessToken } = require("../utils/tokens");
const User = require("../models/User");

/**
 * requireAuth — attaches req.user if a valid access token is present.
 * Returns 401 if missing or invalid, 403 if user no longer exists.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);

    // Optional: re-fetch user to ensure they still exist and role hasn't changed.
    // For performance, you can skip this and trust the JWT payload instead.
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(403).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token expired" });
    }
    return res.status(401).json({ error: "Invalid access token" });
  }
};

module.exports = { requireAuth };
