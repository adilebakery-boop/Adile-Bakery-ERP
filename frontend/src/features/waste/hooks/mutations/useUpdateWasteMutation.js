import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { wasteService } from '../../../../services/wasteService';

export function useUpdateWasteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => unwrap(wasteService.updateWaste(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waste.all });
    },
  });
}
