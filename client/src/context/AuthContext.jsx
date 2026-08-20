import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('beacon_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('beacon_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Clear auth state
  const clearAuth = useCallback(() => {
    localStorage.removeItem('beacon_token');
    localStorage.removeItem('beacon_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  // Sync / verify user session on initial boot
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('beacon_token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const data = await authApi.getMe();
        if (isMounted && data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('beacon_user', JSON.stringify(data.user));
        }
      } catch (err) {
        console.warn('[Auth] Token invalid or expired:', err.message);
        if (isMounted) clearAuth();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [clearAuth]);

  // Register function
  const register = async ({ username, email, password, avatar }) => {
    setAuthError(null);
    try {
      const data = await authApi.register({ username, email, password, avatar });
      if (data.success && data.token && data.user) {
        localStorage.setItem('beacon_token', data.token);
        localStorage.setItem('beacon_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data;
      }
      throw new Error(data.error || 'Registration failed');
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Login function
  const login = async ({ email, password }) => {
    setAuthError(null);
    try {
      const data = await authApi.login({ email, password });
      if (data.success && data.token && data.user) {
        localStorage.setItem('beacon_token', data.token);
        localStorage.setItem('beacon_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data;
      }
      throw new Error(data.error || 'Login failed');
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Logout function
  const logout = () => {
    clearAuth();
  };

  const value = {
    user,
    token,
    loading,
    authError,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
    setAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
