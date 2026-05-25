import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { dashboardService } from '../../../../services/dashboardService';

export function useDashboardActivityQuery(branchId, date, limit = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(branchId, date, limit),
    queryFn: async () => {
      const result = await dashboardService.getRecentActivity(branchId, date, limit);
      if (!result.success) throw new Error(result.message || 'Failed to load recent activity');
      return result.data || [];
    },
    staleTime: 15 * 1000,
    refetchInterval: 45 * 1000,
    enabled: !!date,
  });
}
