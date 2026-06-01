import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/design-tokens.css";
import "../components/AuthPages.css";
import { AuthSideContent } from "../components/LoginForm";

const SignupPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "", username: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setIsLoading(true);
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match"); setIsLoading(false); return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters"); setIsLoading(false); return;
    }
    try {
      const response = await api.signup({ email: formData.email, password: formData.password, username: formData.username });
      login({ token: response.token, user_id: response.user_id, username: formData.username });
      navigate("/upload");
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
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
            <h1>Create your account</h1>
            <p>Start detecting AI-generated audio for free. No credit card needed.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form vg-anim-3">
            <div className="vg-field">
              <label className="vg-label" htmlFor="username">Display name</label>
              <input className="vg-input" type="text" id="username" name="username"
                value={formData.username} onChange={handleChange}
                placeholder="Jane Smith" required />
            </div>

            <div className="vg-field">
              <label className="vg-label" htmlFor="email">Email address</label>
              <input className="vg-input" type="email" id="email" name="email"
                value={formData.email} onChange={handleChange}
                placeholder="you@example.com" required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="vg-field">
                <label className="vg-label" htmlFor="password">Password</label>
                <input className="vg-input" type="password" id="password" name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Min 6 chars" required />
              </div>
              <div className="vg-field">
                <label className="vg-label" htmlFor="confirmPassword">Confirm</label>
                <input className="vg-input" type="password" id="confirmPassword" name="confirmPassword"
                  value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Re-enter" required />
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="vg-btn vg-btn-primary auth-submit" disabled={isLoading}>
              {isLoading ? <><span className="vg-spinner" />Creating account…</> : "Create account"}
            </button>
          </form>

          <p className="auth-switch vg-anim-4">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="vg-auth-side auth-right-panel">
        <AuthSideContent />
      </div>
    </div>
  );
};

export default SignupPage;
