import api, { handleApiError } from './api';

export const reportService = {
  getDailyReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/daily', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getWeeklyReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/weekly', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getMonthlyReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/monthly', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getProductionReport: async (params = {}) => {
    try {
      const response = await api.get('/productions', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getProductionByDate: async (operationalDate) => {
    try {
      const response = await api.get(`/productions/by-date/${operationalDate}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getTodayProduction: async () => {
    try {
      const response = await api.get('/productions/today');
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getRemainingReport: async (params = {}) => {
    try {
      const response = await api.get('/remainings', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getRemainingByDate: async (operationalDate) => {
    try {
      const response = await api.get(`/remainings/by-date/${operationalDate}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getSalesSummary: async (params = {}) => {
    try {
      const response = await api.get('/sales', { params });
      return { success: true, data: response.data.data };
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