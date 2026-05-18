import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const dashboardService = {
  getToday: async (operationalDate, params = {}) => {
    return safeCall(api.get('/dashboard/today', { params: { operationalDate, ...params } }));
  },

  getOverview: async (branchId, operationalDate) => {
    const params = { operationalDate };
    if (branchId !== undefined && branchId !== null) {
      params.branchId = branchId;
    }
    return safeCall(api.get('/dashboard/overview', { params }));
  },

  getBranchesStatus: async (operationalDate) => {
    return safeCall(api.get('/dashboard/branches-status', {
      params: { operationalDate },
    }));
  },

  getRecentActivity: async (branchId, operationalDate, limit = 10) => {
    const params = { limit };
    if (operationalDate) {
      params.operationalDate = operationalDate;
    }
    if (branchId !== undefined && branchId !== null) {
      params.branchId = branchId;
    }
    return safeCall(api.get('/dashboard/recent-activity', { params }));
  },
};

export default dashboardService;