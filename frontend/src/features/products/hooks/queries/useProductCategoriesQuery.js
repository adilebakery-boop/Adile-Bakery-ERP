import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { productService } from '../../../../services/productService';

export function useProductCategoriesQuery(filters = {}) {
  return useQuery({
    queryKey: queryKeys.products.categories(filters),
    queryFn: async () => {
      const result = await productService.getCategories();
      if (!result.success) throw new Error(result.message);
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
