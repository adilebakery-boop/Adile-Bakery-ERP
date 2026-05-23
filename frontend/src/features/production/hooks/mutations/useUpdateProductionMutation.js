import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { productionService } from '../../../../services/productionService';
import { invalidateAfterProductionMutation } from '../../../../utils/invalidation';

export function useUpdateProductionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, branchId }) => unwrap(productionService.updateProduction(id, data)),
    onSuccess: (_, variables) => {
      invalidateAfterProductionMutation(queryClient, variables.branchId);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key[0] === 'inventory' && key[1] === 'production' && key[2] === 'all';
        },
      });
    },
  });
}
