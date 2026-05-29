import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unwrap } from '../../../../utils/safeQuery';
import { wasteService } from '../../../../services/wasteService';
import { invalidateAfterWasteMutation } from '../../../../utils/invalidation';

export function useDeleteWasteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => unwrap(wasteService.deleteWaste(id)),
    onSuccess: (_, variables) => {
      invalidateAfterWasteMutation(queryClient, variables.branchId);
    },
  });
}
