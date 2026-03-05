/**
 * requireRole — role-based access control middleware.
 * Must be used AFTER requireAuth (needs req.user).
 *
 * Usage:
 *   router.get('/admin', requireAuth, requireRole('admin'), handler)
 *   router.get('/mod', requireAuth, requireRole('admin', 'moderator'), handler)
 */

const ROLE_HIERARCHY = { user: 0, moderator: 1, admin: 2 };

/**
 * Require one of the listed roles (exact match).
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
};

/**
 * Require at least a minimum role level (hierarchical).
 * e.g. requireMinRole('moderator') allows moderator AND admin.
 */
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 999;
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: minRole,
        current: req.user.role,
      });
    }
    next();
  };
};

module.exports = { requireRole, requireMinRole };
