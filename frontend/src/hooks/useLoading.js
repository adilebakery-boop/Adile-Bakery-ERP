import { useState, useCallback } from 'react';

export function useLoading(initialState = false) {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState(null);

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const setLoadingError = useCallback((err) => {
    setLoading(false);
    setError(err);
  }, []);

  const reset = useCallback(() => {
    setLoading(initialState);
    setError(null);
  }, [initialState]);

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    reset,
    setLoading,
  };
}

export function useMultiLoading(initialState = {}) {
  const [loadingStates, setLoadingStates] = useState(initialState);
  const [errors, setErrors] = useState({});

  const setLoading = useCallback((key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
    if (value) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  }, []);

  const setError = useCallback((key, error) => {
    setLoadingStates(prev => ({ ...prev, [key]: false }));
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  const isLoading = useCallback((key) => {
    if (key) return loadingStates[key] || false;
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  const getError = useCallback((key) => {
    return errors[key] || null;
  }, [errors]);

  const resetAll = useCallback(() => {
    setLoadingStates(initialState);
    setErrors({});
  }, [initialState]);

  return {
    loadingStates,
    setLoading,
    setError,
    isLoading,
    getError,
    resetAll,
  };
}

export default useLoading;