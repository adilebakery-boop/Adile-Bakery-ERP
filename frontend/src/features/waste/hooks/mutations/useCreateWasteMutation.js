import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { wasteService } from '../../../../services/wasteService';

export function useCreateWasteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => unwrap(wasteService.createWaste(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waste.all });
    },
  });
}
