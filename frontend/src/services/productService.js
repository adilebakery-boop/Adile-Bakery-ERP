import api from './api';
import { safeCall } from '../utils/normalizeApiResponse';

export const productService = {
  getProducts: async (params = {}) => {
    return safeCall(api.get('/products', { params }));
  },

  getProduct: async (id) => {
    return safeCall(api.get(`/products/${id}`));
  },

  createProduct: async (data) => {
    return safeCall(api.post('/products', data));
  },

  updateProduct: async (id, data) => {
    return safeCall(api.put(`/products/${id}`, data));
  },

  deleteProduct: async (id) => {
    return safeCall(api.delete(`/products/${id}`));
  },

  getCategories: async () => {
    return safeCall(api.get('/products/categories'));
  },
};

export default productService;