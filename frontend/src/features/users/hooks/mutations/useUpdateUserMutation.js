import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { userService } from '../../../../services/userService';

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => unwrap(userService.updateUser(id, data)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.byId(variables.id) });
    },
  });
}
