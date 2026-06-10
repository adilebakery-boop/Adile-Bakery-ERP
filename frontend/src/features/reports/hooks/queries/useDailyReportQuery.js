import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { reportService } from '../../../../services/reportService';

export function useDailyReportQuery(branchId, date, filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.daily(branchId, date, filters),
    queryFn: async () => {
      const params = { operationalDate: date, ...filters };
      if (branchId) params.branchId = branchId;
      const result = await reportService.getDailyReport(params);
      if (!result.success) throw new Error(result.message || 'Failed to load daily report');
      return result.data || {};
    },
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    enabled: !!date,
    ...options,
  });
}
