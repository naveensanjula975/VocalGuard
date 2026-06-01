import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";
import "../styles/design-tokens.css";
import "../components/AuthPages.css";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus({ type: "success", message: "Reset link sent — check your inbox." });
    } catch {
      setStatus({ type: "error", message: "Failed to send reset link. Please try again." });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo-row">
          <img src={logo} alt="VocalGuard" className="auth-logo-img" />
        </div>

        {/* Heading */}
        <div className="auth-heading">
          <h1>Reset your password</h1>
          <p>Enter your email and we'll send a reset link straight away.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="vg-field">
            <label className="vg-label" htmlFor="email">Email address</label>
            <input
              className="vg-input" type="email" id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {status.message && (
            <div className={status.type === "success" ? "auth-success" : "auth-error"}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {status.type === "success"
                  ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                  : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                }
              </svg>
              {status.message}
            </div>
          )}

          <button
            type="submit"
            className="vg-btn vg-btn-primary auth-submit"
            disabled={isLoading || !email || status.type === "success"}
          >
            {isLoading ? <><span className="vg-spinner" />Sending…</> : "Send reset link"}
          </button>
        </form>

        {/* Back link */}
        <p className="auth-switch">
          <Link to="/login">← Back to sign in</Link>
        </p>
      </div>

      <p className="auth-footer">© 2026 VocalGuard · AI Audio Detection</p>
    </div>
  );
};

export default ForgotPasswordPage;
