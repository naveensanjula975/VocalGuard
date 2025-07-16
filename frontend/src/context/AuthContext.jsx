import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // Function to check if a token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      // Get the expiry part from the token
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      
      // Get current time in seconds since epoch
      const now = Math.floor(Date.now() / 1000);
      
      // Check if token has expired
      return payload.exp < now;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true; // Assume expired if there's an error
    }
  };

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    const email = localStorage.getItem("email");

    if (token && userId && username) {
      // Check if token is expired
      if (isTokenExpired(token)) {
        console.log('Token is expired, logging out');
        // Clear storage and don't set user
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
      } else {
        // Token is valid, set user
        setUser({ token, userId, username, email });
        
        // Verify token with backend
        verifyToken(token).catch(error => {
          console.error('Token verification failed:', error);
          setAuthError('Session expired. Please login again.');
          // Don't logout here to avoid flash of login screen
          // User will be logged out when trying to use the invalid token
        });
      }
    }
    setLoading(false);
  }, []);
  
  // Function to verify token with backend
  const verifyToken = async (token) => {
    try {
      // Call a protected endpoint to verify token
      await api.verifyToken(token);
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  };
  
  const login = (userData) => {
    // Validate required fields
    if (!userData.token || !userData.user_id) {
      console.error('Login data missing required fields:', userData);
      setAuthError('Invalid login data');
      return;
    }
    
    // Reset any auth errors
    setAuthError(null);
    
    // Set user in state
    setUser({
      token: userData.token,
      userId: userData.user_id,
      username: userData.username || userData.email?.split('@')[0] || 'User',
      email: userData.email
    });
    
    // Store in localStorage for persistence
    localStorage.setItem("token", userData.token);
    localStorage.setItem("userId", userData.user_id);
    localStorage.setItem("username", userData.username || userData.email?.split('@')[0] || 'User');
    if (userData.email) {
      localStorage.setItem("email", userData.email);
    }
  };
  
  const logout = () => {
    setUser(null);
    setAuthError(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
  };

  const updateUser = async (userData) => {
    try {
      // Here you would typically make an API call to update user data
      // For now, we'll just update the local storage and state
      if (userData.username) {
        localStorage.setItem("username", userData.username);
      }
      if (userData.email) {
        localStorage.setItem("email", userData.email);
      }

      // Update the user state
      setUser(prevUser => ({
        ...prevUser,
        username: userData.username || prevUser.username,
        email: userData.email || prevUser.email,
      }));

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading, authError, setAuthError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
