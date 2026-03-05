import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">AUTH<span className="logo-accent">/SYS</span></div>
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub">Enter your credentials to continue</p>
        </div>

        {error && <div className="auth-error"><span className="err-icon">✕</span>{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className="field-input"
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <div className="field-label-row">
              <label className="field-label" htmlFor="password">Password</label>
              <Link to="/forgot-password" className="field-link">Forgot?</Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
              className="field-input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : "Sign in →"}
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">No account?</span>
          <Link to="/register" className="auth-footer-link">Create one</Link>
        </div>
      </div>
    </div>
  );
}
