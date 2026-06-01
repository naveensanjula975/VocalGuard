import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.jpg";
import "../styles/design-tokens.css";
import "../components/AuthPages.css";

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
    <div className="auth-page">
      <div className="auth-card auth-card--wide">

        {/* Logo */}
        <div className="auth-logo-row">
          <img src={logo} alt="VocalGuard" className="auth-logo-img" />
        </div>

        {/* Heading */}
        <div className="auth-heading">
          <h1>Create your account</h1>
          <p>Start detecting AI-generated audio free. No credit card needed.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="vg-field">
            <label className="vg-label" htmlFor="username">Display name</label>
            <input className="vg-input" type="text" id="username" name="username"
              value={formData.username} onChange={handleChange}
              placeholder="Jane Smith"
              autoComplete="name"
              required />
          </div>

          <div className="vg-field">
            <label className="vg-label" htmlFor="email">Email address</label>
            <input className="vg-input" type="email" id="email" name="email"
              value={formData.email} onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required />
          </div>

          <div className="auth-pw-grid">
            <div className="vg-field">
              <label className="vg-label" htmlFor="password">Password</label>
              <input className="vg-input" type="password" id="password" name="password"
                value={formData.password} onChange={handleChange}
                placeholder="Min 6 characters"
                autoComplete="new-password"
                required />
            </div>
            <div className="vg-field">
              <label className="vg-label" htmlFor="confirmPassword">Confirm password</label>
              <input className="vg-input" type="password" id="confirmPassword" name="confirmPassword"
                value={formData.confirmPassword} onChange={handleChange}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required />
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

        {/* Trust row */}
        <div className="auth-trust">
          {[
            { label: "Free forever" },
            { label: "Secure & private" },
            { label: "No credit card" },
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
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>

      <p className="auth-footer">© 2026 VocalGuard · AI Audio Detection</p>
    </div>
  );
};

export default SignupPage;
