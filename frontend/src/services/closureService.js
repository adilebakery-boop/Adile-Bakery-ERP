import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';
import { getUserBranchId } from '../utils/authUtils';

export const closureService = {
  getStatus: async (operationalDate, branchId) => {
    return safeCall(api.get('/closures/status', { params: { branchId: branchId || getUserBranchId(), operationalDate } }));
  },

  validate: async (operationalDate, branchId) => {
    return safeCall(api.get('/closures/validate', { params: { branchId: branchId || getUserBranchId(), operationalDate } }));
  },

  closeDay: async (operationalDate, branchId) => {
    const effectiveBranchId = branchId || getUserBranchId();
    return safeCall(api.post('/closures/close', { branchId: effectiveBranchId, operationalDate }));
  },

  reopenDay: async (operationalDate, reason, branchId) => {
    const effectiveBranchId = branchId || getUserBranchId();
    return safeCall(api.post('/closures/reopen', { branchId: effectiveBranchId, operationalDate, reason }));
  },
};

export default closureService;