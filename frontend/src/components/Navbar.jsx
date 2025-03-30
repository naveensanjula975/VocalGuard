import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logoo.png";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="px-4 sm:px-8 py-4 mt-5 relative bg-white">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <img src={logo} alt="VocalGuard" className="h-10 w-auto" />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-12">
          <Link
            to="/"
            className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
            Home
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to="/about"
            className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
            About us
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to="/history"
            className="text-gray-700 text-base font-medium hover:text-purple-600 transition-colors duration-200">
            History
          </Link>
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
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}>
        <div className="flex flex-col gap-2 p-4">
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
