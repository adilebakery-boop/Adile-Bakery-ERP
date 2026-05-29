import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '../../../../utils/safeQuery';
import { wasteService } from '../../../../services/wasteService';
import { invalidateAfterWasteMutation } from '../../../../utils/invalidation';

export function useUpdateWasteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => unwrap(wasteService.updateWaste(id, data)),
    onSuccess: (_, variables) => {
      invalidateAfterWasteMutation(queryClient, variables.branchId);
    },
  });
}
