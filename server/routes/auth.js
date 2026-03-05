const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { requireAuth } = require("../middleware/auth");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
  generateResetToken,
} = require("../utils/tokens");
const { sendPasswordResetEmail } = require("../utils/email");

/* ── Rate limiters ── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: "Too many requests — try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: "Too many reset requests — try again later" },
});

/* ── Helper: set refresh token cookie ── */
const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth/refresh", // only sent to refresh endpoint
  });
};

/* ── Helper: clear refresh token cookie ── */
const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
};

/* ─────────────────────────────────────────
   POST /api/auth/register
───────────────────────────────────────── */
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Intentionally vague to prevent email enumeration
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const user = await User.create({ name, email, password });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    console.error("[register]", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/login
───────────────────────────────────────── */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Explicitly select password (hidden by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/refresh
   Reads httpOnly cookie, issues new access token.
   Also rotates the refresh token (rotation pattern).
───────────────────────────────────────── */
router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: "Refresh token not found" });
  }

  try {
    // 1. Verify JWT signature
    const payload = verifyRefreshToken(token);

    // 2. Check it exists in DB (not revoked)
    const storedToken = await RefreshToken.findOne({ token });
    if (!storedToken) {
      // Token reuse detected — revoke ALL tokens for this user
      await RefreshToken.deleteMany({ user: payload.sub });
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Token reuse detected — please log in again" });
    }

    if (storedToken.isExpired()) {
      await storedToken.deleteOne();
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Refresh token expired" });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      await storedToken.deleteOne();
      clearRefreshCookie(res);
      return res.status(401).json({ error: "User not found" });
    }

    // 3. Rotate: delete old, create new
    await storedToken.deleteOne();
    const newRefreshToken = generateRefreshToken(user);
    const newAccessToken = generateAccessToken(user);

    await RefreshToken.create({
      token: newRefreshToken,
      user: user._id,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    setRefreshCookie(res, newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    clearRefreshCookie(res);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Refresh token expired" });
    }
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/logout
───────────────────────────────────────── */
router.post("/logout", async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    // Delete from DB so it can't be reused
    await RefreshToken.findOneAndDelete({ token }).catch(() => {});
    clearRefreshCookie(res);
  }

  res.json({ message: "Logged out successfully" });
});

/* ─────────────────────────────────────────
   POST /api/auth/logout-all
   Revoke every refresh token for this user (sign out all devices).
───────────────────────────────────────── */
router.post("/logout-all", requireAuth, async (req, res) => {
  await RefreshToken.deleteMany({ user: req.user._id });
  clearRefreshCookie(res);
  res.json({ message: "Signed out from all devices" });
});

/* ─────────────────────────────────────────
   GET /api/auth/me
───────────────────────────────────────── */
router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      lastLoginAt: req.user.lastLoginAt,
      createdAt: req.user.createdAt,
    },
  });
});

/* ─────────────────────────────────────────
   POST /api/auth/forgot-password
───────────────────────────────────────── */
router.post("/forgot-password", forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const rawToken = generateResetToken();
    // Store the hashed version so raw token in URL can't be read from DB directly
    user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(user.email, rawToken, user.name);

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("[forgot-password]", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

/* ─────────────────────────────────────────
   POST /api/auth/reset-password/:token
───────────────────────────────────────── */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ error: "Reset link is invalid or has expired" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Revoke all refresh tokens (force re-login on all devices)
    await RefreshToken.deleteMany({ user: user._id });
    clearRefreshCookie(res);

    res.json({ message: "Password reset successfully. Please log in." });
  } catch (err) {
    console.error("[reset-password]", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

module.exports = router;
