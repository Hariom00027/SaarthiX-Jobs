import { API_BASE_URL } from '../config/apiConfig';

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

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      // Token might be expired or invalid
      localStorage.removeItem('token');
      return { authenticated: false };
    }

    const data = await response.json();
    return {
      authenticated: data.authenticated !== false,
      name: data.name,
      email: data.email,
      picture: data.picture,
      userType: data.userType
    };
  } catch (error) {
    console.error('Error checking auth:', error);
    return { authenticated: false };
  }
};

// Logout
export const logout = async (clearAuthCallback) => {
  try {
    // Clear local storage
    localStorage.removeItem('token');

    // Clear auth state if callback provided
    if (clearAuthCallback) {
      clearAuthCallback();
    }

    // Redirect to SomethingX or home
    window.location.href = '/';
  } catch (error) {
    console.error('Error logging out:', error);
    // Still clear local state even if something fails
    localStorage.removeItem('token');
    if (clearAuthCallback) {
      clearAuthCallback();
    }
    window.location.href = '/';
  }
};

// Export helper for other API files to use
export { getAuthHeaders };