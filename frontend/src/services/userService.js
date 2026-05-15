import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const userService = {
  getUsers: async (params = {}) => {
    return safeCall(api.get('/users', { params }));
  },

  getUser: async (id) => {
    return safeCall(api.get(`/users/${id}`));
  },

  createUser: async (data) => {
    return safeCall(api.post('/users', data));
  },

  updateUser: async (id, data) => {
    return safeCall(api.put(`/users/${id}`, data));
  },

  deleteUser: async (id) => {
    return safeCall(api.delete(`/users/${id}`));
  },

  updateUserStatus: async (id, status) => {
    return safeCall(api.patch(`/users/${id}/status`, { status }));
  },

  getStaffUsers: async (params = {}) => {
    return safeCall(api.get('/users/staff', { params }));
  },

  assignBranch: async (userId, branchId) => {
    return safeCall(api.post(`/users/${userId}/assign-branch`, { branchId }));
  },
};

export default userService;