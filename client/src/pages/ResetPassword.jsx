import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (form.password.length < 8) return setError("Password must be at least 8 characters");

    setStatus("loading");
    setError("");
    try {
      await api.post(`/auth/reset-password/${token}`, { password: form.password });
      setStatus("success");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">AUTH<span className="logo-accent">/SYS</span></div>
            <div className="success-icon">✓</div>
            <h1 className="auth-title">Password updated</h1>
            <p className="auth-sub">Your password has been reset. Redirecting to sign in…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">AUTH<span className="logo-accent">/SYS</span></div>
          <h1 className="auth-title">Set new password</h1>
          <p className="auth-sub">Choose a strong password for your account</p>
        </div>

        {error && <div className="auth-error"><span className="err-icon">✕</span>{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="password">New password</label>
            <input
              id="password" name="password" type="password" required
              value={form.password} onChange={handleChange}
              className="field-input" placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm" name="confirm" type="password" required
              value={form.confirm} onChange={handleChange}
              className={`field-input ${form.confirm && form.confirm !== form.password ? "input-error" : ""}`}
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={status === "loading"}>
            {status === "loading" ? <span className="btn-spinner" /> : "Reset password →"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-footer-link">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
