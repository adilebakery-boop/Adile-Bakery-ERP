import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { userService } from '../../../../services/userService';

export function useUsersQuery(filters = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => {
      const result = await userService.getUsers(filters);
      if (!result.success) throw new Error(result.message || 'Failed to load users');
      return {
        users: result.data?.users || [],
        pagination: result.data?.pagination || null,
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
