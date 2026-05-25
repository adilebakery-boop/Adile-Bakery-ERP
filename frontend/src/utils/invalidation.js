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
  queryClient.invalidateQueries({
    queryKey: queryKeys.inventory.remaining.drafts(branchId),
  });
}

export function invalidateDashboardScope(queryClient, branchId) {
  queryClient.invalidateQueries({
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
