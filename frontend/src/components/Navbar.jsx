import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
    <nav className="relative px-4 py-4 mt-5 bg-white sm:px-8">
      <div className="flex items-center justify-between mx-auto max-w-7xl">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <img src={logo} alt="VocalGuard" className="w-auto h-10" />
        </Link>

        {/* Desktop Menu */}
        <div className="items-center hidden gap-12 md:flex">
          {user ? (
            // Logged in menu
            <>
              <Link
                to="/"
                className="text-base font-medium text-gray-700 transition-colors duration-200 hover:text-purple-600">
                Home
              </Link>
              <Link
                to="/about"
                className="text-base font-medium text-gray-700 transition-colors duration-200 hover:text-purple-600">
                About us
              </Link>
              <Link
                to="/history"
                className="text-base font-medium text-gray-700 transition-colors duration-200 hover:text-purple-600">
                History
              </Link>
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 text-gray-700 transition-colors duration-200 hover:text-purple-600">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                    <span className="font-medium text-purple-600">
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
                  <div className="absolute right-0 z-50 w-48 py-1 mt-2 bg-white rounded-lg shadow-lg">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600">
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50">
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
                className="text-base font-medium text-gray-700 transition-colors duration-200 hover:text-purple-600">
                Home
              </Link>
              <Link
                to="/about"
                className="text-base font-medium text-gray-700 transition-colors duration-200 hover:text-purple-600">
                About us
              </Link>
              <Link
                to="/login"
                className="text-base font-medium text-gray-700 transition-colors duration-200 hover:text-purple-600">
                Login
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="p-2 transition-colors duration-200 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="px-4 py-2 text-base font-medium text-gray-700 transition-colors duration-200 rounded-lg hover:text-purple-600 hover:bg-gray-50">
                Home
              </Link>
              <Link
                to="/about"
                className="px-4 py-2 text-base font-medium text-gray-700 transition-colors duration-200 rounded-lg hover:text-purple-600 hover:bg-gray-50">
                About us
              </Link>
              <Link
                to="/history"
                className="px-4 py-2 text-base font-medium text-gray-700 transition-colors duration-200 rounded-lg hover:text-purple-600 hover:bg-gray-50">
                History
              </Link>
              <Link
                to="/profile"
                className="px-4 py-2 text-base font-medium text-gray-700 transition-colors duration-200 rounded-lg hover:text-purple-600 hover:bg-gray-50">
                Profile Settings
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-base font-medium text-left text-red-600 rounded-lg hover:bg-red-50">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/"
                className="px-4 py-2 text-base font-medium text-gray-700 transition-colors duration-200 rounded-lg hover:text-purple-600 hover:bg-gray-50">
                Home
              </Link>
              <Link
                to="/about"
                className="px-4 py-2 text-base font-medium text-gray-700 transition-colors duration-200 rounded-lg hover:text-purple-600 hover:bg-gray-50">
                About us
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 text-base font-medium text-gray-700 transition-colors duration-200 rounded-lg hover:text-purple-600 hover:bg-gray-50">
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;