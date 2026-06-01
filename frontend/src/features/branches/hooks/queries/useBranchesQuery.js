import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { branchService } from '../../../../services/branchService';

export function useBranchesQuery(filters = {}, options = {}) {
  const hasFilters = Object.keys(filters).length > 0;
  return useQuery({
    queryKey: hasFilters ? queryKeys.branches.list(filters) : queryKeys.branches.all,
    queryFn: () => unwrap(branchService.getBranches(filters)),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

export function useActiveBranchesQuery(filters = {}) {
  return useQuery({
    queryKey: queryKeys.branches.active(filters),
    queryFn: () => unwrap(branchService.getActiveBranches()),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
