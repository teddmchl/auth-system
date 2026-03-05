const express = require("express");
const router = express.Router();
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { requireAuth } = require("../middleware/auth");
const { requireRole, requireMinRole } = require("../middleware/requireRole");

/* ── GET /api/protected/dashboard — any authenticated user ── */
router.get("/dashboard", requireAuth, (req, res) => {
  res.json({
    message: `Welcome to the dashboard, ${req.user.name}`,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      memberSince: req.user.createdAt,
      lastLogin: req.user.lastLoginAt,
    },
  });
});

/* ── GET /api/protected/moderator — moderator or admin ── */
router.get(
  "/moderator",
  requireAuth,
  requireMinRole("moderator"),
  (req, res) => {
    res.json({
      message: "Moderator zone — content moderation tools would live here.",
      accessLevel: "moderator+",
      user: req.user.name,
    });
  }
);

/* ── GET /api/protected/admin — admin only ── */
router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  (req, res) => {
    res.json({
      message: "Admin zone — full system access.",
      accessLevel: "admin",
      user: req.user.name,
    });
  }
);

/* ── GET /api/protected/admin/users — list all users (admin) ── */
router.get(
  "/admin/users",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const users = await User.find().sort({ createdAt: -1 }).lean();
      const activeSessions = await RefreshToken.aggregate([
        { $group: { _id: "$user", count: { $sum: 1 } } },
      ]);
      const sessionMap = Object.fromEntries(
        activeSessions.map((s) => [s._id.toString(), s.count])
      );

      res.json({
        users: users.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
          activeSessions: sessionMap[u._id.toString()] || 0,
        })),
        total: users.length,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to load users" });
    }
  }
);

/* ── PATCH /api/protected/admin/users/:id/role — change role (admin) ── */
router.patch(
  "/admin/users/:id/role",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { role } = req.body;
      if (!["user", "moderator", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      if (req.params.id === req.user._id.toString()) {
        return res.status(400).json({ error: "You cannot change your own role" });
      }
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ message: `Role updated to ${role}`, user: { id: user._id, name: user.name, role: user.role } });
    } catch (err) {
      res.status(500).json({ error: "Failed to update role" });
    }
  }
);

module.exports = router;
