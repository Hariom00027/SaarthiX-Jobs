import apiClient from './apiClient';
import { API_BASE_URL } from '../config/apiConfig';
import { getSomethingXUrl } from '../config/redirectUrls';

// Helper to get JWT token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper to create headers with JWT token
const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Initiate Google Login
export const loginWithGoogle = () => {
  window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
};

// Check if user is authenticated
export const checkAuth = async () => {
  try {
    const token = getAuthToken();

    if (!token) {
      return { authenticated: false };
    }

    // Use apiClient which automatically adds the Authorization header
    const response = await apiClient.get('/auth/me');

    if (!response.data) {
      // Token might be expired or invalid
      localStorage.removeItem('token');
      return { authenticated: false };
    }

    const data = response.data;
    return {
      authenticated: data.authenticated !== false,
      name: data.name,
      email: data.email,
      picture: data.picture,
      userType: data.userType
    };
  } catch (error) {
    console.error('Error checking auth:', error);
    // Token is invalid/expired only when backend explicitly says so.
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      return { authenticated: false };
    }

    // For network/5xx issues, preserve current session to avoid false logout flicker.
    const token = getAuthToken();
    const cachedUserStr = localStorage.getItem('somethingx_auth_user');
    if (token && cachedUserStr) {
      try {
        const cachedUser = JSON.parse(cachedUserStr);
        return {
          authenticated: true,
          name: cachedUser.name || '',
          email: cachedUser.email || '',
          picture: cachedUser.picture || '',
          userType: cachedUser.userType || 'APPLICANT',
        };
      } catch (_parseError) {
        // Ignore parse issues and fall through to unauthenticated.
      }
    }

    return { authenticated: !!token };
  }
};

// Logout
export const logout = async (clearAuthCallback) => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  try {
    // Revoke backend session/token best effort
    if (token || refreshToken) {
      await apiClient.post('/auth/logout', {
        refreshToken: refreshToken || null
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    }
  } catch (_error) {
    // Local logout still continues even if backend logout fails.
  }

  try {
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('somethingx_auth_token');
    localStorage.removeItem('somethingx_auth_user');

    // Clear auth state if callback provided
    if (clearAuthCallback) {
      clearAuthCallback();
    }

    // Always return to main app and force logout there too
    const baseUrl = getSomethingXUrl().replace(/\/$/, '');
    window.location.href = `${baseUrl}/?logout=1`;
  } catch (error) {
    console.error('Error logging out:', error);
    // Still clear local state even if something fails
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('somethingx_auth_token');
    localStorage.removeItem('somethingx_auth_user');
    if (clearAuthCallback) {
      clearAuthCallback();
    }
    const baseUrl = getSomethingXUrl().replace(/\/$/, '');
    window.location.href = `${baseUrl}/?logout=1`;
  }
};

// Export helper for other API files to use
export { getAuthHeaders };