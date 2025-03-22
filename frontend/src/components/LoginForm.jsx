// src/components/LoginForm.jsx
import React from "react";
import "../styles/styles.css";

const LoginForm = () => {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="header">
          <h3 className="welcome-text">Welcome back! 👋</h3>
          <h2>Sign in to your account</h2>
        </div>

        <form>
          <label htmlFor="email">Your email</label>
          <input type="email" id="email" placeholder="Enter your email" required />

          <label htmlFor="password">Password</label>
          <input type="password" id="password" placeholder="Enter your password" required />

          <button type="submit">CONTINUE</button>
        </form>

        <div className="forgot-password">
          <a href="#">Forgot your password?</a>
        </div>

        <div className="signup-wrapper">
          <div className="signup-container">
            <p>Don't have an account? <a href="/signup">Sign up</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 