import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const transferService = {
  getTransfers: async (params = {}) => {
    return safeCall(api.get('/transfers', { params }));
  },

  getTransfer: async (id) => {
    return safeCall(api.get(`/transfers/${id}`));
  },

  createTransfer: async (data) => {
    return safeCall(api.post('/transfers', data));
  },

  updateReceived: async (id, data) => {
    return safeCall(api.put(`/transfers/${id}/received`, data));
  },
};

export default transferService;
