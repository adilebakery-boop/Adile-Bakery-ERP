import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { reportService } from '../../../../services/reportService';

export function useWeeklyReportQuery(branchId, date, filters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.weekly(branchId, date, filters),
    queryFn: async () => {
      const params = { operationalDate: date, ...filters };
      if (branchId) params.branchId = branchId;
      const result = await reportService.getWeeklyReport(params);
      if (!result.success) throw new Error(result.message || 'Failed to load weekly report');
      return result.data || {};
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
    enabled: !!date,
  });
}
