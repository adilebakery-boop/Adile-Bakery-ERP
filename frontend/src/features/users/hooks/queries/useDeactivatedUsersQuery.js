import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { userService } from '../../../../services/userService';
import { unwrap } from '../../../../utils/safeQuery';

export function useDeactivatedUsersQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.users.deactivated(),
    queryFn: async () => {
      const result = await userService.getDeactivatedUsers();
      if (!result.success) throw new Error(result.message || 'Failed to load deactivated users');
      return result.data?.users || [];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}
