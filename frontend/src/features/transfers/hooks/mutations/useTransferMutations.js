import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../utils/queryKeys';
import { unwrap } from '../../../../utils/safeQuery';
import { transferService } from '../../../../services/transferService';

export function useTransferMutations() {
  const queryClient = useQueryClient();

  const invalidateTransfers = () => {
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
  };

  const createTransfer = useMutation({
    mutationFn: (data) => unwrap(transferService.createTransfer(data)),
    onSuccess: invalidateTransfers,
  });

  const updateSent = useMutation({
    mutationFn: ({ id, data }) => unwrap(transferService.updateSent(id, data)),
    onSuccess: invalidateTransfers,
  });

  const updateReceived = useMutation({
    mutationFn: ({ id, data }) => unwrap(transferService.updateReceived(id, data)),
    onSuccess: invalidateTransfers,
  });

  const returnProducts = useMutation({
    mutationFn: ({ id, data }) => unwrap(transferService.returnProducts(id, data)),
    onSuccess: invalidateTransfers,
  });

  const resolveDispute = useMutation({
    mutationFn: ({ id, data }) => unwrap(transferService.resolveDispute(id, data)),
    onSuccess: invalidateTransfers,
  });

  const approveTransfer = useMutation({
    mutationFn: (id) => unwrap(transferService.approveTransfer(id)),
    onSuccess: invalidateTransfers,
  });

  const rejectTransfer = useMutation({
    mutationFn: (id) => unwrap(transferService.rejectTransfer(id)),
    onSuccess: invalidateTransfers,
  });

  return { createTransfer, updateSent, updateReceived, returnProducts, resolveDispute, approveTransfer, rejectTransfer };
}
