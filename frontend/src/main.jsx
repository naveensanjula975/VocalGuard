// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // Import the App component
import "./styles/styles.css"; // Import global styles

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />  {/* Render the App component */}
  </React.StrictMode>
);
