import { useQuery } from '@tanstack/react-query';
import closureService from '../services/closureService';

export function useClosureStatus(branchId, operationalDate) {
  const enabled = !!branchId && !!operationalDate;
  return useQuery({
    queryKey: ['closure', 'status', branchId, operationalDate],
    queryFn: () => closureService.getStatus(operationalDate, branchId),
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    select: (response) => {
      const raw = response?.data ?? response ?? {};
      return raw?.status || 'OPEN';
    },
  });
}
