import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { productService } from '../../../../services/productService';

export function useProductsQuery(filters = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const result = await productService.getProducts(filters);
      if (!result.success) throw new Error(result.message);
      return {
        data: result.data?.data || result.data || [],
        pagination: result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
