import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const remainingService = {
  getRemainings: async (params = {}) => {
    return safeCall(api.get('/remainings', { params }));
  },

  getByOperationalDate: async (operationalDate, params = {}) => {
    return safeCall(api.get(`/remainings/by-date/${operationalDate}`, { params }));
  },

  getDrafts: async (params = {}) => {
    return safeCall(api.get('/remainings/drafts', { params }));
  },

  getPending: async (params = {}) => {
    return safeCall(api.get('/remainings/pending', { params }));
  },

  saveRemaining: async (data) => {
    return safeCall(api.post('/remainings', data));
  },

  saveBulk: async (data) => {
    return safeCall(api.post('/remainings/bulk', data));
  },

  updateRemaining: async (id, data) => {
    return safeCall(api.put(`/remainings/${id}`, data));
  },

  markFinal: async (id) => {
    return safeCall(api.put(`/remainings/${id}`, { status: 'FINAL' }));
  },

  deleteRemaining: async (id) => {
    return safeCall(api.delete(`/remainings/${id}`));
  },
};

export default remainingService;