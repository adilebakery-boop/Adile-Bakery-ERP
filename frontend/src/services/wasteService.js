import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const wasteService = {
  getWastes: async (params = {}) => {
    return safeCall(api.get('/wastes', { params }));
  },

  getWaste: async (id) => {
    return safeCall(api.get(`/wastes/${id}`));
  },

  createWaste: async (data) => {
    return safeCall(api.post('/wastes', data));
  },

  updateWaste: async (id, data) => {
    return safeCall(api.put(`/wastes/${id}`, data));
  },

  deleteWaste: async (id) => {
    return safeCall(api.delete(`/wastes/${id}`));
  },
};

export default wasteService;
