import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { userService } from '../../../../services/userService';

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => unwrap(userService.deleteUser(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
  });
}
