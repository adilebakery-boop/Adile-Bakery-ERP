import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { productService } from '../../../../services/productService';

export function useRestoreProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => unwrap(productService.restoreProduct(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.deleted() });
    },
  });
}
