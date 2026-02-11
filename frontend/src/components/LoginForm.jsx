import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

// ── Error code → friendly message ────────────
const ERROR_MESSAGES = {
  EMAIL_NOT_FOUND: "No user found with this email address",
  INVALID_PASSWORD: "Invalid password",
  USER_DISABLED: "This account has been disabled",
  INVALID_EMAIL: "Invalid email address",
};

const LoginForm = () => {
  const navigate = useNavigate();
  const { login, authError, setAuthError } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Surface any auth-context errors (e.g. expired session)
  useEffect(() => {
    if (authError) {
      setError(authError);
      setAuthError(null);
    }
  }, [authError, setAuthError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.login(formData);

      login({
        token: response.token,
        user_id: response.user_id,
        username: response.username,
        email: response.email,
      });

      navigate("/upload");
    } catch (err) {
      const msg = err.message || "";
      const code = msg.includes("FIREBASE_ERROR:")
        ? msg.split("FIREBASE_ERROR:")[1].trim()
        : null;
      setError(ERROR_MESSAGES[code] || "Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="header">
          <h3 className="welcome-text">Welcome back! 👋</h3>
          <h2>Sign in to your account</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Your email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
          >
            {isLoading ? "Signing in..." : "CONTINUE"}
          </button>
        </form>

        <div className="forgot-password">
          <Link to="/forgot-password">Forgot your password?</Link>
        </div>

        <div className="signup-container">
          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
