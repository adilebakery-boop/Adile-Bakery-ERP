import api, { handleApiError } from './api';

export const productionService = {
  getProductions: async (params = {}) => {
    try {
      const response = await api.get('/productions', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getTodayProductions: async (params = {}) => {
    try {
      const response = await api.get('/productions/today', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  createProduction: async (data) => {
    try {
      const response = await api.post('/productions', data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateProduction: async (id, data) => {
    try {
      const response = await api.put(`/productions/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteProduction: async (id) => {
    try {
      const response = await api.delete(`/productions/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getProductionByDate: async (date, params = {}) => {
    try {
      const response = await api.get(`/productions/date/${date}`, { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getProductionSummary: async (params = {}) => {
    try {
      const response = await api.get('/productions/summary', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default productionService;