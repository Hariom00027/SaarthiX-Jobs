/**
 * Configuration for external service redirects
 * Handles both development and production environments
 */

// Get the base URL for the current environment
const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  const basename = window.__JOBS_BASENAME__ || '/';
  return basename.replace(/\/$/, '');
};

/**
 * Get the SomethingX (main platform) URL
 */
export const getSomethingXUrl = () => {
  const basename = getBaseUrl();
  // Remove /jobs from the base URL to get SomethingX URL
  if (basename.includes('/jobs')) {
    return basename.replace('/jobs', '');
  }
  // If no basename, assume root
  return basename || '/';
};

/**
 * Get the Profiling service URL
 */
export const getProfilingUrl = () => {
  const basename = getBaseUrl();
  if (basename.includes('/jobs')) {
    return basename.replace('/jobs', '/profiling');
  }
  return `${basename}/profiling`;
};

/**
 * Build a redirect URL with authentication parameters
 * @param {string} baseUrl - Base URL to redirect to
 * @param {string} route - Route path (e.g., '/students/job-blueprint', '/about-us')
 * @param {string} token - Authentication token
 * @param {object} user - User object with email, name, userType
 * @returns {string} Complete URL with query parameters
 */
export const buildRedirectUrl = (baseUrl, route = '', token, user) => {
  // Ensure baseUrl doesn't end with / and route starts with /
  let fullPath = baseUrl.replace(/\/$/, '');
  if (route) {
    fullPath += route.startsWith('/') ? route : `/${route}`;
  }

  // Build URL with query parameters
  const url = new URL(fullPath, window.location.origin);

  if (token) {
    url.searchParams.set('token', token);
  }

  if (user?.email) {
    url.searchParams.set('email', user.email);
  }

  if (user?.name) {
    url.searchParams.set('name', user.name);
  }

  if (user?.userType) {
    url.searchParams.set('userType', user.userType);
  }

  return url.toString();
};

/**
 * Redirect to SomethingX (main platform) with specific route
 * @param {string} route - Route path (e.g., '/students/job-blueprint', '/about-us')
 * @param {string} token - Authentication token (optional, from SomethingX)
 * @param {object} user - User object (optional)
 */
export const redirectToSomethingX = (route = '', token, user) => {
  try {
    // Get token from localStorage if not provided
    const somethingxToken = token || localStorage.getItem('somethingx_auth_token');
    const somethingxUserStr = localStorage.getItem('somethingx_auth_user');
    const somethingxUser = user || (somethingxUserStr ? JSON.parse(somethingxUserStr) : null);

    // Build the redirect URL
    const somethingxUrl = getSomethingXUrl();
    const redirectUrl = buildRedirectUrl(somethingxUrl, route, somethingxToken, somethingxUser);

    // Redirect
    window.location.href = redirectUrl;
  } catch (error) {
    console.error('Failed to redirect to SomethingX:', error);
    // Still redirect even if there's an error
    const somethingxUrl = getSomethingXUrl();
    const routePath = route ? `${somethingxUrl}${route.startsWith('/') ? route : `/${route}`}` : somethingxUrl;
    window.location.href = routePath;
  }
};

/**
 * Redirect to Profiling service with authentication
 * @param {string} token - Authentication token
 * @param {object} user - User object
 */
export const redirectToProfiling = (token, user) => {
  try {
    // Get token from localStorage if not provided
    const somethingxToken = token || localStorage.getItem('somethingx_auth_token');
    const somethingxUserStr = localStorage.getItem('somethingx_auth_user');
    const somethingxUser = user || (somethingxUserStr ? JSON.parse(somethingxUserStr) : null);

    // Build the redirect URL
    const profilingUrl = getProfilingUrl();
    const redirectUrl = buildRedirectUrl(profilingUrl, '', somethingxToken, somethingxUser);

    // Redirect
    window.location.href = redirectUrl;
  } catch (error) {
    console.error('Failed to redirect to Profiling:', error);
    // Still redirect even if there's an error
    const profilingUrl = getProfilingUrl();
    window.location.href = profilingUrl;
  }
};
