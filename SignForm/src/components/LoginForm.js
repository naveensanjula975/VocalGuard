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
          <label>Your email</label>
          <input type="email" placeholder="Enter your email" required />

          <label>Password</label>
          <input type="password" placeholder="Enter your password" required />

          <button type="submit">CONTINUE</button>
        </form>

        {/* Forgot Password */}
        <div className="forgot-password">
          <a href="#">Forgot your password?</a>
        </div>
      </div>

      {/* Sign-up section outside the login box */}
      <div className="signup-wrapper">
        <div className="signup-container">
          <p>Don't have an account? <a href="#">Sign up</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
