import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { wasteService } from '../../../../services/wasteService';

export function useDeleteWasteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => unwrap(wasteService.deleteWaste(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waste.all });
    },
  });
}
