import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "EMAIL_NOT_FOUND":
        return "No user found with this email address";
      case "INVALID_PASSWORD":
        return "Invalid password";
      case "USER_DISABLED":
        return "This account has been disabled";
      case "INVALID_EMAIL":
        return "Invalid email address";
      default:
        return "Invalid email or password";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.login(formData);

      // Login the user
      login({
        token: response.token,
        user_id: response.user_id,
        username: response.username,
        email: response.email,
      });

      // Redirect to upload page
      navigate("/upload");
    } catch (err) {
      const errorMessage =
        err.message && err.message.includes("FIREBASE_ERROR:")
          ? getErrorMessage(err.message.split("FIREBASE_ERROR:")[1].trim())
          : "Failed to login. Please try again.";
      setError(errorMessage);
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
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, email: e.target.value }));
                setError(""); // Clear error when user types
              }}
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
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, password: e.target.value }));
                setError(""); // Clear error when user types
              }}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="error-message text-red-600 text-sm mt-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
            className="w-full">
            {isLoading ? "Signing in..." : "CONTINUE"}
          </button>
        </form>

        <div className="forgot-password">
          <Link to="/forgot-password">Forgot your password?</Link>
        </div>

        <div className="signup-wrapper">
          <div className="signup-container">
            <p>
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
             <p>
              Go Back To <Link to="/">Home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
