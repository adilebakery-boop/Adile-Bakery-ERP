import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const closureService = {
  getStatus: async (operationalDate) => {
    return safeCall(api.get('/closures/status', { params: { operationalDate } }));
  },

  validate: async (operationalDate) => {
    return safeCall(api.get('/closures/validate', { params: { operationalDate } }));
  },

  closeDay: async (operationalDate) => {
    return safeCall(api.post('/closures/close', { operationalDate }));
  },

  reopenDay: async (operationalDate, reason) => {
    return safeCall(api.post('/closures/reopen', { operationalDate, reason }));
  },
};

export default closureService;