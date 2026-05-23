import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { productService } from '../../../../services/productService';

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => unwrap(productService.createProduct(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.categories() });
    },
  });
}
