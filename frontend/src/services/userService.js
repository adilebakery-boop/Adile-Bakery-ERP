import api, { handleApiError } from './api';

export const userService = {
  getUsers: async (params = {}) => {
    try {
      const response = await api.get('/users', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getUser: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  createUser: async (data) => {
    try {
      const response = await api.post('/users', data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateUser: async (id, data) => {
    try {
      const response = await api.put(`/users/${id}`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateUserStatus: async (id, status) => {
    try {
      const response = await api.patch(`/users/${id}/status`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getStaffUsers: async (params = {}) => {
    try {
      const response = await api.get('/users/staff', { params });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  assignBranch: async (userId, branchId) => {
    try {
      const response = await api.post(`/users/${userId}/assign-branch`, { branchId });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default userService;