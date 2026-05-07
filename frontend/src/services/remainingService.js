import api, { handleApiError } from './api';

export const remainingService = {
  getRemainings: async (params = {}) => {
    try {
      const response = await api.get('/remainings', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getTodayRemainings: async (params = {}) => {
    try {
      const response = await api.get('/remainings/today', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  saveRemainings: async (data) => {
    try {
      const response = await api.post('/remainings', data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateRemaining: async (id, data) => {
    try {
      const response = await api.put(`/remainings/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getRemainingsByDate: async (date, params = {}) => {
    try {
      const response = await api.get(`/remainings/date/${date}`, { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getPendingRemainings: async () => {
    try {
      const response = await api.get('/remainings/pending');
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default remainingService;