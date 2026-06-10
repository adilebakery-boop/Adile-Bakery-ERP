import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { reportService } from '../../../../services/reportService';

export function useMonthlyReportQuery(branchId, date, filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.monthly(branchId, date, filters),
    queryFn: async () => {
      const params = { operationalDate: date, ...filters };
      if (branchId) params.branchId = branchId;
      const result = await reportService.getMonthlyReport(params);
      if (!result.success) throw new Error(result.message || 'Failed to load monthly report');
      return result.data || {};
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
    enabled: !!date,
    ...options,
  });
}
