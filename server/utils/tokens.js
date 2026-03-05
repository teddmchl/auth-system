const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Generate a short-lived access token (default 15m).
 * Payload contains user id and role only — keep it lean.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
  );
};

/**
 * Generate a long-lived refresh token (default 7d).
 * We store this in the DB so it can be revoked.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { sub: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
};

/**
 * Verify an access token. Returns decoded payload or throws.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

/**
 * Verify a refresh token. Returns decoded payload or throws.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

/**
 * Get expiry date from a refresh token expiry string (e.g. "7d" -> Date).
 */
const getRefreshTokenExpiry = () => {
  const expiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";
  const now = new Date();
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [, amount, unit] = match;
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return new Date(now.getTime() + parseInt(amount) * ms);
};

/**
 * Generate a secure random hex token for password reset links.
 */
const generateResetToken = () => crypto.randomBytes(32).toString("hex");

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  generateResetToken,
};
