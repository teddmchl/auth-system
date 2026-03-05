import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      return setError("Passwords do not match");
    }
    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters");
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][strength] || "";
  const strengthColor = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9"][strength] || "";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">AUTH<span className="logo-accent">/SYS</span></div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">All fields required</p>
        </div>

        {error && <div className="auth-error"><span className="err-icon">✕</span>{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="name">Full name</label>
            <input
              id="name" name="name" type="text" required
              value={form.name} onChange={handleChange}
              className="field-input" placeholder="Jane Smith"
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email" required
              value={form.email} onChange={handleChange}
              className="field-input" placeholder="jane@example.com"
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password" required
              value={form.password} onChange={handleChange}
              className="field-input" placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            {form.password && (
              <div className="strength-row">
                <div className="strength-bar">
                  {[1,2,3,4,5].map((i) => (
                    <div
                      key={i}
                      className="strength-seg"
                      style={{ background: i <= strength ? strengthColor : "var(--border)" }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
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

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : "Create account →"}
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">Already have an account?</span>
          <Link to="/login" className="auth-footer-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
