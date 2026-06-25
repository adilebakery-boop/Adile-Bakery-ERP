import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { userService } from '../../../../services/userService';

export function useRestoreUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => unwrap(userService.restoreUser(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.deactivated() });
    },
  });
}
