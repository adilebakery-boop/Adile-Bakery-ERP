import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '../../../../utils/safeQuery';
import { wasteService } from '../../../../services/wasteService';
import { invalidateAfterWasteMutation } from '../../../../utils/invalidation';

export function useCreateWasteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => unwrap(wasteService.createWaste(data)),
    onSuccess: (_, variables) => {
      invalidateAfterWasteMutation(queryClient, variables.branchId);
    },
  });
}
