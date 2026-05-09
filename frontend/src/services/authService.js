import api, { handleApiError } from './api';
import { setAuth, clearAuth } from '../utils/authUtils';

export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data.data;
      
      setAuth(token, user, user.role);
      
      return { 
        success: true, 
        data: { 
          token, 
          user 
        } 
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with cleanup even if API fails
    } finally {
      clearAuth();
    }
    return { success: true };
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  changePassword: async (data) => {
    try {
      const response = await api.put('/auth/change-password', data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default authService;