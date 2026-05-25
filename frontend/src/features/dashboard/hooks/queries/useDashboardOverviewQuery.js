import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { dashboardService } from '../../../../services/dashboardService';

export function useDashboardOverviewQuery(branchId, date) {
  return useQuery({
    queryKey: queryKeys.dashboard.overview(branchId, date),
    queryFn: async () => {
      const result = await dashboardService.getOverview(branchId, date);
      if (!result.success) throw new Error(result.message || 'Failed to load dashboard overview');
      const data = result.data || {};
      return {
        production: data.totalProduction || 0,
        sales: data.totalEstimatedSold || 0,
        remaining: data.totalRemaining || 0,
        pendingDrafts: data.pendingDrafts || 0,
        pendingDraftsBranches: data.pendingDraftsBranches || [],
        isAllBranches: data.isAllBranches || false,
        branches: data.branches || [],
        allFinalized: data.allFinalized !== undefined ? data.allFinalized : (data.pendingDrafts === 0),
      };
    },
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
    enabled: !!date,
  });
}
