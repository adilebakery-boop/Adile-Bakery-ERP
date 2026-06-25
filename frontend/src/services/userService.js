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

  getDeactivatedUsers: async () => {
    return safeCall(api.get('/users/deactivated'));
  },

  restoreUser: async (id) => {
    return safeCall(api.put(`/users/${id}/restore`));
  },
};

export default userService;