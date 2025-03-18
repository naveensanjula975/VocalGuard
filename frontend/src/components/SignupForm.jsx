import React from "react";
import "../styles/signup.css";

export default function SignupForm() {
  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="header2">
          <h3 className="welcome-text2">Welcome👋</h3>
          <h2 className="h">Sign up to your account</h2>
        </div>

        <form className="form2">
          <label htmlFor="email" className="labb">Your Email</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            required
          />

          <label htmlFor="password" className="lab">Enter New Password</label>
          <input
            type="Password"
            id="CPassword"
            placeholder="Create password"
            required
          />
          <label htmlFor="password" className="labb">Re Enter Password</label>
          <input
            type="password"
            id="confirmpassword"
            placeholder="Confirm password"
            required
          />

          <button type="submit">SIGNUP</button>
        </form>



        <div className="signup-wrapper">
          <div className="signup-container">
            <p>
              You have an account? <a href="#">Login</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
