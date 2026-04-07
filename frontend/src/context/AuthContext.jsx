import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkAuth } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const cacheSomethingXAuth = (token, authUser) => {
    const existingUser = readCachedSomethingXUser();
    const mergedUser = { ...existingUser, ...(authUser || {}) };
    if (token) {
      localStorage.setItem('somethingx_auth_token', token);
    }
    if (authUser || existingUser) {
      localStorage.setItem('somethingx_auth_user', JSON.stringify(mergedUser));
    }
  };

  const readCachedSomethingXUser = () => {
    try {
      const raw = localStorage.getItem('somethingx_auth_user');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const resolveDisplayName = (authData = {}) => {
    const cached = readCachedSomethingXUser();
    const tokenClaims = readJwtClaims();
    const candidateFromNames = `${authData?.given_name || ''} ${authData?.family_name || ''}`.trim();
    const candidateFromCachedNames = `${cached?.given_name || ''} ${cached?.family_name || ''}`.trim();
    const candidateFromTokenNames = `${tokenClaims?.given_name || ''} ${tokenClaims?.family_name || ''}`.trim();
    const candidates = [
      cached?.name,
      tokenClaims?.name,
      authData?.name,
      authData?.fullName,
      cached?.fullName,
      candidateFromNames,
      candidateFromCachedNames,
      candidateFromTokenNames,
      authData?.preferred_username,
      authData?.username,
      tokenClaims?.preferred_username,
      tokenClaims?.nickname,
      cached?.preferred_username,
      cached?.username,
      authData?.email?.split('@')?.[0],
      tokenClaims?.email?.split('@')?.[0],
      cached?.email?.split('@')?.[0],
    ]
      .map((value) => (value || '').toString().trim())
      .filter(Boolean)
      .filter((value) => value.toLowerCase() !== 'user');

    if (candidates.length === 0) return 'User';

    // Prefer fuller human names (contains a space) over handles like "m2".
    const withSpace = candidates.find((value) => value.includes(' '));
    return withSpace || candidates[0];
  };

  const readJwtClaims = () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('somethingx_auth_token');
      if (!token || token.split('.').length < 2) return {};
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
      return JSON.parse(decoded);
    } catch {
      return {};
    }
  };

  const normalizeAuthData = (authData = {}) => {
    const cached = readCachedSomethingXUser();
    return {
      ...authData,
      name: resolveDisplayName(authData),
      email: authData?.email || cached?.email || '',
      userType: authData?.userType || cached?.userType || 'APPLICANT',
    };
  };

  // Load auth state from JWT token
  const loadAuth = async () => {
    try {
      const authData = await checkAuth();
      if (authData.authenticated) {
        const normalized = normalizeAuthData(authData);
        setUser(normalized);
        setIsAuthenticated(true);
        cacheSomethingXAuth(localStorage.getItem('token'), {
          email: normalized.email || '',
          name: normalized.name || '',
          userType: normalized.userType || 'APPLICANT',
        });
        console.log('[AuthContext] User authenticated with role:', normalized.userType);
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
        cacheSomethingXAuth(token, userInfo);
        // Optimistic auth state to avoid redirect flicker while /auth/me validates token
        setUser({
          authenticated: true,
          ...userInfo,
          picture: ''
        });
        setIsAuthenticated(true);
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

  const exchangeToken = async (token, email, name, userType) => {
    try {
      if (!token) return false;

      localStorage.setItem('token', token);
      const optimisticUser = {
        email: email || '',
        name: name || '',
        userType: userType || 'APPLICANT'
      };
      cacheSomethingXAuth(token, optimisticUser);
      setUser({
        authenticated: true,
        ...optimisticUser,
        picture: ''
      });
      setIsAuthenticated(true);

      await loadAuth();
      return true;
    } catch (error) {
      console.error('[AuthContext] Token exchange failed:', error);
      return false;
    }
  };

  const updateAuth = (authData) => {
    if (authData.authenticated) {
      const normalized = normalizeAuthData(authData);
      setUser(normalized);
      setIsAuthenticated(true);
      cacheSomethingXAuth(localStorage.getItem('token'), {
        email: normalized.email || '',
        name: normalized.name || '',
        userType: normalized.userType || 'APPLICANT'
      });
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('somethingx_auth_token');
    localStorage.removeItem('somethingx_auth_user');
  };

  // Helper to check if user is INDUSTRY type
  const isIndustry = user?.userType === 'INDUSTRY';

  // Helper to check if user is APPLICANT type
  const isApplicant = user?.userType === 'APPLICANT';

  // Helper to check if user is STUDENT type
  const isStudent = user?.userType === 'STUDENT';

  // Helper to check if user is APPLICANT or STUDENT (for pages accessible to both)
  const isApplicantOrStudent = isApplicant || isStudent;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, updateAuth, clearAuth, exchangeToken, isIndustry, isApplicant, isStudent, isApplicantOrStudent }}>
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

