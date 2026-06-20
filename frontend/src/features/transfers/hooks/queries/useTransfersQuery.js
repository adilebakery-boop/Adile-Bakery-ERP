import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { transferService } from '../../../../services/transferService';

export function useTransfersQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.transfers.list(filters),
    queryFn: () => unwrap(transferService.getTransfers(filters)),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useTransferQuery(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.transfers.byId(id),
    queryFn: () => unwrap(transferService.getTransfer(id)),
    enabled: !!id,
    ...options,
  });
}
