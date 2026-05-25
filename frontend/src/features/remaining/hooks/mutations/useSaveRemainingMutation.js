import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { remainingService } from '../../../../services/remainingService';
import { invalidateAfterRemainingMutation } from '../../../../utils/invalidation';

export function useSaveRemainingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => unwrap(remainingService.saveBulk(data)),
    onSuccess: (_, variables) => {
      invalidateAfterRemainingMutation(queryClient, variables.branchId, variables.operationalDate);
    },
  });
}
