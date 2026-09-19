import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { userService } from '../../../../services/userService';

export function usePermanentDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => unwrap(userService.permanentDeleteUser(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.deactivated() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
  });
}
