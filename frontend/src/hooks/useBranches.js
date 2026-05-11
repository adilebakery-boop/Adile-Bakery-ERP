import { useState, useCallback } from 'react';
import { branchService } from '../services/branchService';

export default function useBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBranches = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    const result = await branchService.getBranches(params);
    if (result.success) {
      setBranches(result.data);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, []);

  const fetchActiveBranches = useCallback(async () => {
    const result = await branchService.getActiveBranches();
    if (result.success) {
      return result.data;
    }
    return [];
  }, []);

  const addBranch = useCallback(async (data) => {
    const result = await branchService.createBranch(data);
    if (result.success) {
      await fetchBranches();
    }
    return result;
  }, [fetchBranches]);

  const editBranch = useCallback(async (id, data) => {
    const result = await branchService.updateBranch(id, data);
    if (result.success) {
      await fetchBranches();
    }
    return result;
  }, [fetchBranches]);

  const removeBranch = useCallback(async (id) => {
    const result = await branchService.deleteBranch(id);
    if (result.success) {
      await fetchBranches();
    }
    return result;
  }, [fetchBranches]);

  return {
    branches,
    loading,
    error,
    fetchBranches,
    fetchActiveBranches,
    addBranch,
    editBranch,
    removeBranch,
  };
}