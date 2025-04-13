<<<<<<< Updated upstream
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';
import logo from '../assets/logo.png';

=======
import React from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";
import logo from "../assets/logoo.png";
>>>>>>> Stashed changes

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <img src={logo} alt="VocalGuard" />
        </Link>
<<<<<<< Updated upstream
        
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <span className="separator">|</span>
          <Link to="/about" className="nav-link">About us</Link>
          <span className="separator">|</span>
          <Link to="/history" className="nav-link">History</Link>
=======

        <div className="nav-links">
          <Link to="/" className="nav-link">
            Home
          </Link>
          <span className="separator">|</span>
          <Link to="/about" className="nav-link">
            About us
          </Link>
          <span className="separator">|</span>
          <Link to="/history" className="nav-link">
            History
          </Link>
>>>>>>> Stashed changes
        </div>
      </div>
    </nav>
  );
};

export default Navbar;