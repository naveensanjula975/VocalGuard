import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/design-tokens.css";
import "./AuthPages.css";

const LoginForm = () => {
  const navigate = useNavigate();
  const { login, authError, setAuthError } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authError) { setError(authError); setAuthError(null); }
  }, [authError, setAuthError]);

  const getErrorMessage = (code) => {
    const map = {
      EMAIL_NOT_FOUND: "No account found with this email",
      INVALID_PASSWORD: "Incorrect password",
      USER_DISABLED: "This account has been disabled",
      INVALID_EMAIL: "Invalid email address",
    };
    return map[code] || "Invalid email or password";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      const response = await api.login(formData);
      login({ token: response.token, user_id: response.user_id, username: response.username, email: response.email });
      navigate("/upload");
    } catch (err) {
      const msg = err.message?.includes("FIREBASE_ERROR:")
        ? getErrorMessage(err.message.split("FIREBASE_ERROR:")[1].trim())
        : "Failed to sign in. Please try again.";
      setError(msg);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="vg-auth-layout">
      {/* Left panel */}
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
            <h1>Welcome back</h1>
            <p>Sign in to continue detecting AI-generated audio.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form vg-anim-3">
            <div className="vg-field">
              <label className="vg-label" htmlFor="email">Email address</label>
              <input
                className="vg-input"
                type="email" id="email" name="email"
                value={formData.email}
                onChange={(e) => { setFormData(p => ({...p, email: e.target.value})); setError(""); }}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="vg-field">
              <div className="auth-label-row">
                <label className="vg-label" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
              </div>
              <input
                className="vg-input"
                type="password" id="password" name="password"
                value={formData.password}
                onChange={(e) => { setFormData(p => ({...p, password: e.target.value})); setError(""); }}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="auth-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="vg-btn vg-btn-primary auth-submit"
              disabled={isLoading || !formData.email || !formData.password}
            >
              {isLoading ? <><span className="vg-spinner" />Signing in…</> : "Sign in"}
            </button>
          </form>

          <p className="auth-switch vg-anim-4">
            Don't have an account?{" "}
            <Link to="/signup">Create one free</Link>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="vg-auth-side auth-right-panel">
        <AuthSideContent />
      </div>
    </div>
  );
};

export const AuthSideContent = () => (
  <div className="auth-side-content">
    <div className="auth-side-grid" />
    <div className="auth-side-glow" />
    <div className="auth-side-inner">
      <div className="auth-side-tag">97.4% accuracy</div>
      <h2 className="auth-side-title">Detect AI voices before they deceive.</h2>
      <p className="auth-side-sub">Wav2Vec2-XLSR neural network · MFCC features · Real-time results</p>
      <div className="auth-side-stats">
        {[["< 2s","Analysis time"],["50k+","Files analysed"],["768","Embedding dims"]].map(([n,l]) => (
          <div className="auth-side-stat" key={l}>
            <span className="auth-side-stat-num">{n}</span>
            <span className="auth-side-stat-label">{l}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="auth-side-card">
      <div className="auth-side-card-header">
        <span className="auth-side-card-label">Latest detection</span>
        <span className="auth-side-card-badge">AI Generated</span>
      </div>
      <div className="auth-side-waveform">
        {Array.from({length: 28}, (_,i) => {
          const c = 14, d = Math.abs(i-c)/c;
          const h = 20 + Math.random() * (80 - d*d*60);
          return <div key={i} className="auth-side-bar" style={{"--h":`${h}%`,"--del":`${(Math.random()*0.6).toFixed(2)}s`}} />;
        })}
      </div>
      <div className="auth-side-card-footer">
        <span>Confidence</span>
        <span className="auth-side-card-conf">87%</span>
      </div>
    </div>
  </div>
);

export default LoginForm;
