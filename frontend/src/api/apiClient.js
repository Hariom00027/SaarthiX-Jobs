import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const getRuntimeApiBaseUrl = () => {
    if (typeof window === 'undefined' || !window.location) {
        return API_BASE_URL;
    }

    const host = window.location.hostname;
    const port = window.location.port;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (isLocalHost && port === '3500') {
        return `${window.location.origin}/jobs-api`;
    }

    if (isLocalHost && (port === '' || port === '80' || port === '3000')) {
        return 'http://localhost:3500/jobs-api';
    }

    if (isLocalHost && port === '5173') {
        return 'http://localhost:2000/jobs-api';
    }

    return API_BASE_URL;
};

const getApiBaseCandidates = () => {
    const candidates = [];
    const pushUnique = (value) => {
        if (value && !candidates.includes(value)) {
            candidates.push(value);
        }
    };

    pushUnique(getRuntimeApiBaseUrl());

    if (typeof window !== 'undefined' && window.location) {
        pushUnique(`${window.location.origin}/jobs-api`);
    }

    // Common local fallbacks for cases where window origin or port is wrong.
    pushUnique('http://localhost:3500/jobs-api');
    pushUnique('http://127.0.0.1:3500/jobs-api');
    pushUnique('http://localhost:2000/jobs-api');
    pushUnique('http://127.0.0.1:2000/jobs-api');
    pushUnique(API_BASE_URL);

    return candidates;
};

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

// Request interceptor to add JWT token to all requests
apiClient.interceptors.request.use(
    (config) => {
        // Use runtime base URL for normal requests. For retry attempts, preserve
        // the explicitly assigned fallback base URL.
        if (!config.__preserveRetryBaseUrl) {
            const runtimeBaseUrl = getRuntimeApiBaseUrl();
            config.baseURL = runtimeBaseUrl;
        }

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestConfig = error.config || {};

        // Recover from transient/misrouted local network failures by trying
        // alternate local base URLs before giving up.
        if (!error.response && requestConfig && !requestConfig.__baseUrlRetryExhausted) {
            const candidates = getApiBaseCandidates();
            const currentBaseUrl = requestConfig.baseURL || getRuntimeApiBaseUrl();
            let currentIndex = requestConfig.__baseUrlCurrentIndex;

            if (typeof currentIndex !== 'number') {
                currentIndex = candidates.indexOf(currentBaseUrl);
                if (currentIndex < 0) {
                    currentIndex = 0;
                }
            }

            const nextIndex = currentIndex + 1;

            if (nextIndex < candidates.length) {
                requestConfig.baseURL = candidates[nextIndex];
                requestConfig.__baseUrlCurrentIndex = nextIndex;
                requestConfig.__preserveRetryBaseUrl = true;
                return apiClient.request(requestConfig);
            }

            requestConfig.__baseUrlRetryExhausted = true;
        }

        if (error.response?.status === 401) {
            const requestUrl = requestConfig.url || '';
            // Avoid global logout on arbitrary 401s (role-protected endpoints can return 401/403).
            // Only clear token when the auth bootstrap endpoint itself rejects it.
            const isAuthBootstrap = requestUrl.includes('/auth/me');
            if (isAuthBootstrap) {
                localStorage.removeItem('token');
                console.warn('Authentication expired. Please log in again.');
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
