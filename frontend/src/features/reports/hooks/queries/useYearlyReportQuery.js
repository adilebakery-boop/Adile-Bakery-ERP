import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { reportService } from '../../../../services/reportService';

export function useYearlyReportQuery(branchId, date, filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.reports.yearly(branchId, date, filters),
    queryFn: async () => {
      const params = { operationalDate: date, ...filters };
      if (branchId) params.branchId = branchId;
      const result = await reportService.getYearlyReport(params);
      if (!result.success) throw new Error(result.message || 'Failed to load yearly report');
      return result.data || {};
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
    enabled: !!date,
    ...options,
  });
}
