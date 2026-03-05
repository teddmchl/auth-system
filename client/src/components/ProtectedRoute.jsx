import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 * Shows nothing while auth state is loading.
 */
export const ProtectedRoute = ({ children }) => {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="loading-screen">Verifying session…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

const ROLE_HIERARCHY = { user: 0, moderator: 1, admin: 2 };

/**
 * RoleGate — renders children only if user has sufficient role.
 * @prop {string}   minRole   - Minimum role required ("user"|"moderator"|"admin")
 * @prop {string[]} roles     - Exact role list (alternative to minRole)
 * @prop {ReactNode} fallback - What to render if access denied (default: null)
 */
export const RoleGate = ({ children, minRole, roles, fallback = null }) => {
  const { user } = useAuth();
  if (!user) return fallback;

  if (roles) {
    return roles.includes(user.role) ? children : fallback;
  }
  if (minRole) {
    const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
    const required = ROLE_HIERARCHY[minRole] ?? 999;
    return userLevel >= required ? children : fallback;
  }
  return children;
};

/**
 * RequireRole — full page redirect version of RoleGate.
 * Redirects to /dashboard if role is insufficient.
 */
export const RequireRole = ({ children, minRole, roles }) => {
  const { user, ready } = useAuth();

  if (!ready) return <div className="loading-screen">Verifying permissions…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const ROLE_HIERARCHY = { user: 0, moderator: 1, admin: 2 };

  let hasAccess = false;
  if (roles) {
    hasAccess = roles.includes(user.role);
  } else if (minRole) {
    hasAccess = (ROLE_HIERARCHY[user.role] ?? -1) >= (ROLE_HIERARCHY[minRole] ?? 999);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) return <Navigate to="/dashboard" replace />;
  return children;
};
