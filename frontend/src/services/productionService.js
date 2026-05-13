import api, { handleApiError } from './api';

export const productionService = {
  getProductions: async (params = {}) => {
    try {
      const response = await api.get('/production', { params });
      return { success: true, data: response.data.data, pagination: response.data.pagination };
    } catch (error) {
      return handleApiError(error);
    }
  },

  createProduction: async (data) => {
    try {
      const response = await api.post('/production', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateProduction: async (id, data) => {
    try {
      const response = await api.put(`/production/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteProduction: async (id) => {
    try {
      const response = await api.delete(`/production/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getProductionById: async (id) => {
    try {
      const response = await api.get(`/production/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default productionService;