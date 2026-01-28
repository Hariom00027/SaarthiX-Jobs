import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor to add JWT token to all requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
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
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('authToken');
            // Optionally redirect to login or show message
            console.warn('Authentication expired. Please log in again.');
        }
        return Promise.reject(error);
    }
);

export default apiClient;
