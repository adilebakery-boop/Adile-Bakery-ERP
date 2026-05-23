import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { productService } from '../../../../services/productService';

export function useProductByIdQuery(id) {
  return useQuery({
    queryKey: queryKeys.products.byId(id),
    queryFn: async () => {
      const result = await productService.getProduct(id);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    staleTime: 15 * 1000,
    enabled: !!id,
  });
}
