import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { RoleGate } from "../components/ProtectedRoute";
import api from "../api/axios";

const ROLE_COLORS = {
  admin: { bg: "rgba(239,68,68,.1)", border: "rgba(239,68,68,.3)", text: "#ef4444" },
  moderator: { bg: "rgba(14,165,233,.1)", border: "rgba(14,165,233,.3)", text: "#0ea5e9" },
  user: { bg: "rgba(34,197,94,.08)", border: "rgba(34,197,94,.25)", text: "#22c55e" },
};

export default function Dashboard() {
  const { user, logout, logoutAll } = useAuth();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api.get("/protected/dashboard")
      .then(({ data }) => setDashData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const handleLogoutAll = async () => {
    if (!confirm("Sign out from all devices?")) return;
    setLoggingOut(true);
    await logoutAll();
  };

  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.user;

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-logo">AUTH<span className="logo-accent">/SYS</span></div>
        <nav className="dash-nav">
          <RoleGate minRole="moderator">
            <Link to="/moderator" className="dash-nav-link">Mod Panel</Link>
          </RoleGate>
          <RoleGate minRole="admin">
            <Link to="/admin" className="dash-nav-link dash-nav-admin">Admin</Link>
          </RoleGate>
          <button onClick={handleLogout} className="dash-nav-link dash-nav-btn" disabled={loggingOut}>
            Sign out
          </button>
        </nav>
      </header>

      <main className="dash-main">
        <div className="dash-grid">

          {/* Identity card */}
          <div className="dash-card dash-card--identity">
            <div className="card-label">Current session</div>
            <div className="identity-name">{user?.name}</div>
            <div className="identity-email">{user?.email}</div>
            <div className="identity-role" style={{ background: roleStyle.bg, border: `1px solid ${roleStyle.border}`, color: roleStyle.text }}>
              {user?.role}
            </div>
          </div>

          {/* Session info */}
          <div className="dash-card">
            <div className="card-label">Last login</div>
            <div className="card-value">
              {user?.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                : "This session"}
            </div>
            <div className="card-label" style={{ marginTop: "1rem" }}>Member since</div>
            <div className="card-value">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })
                : "—"}
            </div>
          </div>

          {/* Token demo */}
          <div className="dash-card dash-card--wide">
            <div className="card-label">Access token (truncated)</div>
            <div className="token-display">
              {localStorage.getItem("accessToken")?.slice(0, 60)}…
            </div>
            <div className="card-hint">15-minute JWT · auto-refreshed via httpOnly cookie · race-condition safe</div>
          </div>

          {/* Role-gated zones */}
          <div className="dash-card dash-card--wide">
            <div className="card-label">Protected zones</div>
            <div className="zones-grid">
              <div className="zone zone--open">
                <div className="zone-icon">✓</div>
                <div className="zone-name">Dashboard</div>
                <div className="zone-req">All authenticated users</div>
              </div>
              <RoleGate
                minRole="moderator"
                fallback={
                  <div className="zone zone--locked">
                    <div className="zone-icon">✕</div>
                    <div className="zone-name">Mod Panel</div>
                    <div className="zone-req">Requires moderator+</div>
                  </div>
                }
              >
                <Link to="/moderator" className="zone zone--open zone--link">
                  <div className="zone-icon">✓</div>
                  <div className="zone-name">Mod Panel</div>
                  <div className="zone-req">Access granted →</div>
                </Link>
              </RoleGate>
              <RoleGate
                minRole="admin"
                fallback={
                  <div className="zone zone--locked">
                    <div className="zone-icon">✕</div>
                    <div className="zone-name">Admin Panel</div>
                    <div className="zone-req">Requires admin</div>
                  </div>
                }
              >
                <Link to="/admin" className="zone zone--open zone--link">
                  <div className="zone-icon">✓</div>
                  <div className="zone-name">Admin Panel</div>
                  <div className="zone-req">Access granted →</div>
                </Link>
              </RoleGate>
            </div>
          </div>

          {/* Device management */}
          <div className="dash-card">
            <div className="card-label">Device management</div>
            <div className="card-hint" style={{ marginBottom: "1rem" }}>
              Sign out from all devices invalidates every active refresh token.
            </div>
            <button
              onClick={handleLogoutAll}
              className="btn-danger-sm"
              disabled={loggingOut}
            >
              Sign out all devices
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
