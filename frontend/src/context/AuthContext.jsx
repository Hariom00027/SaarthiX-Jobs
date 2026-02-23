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
    const email = urlParams.get('email');
    const name = urlParams.get('name');
    const userType = urlParams.get('userType');

    if (token) {
      // Store JWT token from SomethingX redirect
      console.log('[AuthContext] Detected JWT token in URL, storing...');
      localStorage.setItem('token', token);

      // Also store user info if provided (for immediate display while auth check happens)
      if (email || name || userType) {
        const userInfo = {
          email: email || '',
          name: name || '',
          userType: userType || 'APPLICANT'
        };
        console.log('[AuthContext] Storing user info from URL:', userInfo);
      }

      // Clean URL - remove query parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);

      // Load user data from backend to verify token
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

