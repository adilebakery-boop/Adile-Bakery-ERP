import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { branchService } from '../../../../services/branchService';

export function useBranchMutations() {
  const queryClient = useQueryClient();

  const addBranch = useMutation({
    mutationFn: (data) => unwrap(branchService.createBranch(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.active() });
    },
  });

  const editBranch = useMutation({
    mutationFn: ({ id, data }) => unwrap(branchService.updateBranch(id, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.active() });
    },
  });

  const removeBranch = useMutation({
    mutationFn: (id) => unwrap(branchService.deleteBranch(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.active() });
    },
  });

  return { addBranch, editBranch, removeBranch };
}
