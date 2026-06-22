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

  const updateReceived = useMutation({
    mutationFn: ({ id, data }) => unwrap(transferService.updateReceived(id, data)),
    onSuccess: invalidateTransfers,
  });

  return { createTransfer, updateReceived };
}
