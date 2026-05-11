import api, { handleApiError } from './api';

export const branchService = {
  getBranches: async (params = {}) => {
    try {
      const response = await api.get('/branches', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getBranch: async (id) => {
    try {
      const response = await api.get(`/branches/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  createBranch: async (data) => {
    try {
      const response = await api.post('/branches', data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateBranch: async (id, data) => {
    try {
      const response = await api.put(`/branches/${id}`, data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteBranch: async (id) => {
    try {
      const response = await api.delete(`/branches/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getActiveBranches: async () => {
    try {
      const response = await api.get('/branches/active');
      return { success: true, data: response.data.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default branchService;