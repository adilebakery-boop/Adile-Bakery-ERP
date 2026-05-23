import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { closureService } from '../../../../services/closureService';

export function useClosureStatusQuery(date, options = {}) {
  return useQuery({
    queryKey: queryKeys.closure.status(date),
    queryFn: async () => {
      const result = await closureService.getStatus(date);
      if (!result.success) throw new Error(result.message || 'Failed to load closure status');
      return {
        isClosed: result.data?.isClosed || false,
        operationalDate: date,
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: false,
    ...options,
  });
}
