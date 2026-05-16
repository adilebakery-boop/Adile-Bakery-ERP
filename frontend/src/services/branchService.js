import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const branchService = {
  getBranches: async (params = {}) => {
    return safeCall(api.get('/branches', { params }));
  },

  getBranch: async (id) => {
    return safeCall(api.get(`/branches/${id}`));
  },

  createBranch: async (data) => {
    return safeCall(api.post('/branches', data));
  },

  updateBranch: async (id, data) => {
    return safeCall(api.put(`/branches/${id}`, data));
  },

  deleteBranch: async (id) => {
    return safeCall(api.delete(`/branches/${id}`));
  },

  getActiveBranches: async () => {
    return safeCall(api.get('/branches/active'));
  },
};

export default branchService;