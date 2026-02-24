import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Decode JWT payload without a library (base64url → JSON)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const refreshTimerRef = useRef(null);

  // Schedule a token refresh before it expires
  const scheduleRefresh = useCallback((currentToken) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!currentToken) return;

    const decoded = decodeToken(currentToken);
    if (!decoded || !decoded.exp) return;

    const expiresAt = decoded.exp * 1000; // JWT exp is in seconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // If already expired, log out
    if (timeUntilExpiry <= 0) {
      console.warn('Token already expired, logging out');
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      return;
    }

    // Refresh when 1 day remains (or half the remaining time if less than 2 days)
    const refreshIn = Math.max(
      timeUntilExpiry - 24 * 60 * 60 * 1000, // 1 day before expiry
      Math.min(timeUntilExpiry / 2, 60 * 1000) // at least 1 minute from now
    );

    refreshTimerRef.current = setTimeout(async () => {
      try {
        // Re-fetch user data with current token — server returns fresh token if valid
        const response = await axios.get(`${API_URL}/auth/me`);
        if (response.data) {
          // Token is still valid, server accepted it — re-login to get fresh token
          // Since the server doesn't have a /refresh endpoint, we just verify the session
          // and keep the current token. The 7-day expiry is usually sufficient.
          setUser(response.data);
        }
      } catch (err) {
        console.warn('Token refresh failed, session expired');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    }, refreshIn);
  }, []);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Add axios interceptor for 401 responses (expired token server-side)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && token) {
          // Token rejected by server — session expired
          console.warn('Received 401, clearing session');
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      // Quick check: is the token expired already?
      const decoded = decodeToken(token);
      if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
        console.warn('Stored token is expired, clearing');
        localStorage.removeItem('token');
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`);
        setUser(response.data);
        scheduleRefresh(token);
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token, scheduleRefresh]);

  // Clean up refresh timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    scheduleRefresh(newToken);

    return userData;
  };

  const register = async (email, username, password) => {
    const response = await axios.post(`${API_URL}/auth/register`, { email, username, password });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    scheduleRefresh(newToken);

    return userData;
  };

  const googleLogin = async (credential) => {
    const response = await axios.post(`${API_URL}/auth/google`, { credential });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    scheduleRefresh(newToken);

    return userData;
  };

  const logout = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    isClubMember: user?.is_club_member || false,
    login,
    register,
    googleLogin,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
