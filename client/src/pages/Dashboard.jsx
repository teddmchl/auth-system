import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { RoleGate } from "../components/ProtectedRoute";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import useDocumentTitle from "../hooks/useDocumentTitle";
import api from "../api/axios";

const ROLE_COLORS = {
  admin: { bg: "rgba(239,68,68,.1)", border: "rgba(239,68,68,.3)", text: "#ef4444" },
  moderator: { bg: "rgba(14,165,233,.1)", border: "rgba(14,165,233,.3)", text: "#0ea5e9" },
  user: { bg: "rgba(34,197,94,.08)", border: "rgba(34,197,94,.25)", text: "#22c55e" },
};

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { user, logout, logoutAll } = useAuth();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    api.get("/protected/dashboard")
      .then(({ data }) => setDashData(data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const handleLogoutAll = async () => {
    setConfirmOpen(false);
    setLoggingOut(true);
    await logoutAll();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    if (newPassword.length < 8) {
      return setPwdError("New password must be at least 8 characters");
    }
    setChangingPwd(true);
    try {
      await api.post("/auth/change-password", { oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setPwdSuccess("Password updated! Sessions revoked.");
    } catch (err) {
      setPwdError(err.response?.data?.error || "Failed to change password");
    } finally {
      setChangingPwd(false);
    }
  };

  const roleStyle = ROLE_COLORS[user?.role] || ROLE_COLORS.user;

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-logo">AUTH<span className="logo-accent">/SYS</span></div>
        <nav className="dash-nav" aria-label="Main navigation">
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
        {!user?.isVerified && (
          <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", padding: "12px", color: "#ef4444", marginBottom: "24px", borderRadius: "4px", fontSize: "14px" }}>
            <strong>Action Required:</strong> Please check your inbox to verify your email address.
          </div>
        )}

        {loading ? (
          <LoadingSpinner label="Loading dashboard…" />
        ) : (
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

            {/* Token demo (Hidden by default but informative) */}
            <div className="dash-card dash-card--wide">
              <div className="token-toggle-row">
                <div className="card-label" style={{ marginBottom: 0 }}>Session Integrity</div>
                <button
                  className="token-toggle-btn"
                  onClick={() => setShowToken((v) => !v)}
                >
                  {showToken ? "Hide Details" : "Show Details"}
                </button>
              </div>
              {showToken ? (
                <div className="token-display">
                  In-memory access token rotation active. LocalStorage is empty for XSS prevention.
                </div>
              ) : (
                <div className="card-hint">
                  Your session is protected by in-memory token rotation and httpOnly cookies.
                </div>
              )}
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

            {/* Device management & Security */}
            <div className="dash-card">
              <div className="card-label">Security & Devices</div>

              <div style={{ marginBottom: "24px" }}>
                <div className="card-hint" style={{ marginBottom: "1rem" }}>
                  Change your password to invalidate all active sessions.
                </div>
                <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <input
                    type="password"
                    placeholder="Current password"
                    className="field-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="New password (min 8)"
                    className="field-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={100}
                  />
                  {pwdError && <div style={{ color: "#ef4444", fontSize: "13px" }}>{pwdError}</div>}
                  {pwdSuccess && <div style={{ color: "#22c55e", fontSize: "13px" }}>{pwdSuccess}</div>}
                  <button type="submit" className="dash-nav-btn" disabled={changingPwd} style={{ alignSelf: "flex-start", marginTop: "4px" }}>
                    {changingPwd ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>

              <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: "24px" }}>
                <div className="card-hint" style={{ marginBottom: "1rem" }}>
                  Sign out all devices immediately.
                </div>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="btn-danger-sm"
                  disabled={loggingOut}
                >
                  Sign out all devices
                </button>
              </div>
            </div>

          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out all devices?"
        message="This will invalidate every active session. You'll need to sign in again."
        confirmText="Sign out all"
        cancelText="Cancel"
        danger
        onConfirm={handleLogoutAll}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
