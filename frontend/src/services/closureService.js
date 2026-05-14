import api, { handleApiError } from './api';

export const closureService = {
  getStatus: async (operationalDate) => {
    try {
      const response = await api.get('/closures/status', { params: { operationalDate } });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  validate: async (operationalDate) => {
    try {
      const response = await api.get('/closures/validate', { params: { operationalDate } });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  closeDay: async (operationalDate) => {
    try {
      const response = await api.post('/closures/close', { operationalDate });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  reopenDay: async (operationalDate, reason) => {
    try {
      const response = await api.post('/closures/reopen', { operationalDate, reason });
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default closureService;