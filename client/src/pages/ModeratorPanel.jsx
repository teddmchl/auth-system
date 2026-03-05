import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ModeratorPanel() {
  const { user } = useAuth();

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-logo">AUTH<span className="logo-accent">/SYS</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="role-chip role-mod">{user?.role}</span>
          <Link to="/dashboard" className="dash-nav-link">← Dashboard</Link>
        </div>
      </header>

      <main className="dash-main">
        <div className="panel-header">
          <h1 className="panel-title">Moderator Panel</h1>
          <p className="panel-sub">
            Access level: <strong>moderator+</strong> · You are signed in as <strong>{user?.role}</strong>.
          </p>
        </div>

        <div className="dash-grid">
          <div className="dash-card dash-card--wide">
            <div className="card-label">Access confirmed</div>
            <div className="card-value" style={{ fontSize: "1rem", lineHeight: 1.6 }}>
              This route is protected by <code className="inline-code">requireMinRole("moderator")</code> on the server
              and <code className="inline-code">RequireRole minRole="moderator"</code> on the client.
              Both admins and moderators can access it.
            </div>
          </div>

          <div className="dash-card">
            <div className="card-label">Your role</div>
            <div className="identity-role" style={{
              display: "inline-block",
              background: "rgba(14,165,233,.1)",
              border: "1px solid rgba(14,165,233,.3)",
              color: "#0ea5e9",
            }}>
              {user?.role}
            </div>
          </div>

          <div className="dash-card">
            <div className="card-label">Server middleware</div>
            <div className="card-hint" style={{ fontFamily: "var(--ff-mono)", fontSize: "0.78rem", lineHeight: 1.7 }}>
              <span style={{ color: "#22c55e" }}>requireAuth</span><br />
              <span style={{ color: "#0ea5e9" }}>requireMinRole("moderator")</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
