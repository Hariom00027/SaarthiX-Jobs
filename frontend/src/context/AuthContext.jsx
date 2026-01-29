import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkAuth } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load auth state from JWT token
  const loadAuth = async () => {
    try {
      const authData = await checkAuth();
      if (authData.authenticated) {
        setUser(authData);
        setIsAuthenticated(true);
        console.log('[AuthContext] User authenticated with role:', authData.userType);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Check for JWT token in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Store JWT token from SomethingX redirect
      console.log('[AuthContext] Detected JWT token in URL, storing...');
      localStorage.setItem('token', token);

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);

      // Load user data
      loadAuth();
    } else {
      // Check if we already have a token
      const existingToken = localStorage.getItem('token');
      if (existingToken) {
        console.log('[AuthContext] Found existing token, validating...');
        loadAuth();
      } else {
        console.log('[AuthContext] No token found');
        setLoading(false);
      }
    }
  }, []); // Only run once on mount

  const updateAuth = (authData) => {
    if (authData.authenticated) {
      setUser({
        ...authData,
        userType: authData.userType || 'APPLICANT',
      });
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
  };

  // Helper to check if user is INDUSTRY type
  const isIndustry = user?.userType === 'INDUSTRY';

  // Helper to check if user is APPLICANT type
  const isApplicant = user?.userType === 'APPLICANT';

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, updateAuth, clearAuth, isIndustry, isApplicant }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

