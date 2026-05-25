import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { userService } from '../../../../services/userService';

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => unwrap(userService.createUser(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
  });
}
