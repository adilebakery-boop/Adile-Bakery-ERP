import api, { handleApiError } from './api';

export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, role, ...user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      return { success: true, data: { token, role, user } };
    } catch (error) {
      return handleApiError(error);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      return { success: true };
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      return { success: true };
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
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