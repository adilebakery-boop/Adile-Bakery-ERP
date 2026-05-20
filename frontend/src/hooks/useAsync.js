import { useState, useCallback, useRef } from 'react';
import { formatError, logError } from '../utils/errorHandler';

export function useAsync(initialState = { data: null, loading: false, error: null }) {
  const [state, setState] = useState(initialState);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (asyncFunction, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      skipErrorFormat = false,
      showLoading = true,
    } = options;

    if (showLoading) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const result = await asyncFunction();
      
      const formattedResult = skipErrorFormat 
        ? result 
        : (result.success !== false ? { success: true, data: result } : result);

      setState({
        data: formattedResult.data || formattedResult,
        loading: false,
        error: formattedResult.success === false ? formattedResult : null,
      });

      if (formattedResult.success === false) {
        onError?.(formattedResult);
      } else {
        onSuccess?.(formattedResult);
      }

      return formattedResult;
    } catch (error) {
      const formattedError = formatError(error);
      logError('useAsync', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: formattedError,
      }));

      onError?.(formattedError);
      return formattedError;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  const setLoading = useCallback((loading) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setLoading,
    setError,
  };
}

export function useAsyncCallback(callback, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (...args) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await callback(...args);
      setLoading(false);
      return result;
    } catch (err) {
      const formattedError = formatError(err);
      setError(formattedError);
      setLoading(false);
      options.onError?.(formattedError);
      return formattedError;
    }
  }, [callback, options]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    loading,
    error,
    execute,
    abort,
    setLoading,
    setError,
  };
}