import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { productionService } from '../../../../services/productionService';

export function useProductionEntriesQuery(branchId, filters = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.production.grouped(branchId, filters),
    queryFn: async () => {
      const params = { ...filters };
      if (branchId && branchId !== 'all') {
        params.branchId = branchId;
      }
      const result = await productionService.getProductionsGrouped(params);
      if (!result.success) {
        const err = new Error(result.message || 'Failed to load production entries');
        err.status = result.status || 0;
        throw err;
      }
      return {
        data: result.data || [],
        pagination: result.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
      };
    },
    staleTime: 10 * 1000,
    refetchInterval: false,
  });
}
