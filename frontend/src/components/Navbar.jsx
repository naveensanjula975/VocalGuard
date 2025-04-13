<<<<<<< HEAD
import React from "react";
import { Link } from "react-router-dom";
import "../styles/Navbar.css";
=======
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
>>>>>>> 21fd32b7e07874eceb8a2fe6ad7c9316afcbdd5c
import logo from "../assets/logoo.png";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <nav className="px-4 sm:px-8 py-4 mt-5 relative bg-white">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <img src={logo} alt="VocalGuard" className="h-10 w-auto" />
        </Link>

<<<<<<< HEAD
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
=======
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-12">
          {user ? (
            // Logged in menu
            <>
              <Link
                to="/"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
                Home
              </Link>
              <Link
                to="/about"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
                About us
              </Link>
              <Link
                to="/history"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
                History
              </Link>
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors duration-200">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-purple-600 font-medium">
                      {user.username?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user.username}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600">
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Not logged in menu
            <>
              <Link
                to="/"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
                Home
              </Link>
              <Link
                to="/about"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
                About us
              </Link>
              <Link
                to="/login"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
                Login
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}>
          <svg
            className="w-6 h-6 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-200 transform transition-all duration-300 ease-in-out ${
          isMenuOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}>
        <div className="flex flex-col gap-2 p-4">
          {user ? (
            <>
              <Link
                to="/"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-lg">
                Home
              </Link>
              <Link
                to="/about"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-lg">
                About us
              </Link>
              <Link
                to="/history"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-lg">
                History
              </Link>
              <Link
                to="/profile"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-lg">
                Profile Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-left text-red-600 text-base font-medium px-4 py-2 hover:bg-red-50 rounded-lg">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-lg">
                Home
              </Link>
              <Link
                to="/about"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-lg">
                About us
              </Link>
              <Link
                to="/login"
                className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-lg">
                Login
              </Link>
            </>
          )}
>>>>>>> 21fd32b7e07874eceb8a2fe6ad7c9316afcbdd5c
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
