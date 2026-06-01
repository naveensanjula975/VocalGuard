import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.jpg";
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

  const getErrorMessage = (code) => ({
    EMAIL_NOT_FOUND: "No account found with this email",
    INVALID_PASSWORD: "Incorrect password",
    USER_DISABLED:    "This account has been disabled",
    INVALID_EMAIL:    "Invalid email address",
  }[code] || "Invalid email or password");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    try {
      const response = await api.login(formData);
      login({ token: response.token, user_id: response.user_id, username: response.username, email: response.email });
      navigate("/upload");
    } catch (err) {
      setError(err.message?.includes("FIREBASE_ERROR:")
        ? getErrorMessage(err.message.split("FIREBASE_ERROR:")[1].trim())
        : "Failed to sign in. Please try again.");
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
          <h1>Welcome back</h1>
          <p>Sign in to your account to continue.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="vg-field">
            <label className="vg-label" htmlFor="email">Email address</label>
            <input
              className="vg-input" type="email" id="email" name="email"
              value={formData.email}
              onChange={(e) => { setFormData(p => ({ ...p, email: e.target.value })); setError(""); }}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="vg-field">
            <div className="auth-label-row">
              <label className="vg-label" htmlFor="password">Password</label>
              <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
            </div>
            <input
              className="vg-input" type="password" id="password" name="password"
              value={formData.password}
              onChange={(e) => { setFormData(p => ({ ...p, password: e.target.value })); setError(""); }}
              placeholder="••••••••"
              autoComplete="current-password"
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

        {/* Trust row */}
        <div className="auth-trust">
          {[
            { label: "Secure login" },
            { label: "No data stored" },
            { label: "97.4% accuracy" },
          ].map(({ label }) => (
            <div className="auth-trust-item" key={label}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {label}
            </div>
          ))}
        </div>

        {/* Switch */}
        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create one free</Link>
        </p>
      </div>

      <p className="auth-footer">© 2026 VocalGuard · AI Audio Detection</p>
    </div>
  );
};

export default LoginForm;
