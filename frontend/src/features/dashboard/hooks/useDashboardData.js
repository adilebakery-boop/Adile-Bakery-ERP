import { useDashboardOverviewQuery } from './queries/useDashboardOverviewQuery';
import { useDashboardActivityQuery } from './queries/useDashboardActivityQuery';

export function useDashboardData({ branchId, date, isManager }) {
  const overviewQuery = useDashboardOverviewQuery(branchId, date);
  const activityQuery = useDashboardActivityQuery(branchId, date, 10);

  return {
    overview: {
      data: overviewQuery.data,
      isLoading: overviewQuery.isLoading,
      isError: overviewQuery.isError,
      error: overviewQuery.error,
      refetch: overviewQuery.refetch,
    },
    activity: {
      data: activityQuery.data,
      isLoading: activityQuery.isLoading,
      isError: activityQuery.isError,
      error: activityQuery.error,
      refetch: activityQuery.refetch,
    },
  };
}
