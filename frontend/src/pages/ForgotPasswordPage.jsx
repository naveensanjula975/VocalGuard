import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/design-tokens.css";
import "../components/AuthPages.css";
import { AuthSideContent } from "../components/LoginForm";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus({ type: "success", message: "Reset link sent! Check your inbox." });
    } catch {
      setStatus({ type: "error", message: "Failed to send reset link. Please try again." });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="vg-auth-layout">
      <div className="auth-left-panel">
        <div className="auth-left-inner">
          <div className="auth-brand vg-anim-1">
            <div className="auth-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span className="auth-brand-name">VocalGuard</span>
          </div>

          <div className="auth-heading vg-anim-2">
            <h1>Reset your password</h1>
            <p>Enter your email and we'll send a reset link within seconds.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form vg-anim-3">
            <div className="vg-field">
              <label className="vg-label" htmlFor="email">Email address</label>
              <input className="vg-input" type="email" id="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required />
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

            <button type="submit" className="vg-btn vg-btn-primary auth-submit" disabled={isLoading || !email}>
              {isLoading ? <><span className="vg-spinner" />Sending…</> : "Send reset link"}
            </button>
          </form>

          <p className="auth-switch vg-anim-4">
            <Link to="/login">← Back to sign in</Link>
          </p>
        </div>
      </div>

      <div className="vg-auth-side auth-right-panel">
        <AuthSideContent />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
