import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const reportService = {
  getInventoryFlowReport: async (params = {}) => {
    return safeCall(api.get('/reports/inventory-flow', { params }));
  },

  getDailyReport: async (params = {}) => {
    return safeCall(api.get('/reports/daily', { params }));
  },

  getWeeklyReport: async (params = {}) => {
    return safeCall(api.get('/reports/weekly', { params }));
  },

  getMonthlyReport: async (params = {}) => {
    return safeCall(api.get('/reports/monthly', { params }));
  },

  exportToCSV: async (params = {}) => {
    try {
      const response = await api.get('/reports/export', {
        params,
        responseType: 'blob',
      });
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response) {
        return { success: false, message: error.response.data?.message || 'Export failed', status: error.response.status };
      }
      return { success: false, message: error.message || 'Export failed' };
    }
  },
};

export default reportService;