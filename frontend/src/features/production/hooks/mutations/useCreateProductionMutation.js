import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '../../../../utils/safeQuery';
import { productionService } from '../../../../services/productionService';
import { invalidateAfterProductionMutation } from '../../../../utils/invalidation';

export function useCreateProductionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => unwrap(productionService.createProduction(data)),
    onSuccess: (_, variables) => {
      invalidateAfterProductionMutation(queryClient, variables.branchId);
    },
  });
}
