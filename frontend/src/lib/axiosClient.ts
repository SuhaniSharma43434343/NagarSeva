import { BACKEND_URL } from "./backendUrl";
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: BACKEND_URL,
    timeout: 150000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        let token = localStorage.getItem('authToken');
        if (token) {
            if (token.startsWith('"') && token.endsWith('"')) {
                token = token.slice(1, -1);
            }
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/login');
        if (error.response?.status === 401 && !isLoginRequest) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
