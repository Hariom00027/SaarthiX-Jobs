// API Configuration for Jobs app
// Uses environment variable or defaults to Jobs backend port

const getBackendUrl = () => {
  // Check if we're running in Docker (when accessed via localhost:2003)
  // or in development (when accessed via localhost:5173)
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isDocker = window.location.port === '2003' || (window.location.port === '' && window.location.hostname === 'localhost');

  // When running in Docker (port 2003), the frontend is served by nginx
  // which proxies /jobs-api/* to the backend at jobs-backend:8080/jobs-api/
  // When running in development (port 5173), connect directly to backend on port 2000
  if (isDevelopment && isDocker) {
    // Running in Docker - use /jobs-api path (nginx will proxy to backend)
    return '/jobs-api';
  } else if (isDevelopment) {
    // Running in dev mode - connect directly to backend
    // Backend runs on port 2000 with context path /jobs-api
    return 'http://localhost:2000/jobs-api';
  }

  // Production fallback - use the unified Gateway routing prefix
  return '/jobs-api';
};

export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = BACKEND_URL; // Prefix is already included

console.log('[Jobs API Config] Backend URL:', BACKEND_URL);
console.log('[Jobs API Config] API Base URL:', API_BASE_URL);
