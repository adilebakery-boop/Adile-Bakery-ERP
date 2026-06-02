import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, Unlock, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { isManagerOrAdmin } from '../utils/authUtils';
import { invalidateAllOperationalData } from '../utils/invalidation';
import { useClosureStatus } from '../hooks/useClosureStatus';
import closureService from '../services/closureService';
import Modal from './Modal';

const STATUS_CONFIG = {
  OPEN: { icon: Unlock, labelKey: 'closure.open', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
  CLOSED: { icon: Lock, labelKey: 'closure.closed', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  REOPENED: { icon: RotateCcw, labelKey: 'closure.reopened', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
};

export default function CloseReopenBar({ branchId, operationalDate, disabled }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isAdminOrManager = isManagerOrAdmin();

  const { data: status, isLoading, isError, refetch: refetchStatus } = useClosureStatus(branchId, operationalDate);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');

  const noBranch = !branchId;

  const handleClose = async () => {
    setProcessing(true);
    setActionError('');
    const response = await closureService.closeDay(operationalDate, branchId);
    if (!response.success) {
      setActionError(response.message || t('closure.closeFailed'));
      setProcessing(false);
      return;
    }
    invalidateAllOperationalData(queryClient, branchId, operationalDate);
    setIsConfirmOpen(false);
    setProcessing(false);
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    setProcessing(true);
    setActionError('');
    const response = await closureService.reopenDay(operationalDate, reopenReason.trim(), branchId);
    if (!response.success) {
      setActionError(response.message || t('closure.reopenFailed'));
      setProcessing(false);
      return;
    }
    invalidateAllOperationalData(queryClient, branchId, operationalDate);
    setIsReopenOpen(false);
    setReopenReason('');
    setProcessing(false);
  };

  if (noBranch) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-gray-50 dark:bg-[#1a1a2e]/50 rounded-xl border border-gray-200 dark:border-[#2d2d4a]">
        <AlertCircle className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{t('closure.selectBranch')}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-white dark:bg-[#1a1a2e] rounded-xl border border-[#E5E1D8] dark:border-[#2d2d4a]">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">{t('common.loading')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600 dark:text-red-400">{t('closure.statusError')}</span>
        <button onClick={refetchStatus} className="ml-auto text-xs font-medium text-red-600 dark:text-red-400 hover:underline">{t('common.retry')}</button>
      </div>
    );
  }

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
  const StatusIcon = config.icon;

  return (
    <>
      <div className={`flex items-center justify-between px-4 py-3 mb-6 rounded-xl border ${config.bg} ${config.border}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <span className={`text-sm font-medium ${config.color}`}>
            {t(config.labelKey)}
          </span>
          {status === 'REOPENED' && (
            <span className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t('closure.reopenedWarning')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actionError && (
            <span className="text-xs text-red-500 mr-2">{actionError}</span>
          )}
          {isAdminOrManager && status === 'OPEN' && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={processing}
              className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {t('closure.closeDay')}
            </button>
          )}
          {isAdminOrManager && status === 'CLOSED' && (
            <button
              onClick={() => setIsReopenOpen(true)}
              disabled={processing}
              className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {t('closure.reopenDay')}
            </button>
          )}
          {isAdminOrManager && status === 'REOPENED' && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={processing}
              className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {t('closure.closeDay')}
            </button>
          )}
        </div>
      </div>

      <Modal isOpen={isConfirmOpen} onClose={() => { if (!processing) setIsConfirmOpen(false); }} title={t('closure.confirmCloseTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('closure.confirmCloseMessage')}</p>
          {actionError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {actionError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsConfirmOpen(false)}
              disabled={processing}
              className="flex-1 px-6 py-3.5 border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] transition-colors text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleClose}
              disabled={processing}
              className="flex-1 px-6 py-3.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors text-sm disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {processing ? t('closure.closing') : t('closure.closeDay')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isReopenOpen} onClose={() => { if (!processing) setIsReopenOpen(false); setActionError(''); setReopenReason(''); }} title={t('closure.confirmReopenTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('closure.reopenReasonPrompt')}</p>
          <textarea
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white resize-none"
            rows={3}
            placeholder={t('closure.reopenReasonPlaceholder')}
            maxLength={500}
            required
            disabled={processing}
          />
          {!reopenReason.trim() && reopenReason.length > 0 && (
            <p className="text-xs text-red-500">{t('closure.reopenReasonRequired')}</p>
          )}
          {actionError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {actionError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setIsReopenOpen(false); setReopenReason(''); setActionError(''); }}
              disabled={processing}
              className="flex-1 px-6 py-3.5 border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] transition-colors text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleReopen}
              disabled={processing || !reopenReason.trim()}
              className="flex-1 px-6 py-3.5 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors text-sm disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {processing ? t('closure.reopening') : t('closure.reopenDay')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
