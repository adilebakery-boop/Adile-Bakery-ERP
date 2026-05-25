import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '../../../../utils/safeQuery';
import { remainingService } from '../../../../services/remainingService';
import { invalidateAfterRemainingMutation } from '../../../../utils/invalidation';

export function useFinalizeRemainingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => unwrap(remainingService.saveBulk({
      ...data,
      items: data.items.map(item => ({ ...item, status: 'FINAL' })),
    })),
    onSuccess: (_, variables) => {
      invalidateAfterRemainingMutation(queryClient, variables.branchId, variables.operationalDate);
    },
  });
}
