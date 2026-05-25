import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { remainingService } from '../../../../services/remainingService';

export function useRemainingEntriesQuery(branchId, date, filters = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.remaining.entries(branchId, date, filters),
    queryFn: async () => {
      const result = await remainingService.getByOperationalDate(date, { branchId, ...filters });
      if (!result.success) throw new Error(result.message || 'Failed to load remaining entries');
      return result.data || [];
    },
    staleTime: 10 * 1000,
    refetchInterval: false,
    enabled: !!branchId && !!date,
  });
}
