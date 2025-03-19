import React from "react";
import "../styles/NavBar.css";

export default function NavBar() {
  return (
    <header className="head">
      <img className="logo" src="logo.jpg" alt="Logo" />

      <nav className="navbar">
        <a href="#" className="home">
          Home
        </a>
        <span className="line">|</span>

        <a href="#" className="about">
          About Us
        </a>

        <span className="line">|</span>
        <a href="#" className="history">
          History
        </a>
      </nav>
    </header>
  );
}
