import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

// ── Spinner inline SVG ───────────────────────
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.sendPasswordResetLink(email);
      setStatus({ type: "success", message: "Password reset link has been sent to your email!" });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to send reset link. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="header">
          <h3 className="welcome-text">Reset Password 🔐</h3>
          <h2>Forgot your password?</h2>
        </div>

        <p className="text-gray-600 text-sm mb-6 text-left">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {status.message && (
            <div className={status.type === "success" ? "auth-success" : "auth-error"} role="alert">
              {status.message}
            </div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Spinner />
                Sending...
              </span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
