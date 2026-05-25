import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { productionService } from '../../../../services/productionService';
import { invalidateAfterProductionMutation } from '../../../../utils/invalidation';

export function useCreateProductionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => unwrap(productionService.createProduction(data)),
    onSuccess: (_, variables) => {
      const branchId = variables.branchId;
      invalidateAfterProductionMutation(queryClient, branchId);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'inventory' && key[1] === 'production' && key[2] === 'all';
        },
      });
    },
  });
}
