import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { productService } from '../../../../services/productService';

export function useDeletedProductsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.products.deleted(filters),
    queryFn: async () => {
      const result = await productService.getDeletedProducts(filters);
      if (!result.success) throw new Error(result.message);
      return result.data?.data || result.data || [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}
