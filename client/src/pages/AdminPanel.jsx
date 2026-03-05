import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";

const ROLES = ["user", "moderator", "admin"];

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null); // userId being updated

  useEffect(() => {
    api.get("/protected/admin/users")
      .then(({ data }) => setUsers(data.users))
      .catch((err) => setError(err.response?.data?.error || "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (userId, newRole) => {
    setUpdating(userId);
    try {
      const { data } = await api.patch(`/protected/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.user.role } : u))
      );
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const ROLE_COLORS = {
    admin: "#ef4444",
    moderator: "#0ea5e9",
    user: "#22c55e",
  };

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-logo">AUTH<span className="logo-accent">/SYS</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="role-chip role-admin">admin</span>
          <Link to="/dashboard" className="dash-nav-link">← Dashboard</Link>
        </div>
      </header>

      <main className="dash-main">
        <div className="panel-header">
          <h1 className="panel-title">Admin Panel</h1>
          <p className="panel-sub">Manage users and roles. Changes take effect on next token refresh.</p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: "1.5rem" }}><span className="err-icon">✕</span>{error}</div>}

        {loading ? (
          <div className="loading-state">Loading users…</div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Sessions</th>
                  <th>Last login</th>
                  <th>Change role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.id === user?.id ? "row-self" : ""}>
                    <td>
                      {u.name}
                      {u.id === user?.id && <span className="you-tag">you</span>}
                    </td>
                    <td className="cell-muted">{u.email}</td>
                    <td>
                      <span
                        className="role-chip"
                        style={{ color: ROLE_COLORS[u.role], borderColor: `${ROLE_COLORS[u.role]}44` }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="cell-muted">{u.activeSessions}</td>
                    <td className="cell-muted">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString("en-GB", { dateStyle: "short" })
                        : "—"}
                    </td>
                    <td>
                      {u.id === user?.id ? (
                        <span className="cell-muted">—</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="role-select"
                          disabled={updating === u.id}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
