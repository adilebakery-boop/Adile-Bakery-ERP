import { useDashboardOverviewQuery } from './queries/useDashboardOverviewQuery';
import { useDashboardActivityQuery } from './queries/useDashboardActivityQuery';
import { useClosureStatusQuery } from './queries/useClosureStatusQuery';

export function useDashboardData({ branchId, date, isManager }) {
  const overviewQuery = useDashboardOverviewQuery(branchId, date);
  const activityQuery = useDashboardActivityQuery(branchId, date, 10);
  const closureQuery = useClosureStatusQuery(date, {
    enabled: !isManager && !!date,
  });

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
    closure: {
      data: closureQuery.data,
      isLoading: closureQuery.isLoading,
      isError: closureQuery.isError,
      error: closureQuery.error,
      refetch: closureQuery.refetch,
    },
  };
}
