import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';
import { setAuth, clearAuth, getRefreshToken } from '../utils/authUtils';

export const authService = {
  login: async (credentials) => {
    const response = await safeCall(api.post('/auth/login', credentials));
    if (response.success && response.data) {
      const { token, refreshToken, user } = response.data;
      setAuth(token, user, user.role, refreshToken);
    }
    return response;
  },

  refreshToken: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    const response = await safeCall(api.post('/auth/refresh', { refreshToken }));
    if (response.success && response.data) {
      const { token, refreshToken: newRefresh, user } = response.data;
      setAuth(token, user, user.role, newRefresh);
      return token;
    }
    return null;
  },

  logout: async () => {
    await safeCall(api.post('/auth/logout'));
    clearAuth();
    return { success: true };
  },

  getCurrentUser: async () => {
    return safeCall(api.get('/auth/me'));
  },

  changePassword: async (data) => {
    return safeCall(api.put('/auth/change-password', data));
  },

  forgotPassword: async (email) => {
    return safeCall(api.post('/auth/forgot-password', { email }));
  },

  verifyOtp: async (email, otp) => {
    return safeCall(api.post('/auth/verify-otp', { email, otp }));
  },

  resetPassword: async (email, otp, newPassword) => {
    return safeCall(api.post('/auth/reset-password', { email, otp, newPassword }));
  },
};

export default authService;