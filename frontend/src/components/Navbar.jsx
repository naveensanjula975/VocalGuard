import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/design-tokens.css";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const dropRef = useRef(null);
  const mobileRef = useRef(null);

  /* auto-hide on scroll down, reveal on scroll up */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      if (y > lastY.current && y > 80) {
        setHidden(true);          // scrolling down → hide
        setMenuOpen(false);
        setDropOpen(false);
      } else {
        setHidden(false);         // scrolling up → show
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* close on route change */
  useEffect(() => { setMenuOpen(false); setDropOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    try { await logout(); navigate("/login"); } catch {}
  };

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const navLinks = user
    ? [{ to: "/", label: "Home" }, { to: "/about", label: "About" }, { to: "/history", label: "History" }]
    : [{ to: "/", label: "Home" }, { to: "/about", label: "About" }];

  const initials = (user?.username || "U").slice(0, 2).toUpperCase();

  return (
    <header className={`nb-header${scrolled ? " nb-header--scrolled" : ""}${hidden ? " nb-header--hidden" : ""}`}>
      <nav className="nb-bar" role="navigation" aria-label="Main navigation">

        {/* ── Brand wordmark ── */}
        <Link to="/" className="nb-logo" aria-label="VocalGuard home">
          <span className="nb-wordmark">
            <span className="nb-wordmark-vocal">Vocal</span><span className="nb-wordmark-guard">Guard</span>
          </span>
        </Link>

        {/* ── Center links (desktop) ── */}
        <div className="nb-links" role="list">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              role="listitem"
              className={`nb-link${isActive(to) ? " nb-link--active" : ""}`}
            >
              {label}
              {isActive(to) && <span className="nb-link-pip" aria-hidden="true" />}
            </Link>
          ))}
        </div>

        {/* ── Right actions (desktop) ── */}
        <div className="nb-actions">
          {user ? (
            <>
              <Link to="/upload" className="nb-cta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                Analyse
              </Link>

              {/* Avatar + dropdown */}
              <div className="nb-user" ref={dropRef}>
                <button
                  className="nb-avatar"
                  onClick={() => setDropOpen(v => !v)}
                  aria-haspopup="true"
                  aria-expanded={dropOpen}
                  aria-label={`User menu for ${user.username}`}
                >
                  <span className="nb-avatar-initials">{initials}</span>
                  <svg
                    className={`nb-avatar-chevron${dropOpen ? " nb-avatar-chevron--open" : ""}`}
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                <div className={`nb-drop${dropOpen ? " nb-drop--open" : ""}`} role="menu">
                  {/* User info */}
                  <div className="nb-drop-user">
                    <div className="nb-drop-avatar">{initials}</div>
                    <div className="nb-drop-info">
                      <span className="nb-drop-name">{user.username}</span>
                      <span className="nb-drop-email">{user.email || "Signed in"}</span>
                    </div>
                  </div>

                  <div className="nb-drop-sep" />

                  <Link to="/profile" className="nb-drop-item" role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Profile settings
                  </Link>
                  <Link to="/history" className="nb-drop-item" role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Analysis history
                  </Link>
                  <Link to="/upload" className="nb-drop-item" role="menuitem">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16"/>
                      <line x1="12" y1="12" x2="12" y2="21"/>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                    </svg>
                    Upload audio
                  </Link>

                  <div className="nb-drop-sep" />

                  <button className="nb-drop-item nb-drop-item--danger" role="menuitem" onClick={handleLogout}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login"  className="nb-ghost">Sign in</Link>
              <Link to="/signup" className="nb-cta">Get started</Link>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="nb-burger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="nb-mobile-menu"
        >
          <span className={`nb-burger-icon${menuOpen ? " nb-burger-icon--open" : ""}`}>
            <span /><span /><span />
          </span>
        </button>
      </nav>

      {/* ── Mobile drawer ── */}
      <div
        id="nb-mobile-menu"
        className={`nb-mobile${menuOpen ? " nb-mobile--open" : ""}`}
        ref={mobileRef}
        aria-hidden={!menuOpen}
      >
        <div className="nb-mobile-inner">
          {/* User info strip */}
          {user && (
            <div className="nb-mobile-user">
              <div className="nb-mobile-avatar">{initials}</div>
              <div>
                <div className="nb-mobile-uname">{user.username}</div>
                <div className="nb-mobile-uemail">{user.email || "Signed in"}</div>
              </div>
            </div>
          )}

          <div className="nb-mobile-section">
            {navLinks.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`nb-mobile-link${isActive(to) ? " nb-mobile-link--active" : ""}`}>
                {label}
              </Link>
            ))}
          </div>

          {user ? (
            <>
              <div className="nb-mobile-sep" />
              <div className="nb-mobile-section">
                <Link to="/upload"  className="nb-mobile-link">Upload audio</Link>
                <Link to="/profile" className="nb-mobile-link">Profile settings</Link>
              </div>
              <div className="nb-mobile-sep" />
              <button className="nb-mobile-link nb-mobile-link--danger" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="nb-mobile-sep" />
              <div className="nb-mobile-section">
                <Link to="/login"  className="nb-mobile-link">Sign in</Link>
                <Link to="/signup" className="nb-mobile-link nb-mobile-link--cta">Get started →</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
