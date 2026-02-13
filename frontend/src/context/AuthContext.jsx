import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

// ── localStorage keys ────────────────────────
const STORAGE_KEYS = ["token", "userId", "username", "email"];

function clearStorage() {
  STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

function readStorage() {
  return Object.fromEntries(STORAGE_KEYS.map((k) => [k, localStorage.getItem(k)]));
}

// ── Provider ─────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Decode a JWT and check whether it has expired.
   */
  const isTokenExpired = useCallback((token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp < Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  }, []);

  // ── Mount: rehydrate from localStorage ─────
  useEffect(() => {
    const { token, userId, username, email } = readStorage();

    if (token && userId && username) {
      if (isTokenExpired(token)) {
        clearStorage();
      } else {
        setUser({ token, userId, username, email });

        // Verify with backend (non-blocking)
        api.verifyToken(token).catch((err) => {
          console.error("Token verification failed:", err);
          setAuthError("Session expired. Please login again.");
        });
      }
    }

    setLoading(false);
  }, [isTokenExpired]);

  // ── Login ──────────────────────────────────
  const login = useCallback((data) => {
    if (!data.token || !data.user_id) {
      console.error("Login data missing required fields:", data);
      setAuthError("Invalid login data");
      return;
    }

    setAuthError(null);

    const username = data.username || data.email?.split("@")[0] || "User";

    setUser({ token: data.token, userId: data.user_id, username, email: data.email });

    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user_id);
    localStorage.setItem("username", username);
    if (data.email) localStorage.setItem("email", data.email);
  }, []);

  // ── Logout ─────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setAuthError(null);
    clearStorage();
  }, []);

  // ── Partial user update (profile edits) ────
  const updateUser = useCallback(async (updates) => {
    if (updates.username) localStorage.setItem("username", updates.username);
    if (updates.email) localStorage.setItem("email", updates.email);

    setUser((prev) => ({
      ...prev,
      username: updates.username || prev.username,
      email: updates.email || prev.email,
    }));
  }, []);

  // ── Memoize context value to prevent cascading re-renders ──
  const contextValue = useMemo(
    () => ({ user, login, logout, updateUser, loading, authError, setAuthError }),
    [user, login, logout, updateUser, loading, authError],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
