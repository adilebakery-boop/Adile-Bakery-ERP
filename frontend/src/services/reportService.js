import api, { handleApiError } from './api';

export const reportService = {
  getInventoryFlowReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/inventory-flow', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getDailyReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/daily', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getWeeklyReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/weekly', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getMonthlyReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/monthly', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  exportToCSV: async (params = {}) => {
    try {
      const response = await api.get('/reports/export', {
        params,
        responseType: 'blob',
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default reportService;