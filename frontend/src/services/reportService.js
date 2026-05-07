import api, { handleApiError } from './api';

export const reportService = {
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

  getReportByDateRange: async (startDate, endDate, params = {}) => {
    try {
      const response = await api.get('/reports/range', {
        params: { startDate, endDate, ...params },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getBranchReport: async (branchId, params = {}) => {
    try {
      const response = await api.get(`/reports/branch/${branchId}`, { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  exportReport: async (type, params = {}) => {
    try {
      const response = await api.get(`/reports/export/${type}`, {
        params,
        responseType: 'blob',
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getSalesReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/sales', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getProductionReport: async (params = {}) => {
    try {
      const response = await api.get('/reports/production', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default reportService;