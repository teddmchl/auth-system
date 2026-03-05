import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | sent | error
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setStatus("sent");
    } catch (err) {
      setError(err.response?.data?.error || "Request failed");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">AUTH<span className="logo-accent">/SYS</span></div>
            <div className="success-icon">✓</div>
            <h1 className="auth-title">Check your inbox</h1>
            <p className="auth-sub">
              If <strong>{email}</strong> is registered, you'll receive a reset link within a few minutes. Check your spam folder if it doesn't arrive.
            </p>
          </div>
          <Link to="/login" className="auth-btn" style={{ display: "flex", justifyContent: "center" }}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">AUTH<span className="logo-accent">/SYS</span></div>
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-sub">Enter your email and we'll send a reset link</p>
        </div>

        {error && <div className="auth-error"><span className="err-icon">✕</span>{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="email">Email address</label>
            <input
              id="email" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="field-input" placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={status === "loading"}>
            {status === "loading" ? <span className="btn-spinner" /> : "Send reset link →"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-footer-link">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
