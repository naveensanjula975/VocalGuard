// src/pages/LoginPage.jsx
import React from "react";
import LoginForm from "../components/LoginForm";

const LoginPage = () => {
  // LoginForm already renders the .login-page wrapper,
  // so we only need a bare fragment here.
  return <LoginForm />;
};

export default LoginPage;
