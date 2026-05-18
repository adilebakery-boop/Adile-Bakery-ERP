import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const dashboardService = {
  getToday: async (operationalDate, params = {}) => {
    return safeCall(api.get('/dashboard/today', { params: { operationalDate, ...params } }));
  },

  getOverview: async (branchId, operationalDate) => {
    return safeCall(api.get('/dashboard/overview', {
      params: { branchId, operationalDate },
    }));
  },

  getBranchesStatus: async (operationalDate) => {
    return safeCall(api.get('/dashboard/branches-status', {
      params: { operationalDate },
    }));
  },

  getRecentActivity: async (branchId, limit = 10) => {
    return safeCall(api.get('/dashboard/recent-activity', {
      params: { branchId, limit },
    }));
  },
};

export default dashboardService;