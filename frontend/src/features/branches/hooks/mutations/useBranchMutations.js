import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { branchService } from '../../../../services/branchService';

export function useBranchMutations() {
  const queryClient = useQueryClient();

  const invalidateBranches = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.branches.active() });
    queryClient.invalidateQueries({ queryKey: queryKeys.branches.list() });
  };

  const addBranch = useMutation({
    mutationFn: (data) => unwrap(branchService.createBranch(data)),
    onSuccess: invalidateBranches,
  });

  const editBranch = useMutation({
    mutationFn: ({ id, data }) => unwrap(branchService.updateBranch(id, data)),
    onSuccess: invalidateBranches,
  });

  const removeBranch = useMutation({
    mutationFn: (id) => unwrap(branchService.deleteBranch(id)),
    onSuccess: invalidateBranches,
  });

  const restoreBranch = useMutation({
    mutationFn: (id) => unwrap(branchService.restoreBranch(id)),
    onSuccess: invalidateBranches,
  });

  return { addBranch, editBranch, removeBranch, restoreBranch };
}
