import axios from 'axios';
import { getToken, getRefreshToken, clearAuth } from '../utils/authUtils';

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://adile-bakery-erp-production.up.railway.app/api',
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Only retry on transient infrastructure errors, NOT 500 (application error — retrying non-idempotent
// mutations with the same payload will produce the same result). GET requests already have React Query
// retry (2 attempts, exponential backoff), so axios-level retry is redundant for them too.
const retryableStatuses = [408, 502, 503, 504];

const shouldRetry = (error) => {
  if (!error.config) return false;
  if (error.config.__retryCount >= MAX_RETRIES) return false;
  if (error.response) {
    return retryableStatuses.includes(error.response.status);
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return true;
  }
  return false;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryRequest = async (error) => {
  const config = error.config;
  config.__retryCount = config.__retryCount || 0;
  config.__retryCount += 1;
  
  await delay(RETRY_DELAY * config.__retryCount);
  return api(config);
};

// Track retry attempts per request. Counter initialized on fresh requests only — retried requests
// preserve the value set by retryRequest() to prevent infinite retry loops.
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.__retryCount === undefined) {
      config.__retryCount = 0;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const refreshTokenCall = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');
  const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
  if (!data.success || !data.data) throw new Error('Refresh failed');
  const { token: newToken, refreshToken: newRefresh, user } = data.data;
  localStorage.setItem('token', newToken);
  localStorage.setItem('refreshToken', newRefresh);
  localStorage.setItem('user', JSON.stringify(user));
  if (user.role) localStorage.setItem('role', user.role);
  return newToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldRetry(error)) {
      try {
        return await retryRequest(error);
      } catch (retryError) {
        return Promise.reject(retryError);
      }
    }

    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest.__isRetry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest.__isRetry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshTokenCall();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      const message = error.response?.data?.message || '';
      if (message.toLowerCase().includes('blocked')) {
        clearAuth();
        alert('Your account has been blocked. Contact your manager.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const ERROR_MESSAGES = {
  0: 'Network error. Please check your connection.',
  400: 'Invalid request. Please check your input.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  422: 'Validation failed. Please check your input.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable.',
  503: 'Service temporarily unavailable.',
  504: 'Request timed out. Please try again.',
};

export const handleApiError = (error) => {
  if (error.response) {
    const status = error.response.status;
    return {
      success: false,
      message: error.response.data?.message || ERROR_MESSAGES[status] || 'An error occurred',
      errors: error.response.data?.errors || [],
      status,
      retryable: [408, 500, 502, 503, 504].includes(status),
    };
  }
  if (error.request) {
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        message: 'Request timed out. Please try again.',
        errors: [],
        status: 0,
        retryable: true,
      };
    }
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      errors: [],
      status: 0,
      retryable: true,
    };
  }
  return {
    success: false,
    message: error.message || 'An unexpected error occurred',
    errors: [],
    status: 0,
    retryable: false,
  };
};

export const createApiInstance = (options = {}) => {
  return axios.create({
    baseURL: options.baseURL || api.defaults.baseURL,
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403;
};

export const isRetryableError = (error) => {
  if (!error.response) return true;
  return [408, 500, 502, 503, 504].includes(error.response.status);
};

export default api;
