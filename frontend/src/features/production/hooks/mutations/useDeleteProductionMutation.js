import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '../../../../utils/safeQuery';
import { productionService } from '../../../../services/productionService';
import { invalidateAfterProductionMutation } from '../../../../utils/invalidation';

export function useDeleteProductionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => unwrap(productionService.deleteProduction(id)),
    onSuccess: (_, variables) => {
      invalidateAfterProductionMutation(queryClient, variables.branchId);
    },
  });
}
