import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { productService } from '../../../../services/productService';

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => unwrap(productService.updateProduct(id, data)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.byId(variables.id) });
    },
  });
}
