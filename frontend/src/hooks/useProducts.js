import { useState, useCallback } from 'react';
import { productService } from '../services/productService';

export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const fetchProducts = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    const result = await productService.getProducts(params);
    if (result.success) {
      setProducts(result.data?.data || result.data || []);
      if (result.pagination) {
        setPagination({
          page: parseInt(result.pagination.page) || 1,
          limit: parseInt(result.pagination.limit) || 10,
          total: parseInt(result.pagination.total) || 0,
          totalPages: parseInt(result.pagination.totalPages) || 0,
        });
      }
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const result = await productService.getCategories();
    if (result.success) {
      setCategories(result.data);
    }
    return result;
  }, []);

  const addProduct = useCallback(async (data) => {
    const result = await productService.createProduct(data);
    if (result.success) {
      await fetchProducts();
    }
    return result;
  }, [fetchProducts]);

  const editProduct = useCallback(async (id, data) => {
    const result = await productService.updateProduct(id, data);
    if (result.success) {
      await fetchProducts();
    }
    return result;
  }, [fetchProducts]);

  const removeProduct = useCallback(async (id) => {
    const result = await productService.deleteProduct(id);
    if (result.success) {
      await fetchProducts();
    }
    return result;
  }, [fetchProducts]);

  const restoreProduct = useCallback(async (id) => {
    const result = await productService.restoreProduct(id);
    if (result.success) {
      await fetchProducts();
    }
    return result;
  }, [fetchProducts]);

  return {
    products,
    categories,
    loading,
    error,
    pagination,
    fetchProducts,
    fetchCategories,
    addProduct,
    editProduct,
    removeProduct,
    restoreProduct,
  };
}