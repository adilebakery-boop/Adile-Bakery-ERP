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

  updateSent: async (id, data) => {
    return safeCall(api.put(`/transfers/${id}/sent`, data));
  },

  updateReceived: async (id, data) => {
    return safeCall(api.put(`/transfers/${id}/received`, data));
  },

  returnProducts: async (id, data) => {
    return safeCall(api.put(`/transfers/${id}/return`, data));
  },

  resolveDispute: async (id, data) => {
    return safeCall(api.put(`/transfers/${id}/resolve`, data));
  },
};

export default transferService;
