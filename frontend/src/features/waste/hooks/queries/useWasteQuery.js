import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { wasteService } from '../../../../services/wasteService';

export function useWasteQuery(filters = {}) {
  return useQuery({
    queryKey: queryKeys.waste.list(filters),
    queryFn: async () => {
      const result = await wasteService.getWastes(filters);
      if (!result.success) throw new Error(result.message);
      return {
        data: result.data?.data || result.data || [],
        pagination: result.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
