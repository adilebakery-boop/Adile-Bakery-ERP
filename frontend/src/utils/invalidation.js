import { queryKeys } from './queryKeys';

export function invalidateProductionBranch(queryClient, branchId) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return key[0] === 'inventory' && key[1] === 'production' && (key[2] === branchId || key[2] === 'all');
    },
  });
}

export function invalidateRemainingBranch(queryClient, branchId, date) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.inventory.remaining.entries(branchId, date),
  });
}

export function invalidateDashboardScope(queryClient, branchId) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return key[0] === 'dashboard' && (key[2] === branchId || key[2] === 'all');
    },
  });
  // Force immediate refetch instead of waiting for the next poll interval.
  // Without this, the dashboard stale-time gap (30s poll) delays visibility
  // of pending-draft state changes from the Remaining page.
  queryClient.refetchQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return key[0] === 'dashboard' && (key[2] === branchId || key[2] === 'all');
    },
  });
}

export function invalidateAfterProductionMutation(queryClient, branchId) {
  invalidateProductionBranch(queryClient, branchId);
  invalidateDashboardScope(queryClient, branchId);
}

export function invalidateAfterRemainingMutation(queryClient, branchId, date) {
  invalidateRemainingBranch(queryClient, branchId, date);
  if (date) invalidateDashboardScope(queryClient, branchId);
}
