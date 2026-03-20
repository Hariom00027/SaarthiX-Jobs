// API Configuration for Jobs app
// Uses environment variable or defaults to Jobs backend port

const getBackendUrl = () => {
  const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
  if (envBackendUrl && typeof envBackendUrl === 'string' && envBackendUrl.trim()) {
    return envBackendUrl.trim().replace(/\/$/, '');
  }

  const host = window.location.hostname;
  const port = window.location.port;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  // Local dockerized Jobs frontend served on port 3500.
  // Use same-origin jobs-api route so nginx can proxy to backend container.
  if (isLocalHost && port === '3500') {
    return `${window.location.origin}/jobs-api`;
  }

  // Local Vite dev (if used): connect directly to backend port 2000.
  if (isLocalHost && port === '5173') {
    return 'http://localhost:2000/jobs-api';
  }

  // If opened without explicit port (e.g. http://localhost/jobs/), force known jobs frontend port.
  if (isLocalHost && (port === '' || port === '80')) {
    return 'http://localhost:3500/jobs-api';
  }

  // Production fallback - use the unified Gateway routing prefix
  return '/jobs-api';
};

export const BACKEND_URL = getBackendUrl();
export const API_BASE_URL = BACKEND_URL; // Prefix is already included

console.log('[Jobs API Config] Backend URL:', BACKEND_URL);
console.log('[Jobs API Config] API Base URL:', API_BASE_URL);
