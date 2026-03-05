import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

export default function VerifyEmail() {
    const { token } = useParams();
    const [status, setStatus] = useState("loading");

    useEffect(() => {
        api.get(`/auth/verify-email/${token}`)
            .then(() => setStatus("success"))
            .catch(() => setStatus("error"));
    }, [token]);

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">AUTH<span className="logo-accent">/SYS</span></div>
                </div>

                {status === "loading" && (
                    <div style={{ textAlign: "center", margin: "2rem 0" }}>Verifying your email...</div>
                )}

                {status === "success" && (
                    <div style={{ textAlign: "center", margin: "2rem 0" }}>
                        <h2 style={{ marginBottom: "1rem", color: "#22c55e" }}>Email Verified!</h2>
                        <p style={{ marginBottom: "2rem" }}>Your email has been successfully verified.</p>
                        <Link to="/dashboard" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
                            Go to Dashboard
                        </Link>
                    </div>
                )}

                {status === "error" && (
                    <div style={{ textAlign: "center", margin: "2rem 0" }}>
                        <h2 style={{ marginBottom: "1rem", color: "#ef4444" }}>Verification Failed</h2>
                        <p style={{ marginBottom: "2rem" }}>The verification link is invalid or has expired.</p>
                        <Link to="/dashboard" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
                            Return to Dashboard
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
