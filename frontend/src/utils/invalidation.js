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
}

export function invalidateAfterProductionMutation(queryClient, branchId) {
  invalidateProductionBranch(queryClient, branchId);
  invalidateDashboardScope(queryClient, branchId);
}

export function invalidateAfterRemainingMutation(queryClient, branchId, date) {
  invalidateRemainingBranch(queryClient, branchId, date);
  if (date) invalidateDashboardScope(queryClient, branchId);
}

export function invalidateWasteScope(queryClient, branchId) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      if (key[0] !== 'waste') return false;
      if (!branchId) return true;
      if (key[1] === 'list' && key[2]?.branchId) {
        return String(key[2].branchId) === String(branchId);
      }
      return true;
    },
  });
}

// mirrors Production invalidation architecture (invalidateAfterProductionMutation)
// waste mutations affect inventory visibility — requires branch-scoped
// production + dashboard invalidation when branchId is available
export function invalidateAfterWasteMutation(queryClient, branchId) {
  invalidateWasteScope(queryClient, branchId);
  if (branchId) {
    invalidateProductionBranch(queryClient, branchId);
    invalidateDashboardScope(queryClient, branchId);
  }
}

// Central invalidation for close/reopen operations — refreshes all operational
// data for the affected branch so every page reflects the new closure state.
export function invalidateAllOperationalData(queryClient, branchId, operationalDate) {
  invalidateProductionBranch(queryClient, branchId);
  invalidateRemainingBranch(queryClient, branchId, operationalDate);
  invalidateWasteScope(queryClient, branchId);
  if (operationalDate && branchId) {
    queryClient.invalidateQueries({
      queryKey: ['closure', 'status', branchId, operationalDate],
    });
  } else {
    queryClient.invalidateQueries({ queryKey: ['closure'] });
  }
  if (branchId) invalidateDashboardScope(queryClient, branchId);
  queryClient.invalidateQueries({ queryKey: ['reports'] });
}
