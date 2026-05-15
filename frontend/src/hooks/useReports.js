import { useState, useCallback } from 'react';
import reportService from '../services/reportService';

export default function useReports() {
  const [productionData, setProductionData] = useState([]);
  const [remainingData, setRemainingData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProductionReport = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    const result = await reportService.getProductionReport(params);
    if (result.success) {
      setProductionData(result.data);
    } else {
      setError(result.message);
    }
    setLoading(false);
    return result;
  }, []);

  const fetchRemainingReport = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    const result = await reportService.getRemainingReport(params);
    if (result.success) {
      setRemainingData(result.data);
    } else {
      setError(result.message);
    }
    setLoading(false);
    return result;
  }, []);

  const fetchSalesSummary = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    const result = await reportService.getSalesSummary(params);
    if (result.success) {
      setSalesData(result.data);
    } else {
      setError(result.message);
    }
    setLoading(false);
    return result;
  }, []);

  return {
    productionData,
    remainingData,
    salesData,
    loading,
    error,
    fetchProductionReport,
    fetchRemainingReport,
    fetchSalesSummary,
  };
}