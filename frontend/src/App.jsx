// src/App.jsx
import React from "react";
import LoginForm from "./components/LoginForm"; // Import the LoginForm component

const App = () => {
  return (
    <div>
      <LoginForm />  {/* This will render the LoginForm */}
    </div>
  );
};

export default App; // Export default to use in main.jsx
