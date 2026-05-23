import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { closureService } from '../../../../services/closureService';

export function useCloseDayMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date) => {
      const validateRes = await closureService.validate(date);
      if (!validateRes.success) {
        throw new Error(validateRes.message || 'Pre-validation failed');
      }
      const result = await closureService.closeDay(date);
      if (!result.success) {
        throw new Error(result.message || 'Failed to close day');
      }
      return result.data;
    },
    onSuccess: (_, date) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.closure.status(date) });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'alerts'] });
    },
  });
}
