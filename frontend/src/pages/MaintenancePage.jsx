import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";
import "../styles/design-tokens.css";
import "../components/AuthPages.css";

const cardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "22px",
  alignItems: "center",
  textAlign: "center",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 14px",
  borderRadius: "999px",
  background: "rgba(234, 88, 12, 0.12)",
  color: "#b45309",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const noteStyle = {
  display: "grid",
  gap: "10px",
  width: "100%",
  textAlign: "left",
  padding: "16px",
  borderRadius: "16px",
  background: "rgba(17, 24, 39, 0.03)",
  border: "1px solid rgba(17, 24, 39, 0.08)",
};

const actionRowStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  justifyContent: "center",
  width: "100%",
};

const buttonBaseStyle = {
  minWidth: "160px",
  padding: "13px 18px",
  borderRadius: "12px",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
};

const primaryButtonStyle = {
  ...buttonBaseStyle,
  background: "var(--violet)",
  color: "#fff",
};

const secondaryButtonStyle = {
  ...buttonBaseStyle,
  background: "#fff",
  color: "var(--ink)",
  border: "1px solid rgba(17, 24, 39, 0.14)",
};

const MaintenancePage = () => {
  return (
    <div className="auth-page">
      <div className="auth-card" style={cardStyle}>
        <div className="auth-logo-row">
          <img src={logo} alt="VocalGuard" className="auth-logo-img" />
        </div>

        <div style={badgeStyle}>
          <span aria-hidden="true">●</span>
          Temporary maintenance
        </div>

        <div className="auth-heading" style={{ alignItems: "center" }}>
          <h1>Stay tuned</h1>
          <p>
            Sign in and sign up are temporarily disabled while the backend is
            in maintenance mode.
          </p>
        </div>

        <div style={noteStyle}>
          <strong style={{ fontSize: "14px" }}>What this means</strong>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "13px", lineHeight: 1.6 }}>
            Users can still open the site, but the login and signup actions are
            blocked until maintenance is turned off.
          </p>
        </div>

        <div style={actionRowStyle}>
          <Link to="/" style={secondaryButtonStyle}>
            Back to home
          </Link>
          <Link to="/forgot-password" style={primaryButtonStyle}>
            Forgot password?
          </Link>
        </div>
      </div>

      <p className="auth-footer">© 2026 VocalGuard · AI Audio Detection</p>
    </div>
  );
};

export default MaintenancePage;
