import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const productionService = {
  getProductionsGrouped: async (params = {}) => {
    return safeCall(api.get('/productions/grouped', { params }));
  },

  createProduction: async (data) => {
    return safeCall(api.post('/productions', data));
  },

  updateProduction: async (id, data) => {
    return safeCall(api.put(`/productions/${id}`, data));
  },

  deleteProduction: async (id) => {
    return safeCall(api.delete(`/productions/${id}`));
  },
};

export default productionService;