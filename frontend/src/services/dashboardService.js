import api, { handleApiError } from './api';

export const dashboardService = {
  getToday: async (operationalDate, params = {}) => {
    try {
      const response = await api.get('/dashboard/today', { params: { operationalDate, ...params } });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getOverview: async (branchId, operationalDate) => {
    try {
      const response = await api.get('/dashboard/overview', {
        params: { branchId, operationalDate },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getBranchesStatus: async (operationalDate) => {
    try {
      const response = await api.get('/dashboard/branches-status', {
        params: { operationalDate },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getRecentActivity: async (branchId, limit = 10) => {
    try {
      const response = await api.get('/dashboard/recent-activity', {
        params: { branchId, limit },
      });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default dashboardService;