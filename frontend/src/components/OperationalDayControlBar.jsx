import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, Unlock, RotateCcw, AlertCircle, Loader2, Calendar, Building2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { isManagerOrAdmin, getOperationalDate } from '../utils/authUtils';
import { getLocalizedName } from '../utils/getLocalizedName';
import { invalidateAllOperationalData } from '../utils/invalidation';
import { useClosureStatus } from '../hooks/useClosureStatus';
import closureService from '../services/closureService';
import Modal from './Modal';

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return new Date(utc).toISOString().split('T')[0];
}

const STATUS_CONFIG = {
  OPEN: { icon: Unlock, labelKey: 'closure.open', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
  CLOSED: { icon: Lock, labelKey: 'closure.closed', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  REOPENED: { icon: RotateCcw, labelKey: 'closure.reopened', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
};

export default function OperationalDayControlBar({ branchId, branches = [], onBranchChange, onStatusChange }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isAdminOrManager = isManagerOrAdmin();

  const today = getOperationalDate();
  const minDate = addDays(today, -2);
  const maxDate = today;
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    if (selectedDate < minDate || selectedDate > maxDate) {
      setSelectedDate(maxDate);
    }
  }, []);

  const { data: status, isLoading, isError, refetch: refetchStatus } = useClosureStatus(branchId, selectedDate);

  useEffect(() => {
    if (onStatusChange && status) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const [actionError, setActionError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  const [preValidation, setPreValidation] = useState(null);
  const [preValidating, setPreValidating] = useState(false);

  const [expandedMissing, setExpandedMissing] = useState(false);
  const [expandedAutoZero, setExpandedAutoZero] = useState(false);

  const noBranch = !branchId;

  const hasBlockingErrors = (preValidation && !preValidation.valid) || validationErrors.length > 0;

  const openCloseModal = useCallback(async () => {
    setIsConfirmOpen(true);
    setPreValidating(true);
    setActionError('');
    setValidationErrors([]);
    setValidationWarnings([]);
    setPreValidation(null);
    setExpandedMissing(false);
    setExpandedAutoZero(false);
    const result = await closureService.validate(selectedDate, branchId);
    if (result.success) {
      setPreValidation(result.data);
    }
    setPreValidating(false);
  }, [selectedDate, branchId]);

  const handleClose = async () => {
    setProcessing(true);
    setActionError('');
    setValidationErrors([]);
    setValidationWarnings([]);
    const response = await closureService.closeDay(selectedDate, branchId);
    if (!response.success) {
      setActionError(response.message || t('closure.closeFailed'));
      if (response.data?.errors?.length) {
        setValidationErrors(response.data.errors);
      }
      if (response.data?.warnings?.length) {
        setValidationWarnings(response.data.warnings);
      }
      setProcessing(false);
      return;
    }
    invalidateAllOperationalData(queryClient, branchId);
    setIsConfirmOpen(false);
    setProcessing(false);
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return;
    setProcessing(true);
    setActionError('');
    const response = await closureService.reopenDay(selectedDate, reopenReason.trim(), branchId);
    if (!response.success) {
      setActionError(response.message || t('closure.reopenFailed'));
      setProcessing(false);
      return;
    }
    invalidateAllOperationalData(queryClient, branchId);
    setIsReopenOpen(false);
    setReopenReason('');
    setProcessing(false);
  };

  const renderBlockingErrors = (errors) => {
    if (!errors || errors.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">{t('closure.blockingIssues')}</p>
        {errors.map((err, i) => {
          if (err.type === 'MISSING_REMAINING') {
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{err.productNames?.length > 0 ? `${err.productNames.length} ${t('closure.productsRequireCounting')}` : err.message}</span>
                </div>
                {err.productNames?.length > 0 && (
                  <div className="ml-4">
                    <button
                      onClick={() => setExpandedMissing(!expandedMissing)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      {expandedMissing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {expandedMissing ? t('closure.hideProducts') : t('closure.showProducts')}
                    </button>
                    {expandedMissing && (
                      <ul className="mt-1 space-y-0.5">
                        {err.productNames.map((name, j) => (
                          <li key={j} className="text-xs text-red-500 dark:text-red-400 ml-4">• {name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          }
          if (err.type === 'DRAFT_REMAINING') {
            return (
              <div key={i} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{err.message}</span>
              </div>
            );
          }
          return (
            <div key={i} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{err.message}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWarnings = (warnings) => {
    if (!warnings || warnings.length === 0) return null;
    const autoZeroWarning = warnings.find(w => w.type === 'AUTO_ZERO_REMAINING');
    const otherWarnings = warnings.filter(w => w.type !== 'AUTO_ZERO_REMAINING');

    return (
      <div className="space-y-2">
        {autoZeroWarning && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{t('closure.autoZeroTitle')}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  {t('closure.autoZeroMessage', { count: autoZeroWarning.count || autoZeroWarning.productIds?.length || 0 })}
                </p>
              </div>
            </div>
            {autoZeroWarning.productNames?.length > 0 && (
              <div className="ml-6">
                <button
                  onClick={() => setExpandedAutoZero(!expandedAutoZero)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                >
                  {expandedAutoZero ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {expandedAutoZero ? t('closure.hideProducts') : t('closure.showProducts')}
                </button>
                {expandedAutoZero && (
                  <ul className="mt-1 space-y-0.5">
                    {autoZeroWarning.productNames.map((name, j) => (
                      <li key={j} className="text-xs text-amber-600 dark:text-amber-400 ml-4">• {name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {otherWarnings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{t('closure.warnings')}</p>
            <ul className="space-y-1">
              {otherWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (noBranch) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-gray-50 dark:bg-[#1a1a2e]/50 rounded-xl border border-gray-200 dark:border-[#2d2d4a]">
        <AlertCircle className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{t('closure.selectBranch')}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {isAdminOrManager && (
          <>
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a2e] px-3 py-2 rounded-xl border border-[#E5E1D8] dark:border-[#2d2d4a]">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium text-[#001F3F] dark:text-white cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a2e] px-3 py-2 rounded-xl border border-[#E5E1D8] dark:border-[#2d2d4a]">
              <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
              <select
                value={branchId || ''}
                onChange={(e) => onBranchChange?.(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium text-[#001F3F] dark:text-white cursor-pointer min-w-[100px]"
              >
                <option value="">{t('closure.selectBranch')}</option>
                {(Array.isArray(branches) ? branches : []).map((b) => (
                  <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1a2e] rounded-xl border border-[#E5E1D8] dark:border-[#2d2d4a]">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            <span className="text-sm text-gray-400">{t('common.loading')}</span>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">{t('closure.statusError')}</span>
            {isAdminOrManager && <button onClick={refetchStatus} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline ml-1">{t('common.retry')}</button>}
          </div>
        ) : (
          (() => {
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
            const StatusIcon = config.icon;
            return (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${config.bg} ${config.border}`}>
                <StatusIcon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-sm font-medium ${config.color}`}>{t(config.labelKey)}</span>
                {status === 'REOPENED' && (
                  <span className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('closure.reopenedWarning')}
                  </span>
                )}
                {isAdminOrManager && (status === 'OPEN' || status === 'REOPENED') && (
                  <button
                    onClick={openCloseModal}
                    disabled={processing}
                    className="ml-2 px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {t('closure.closeDay')}
                  </button>
                )}
                {isAdminOrManager && status === 'CLOSED' && (
                  <button
                    onClick={() => setIsReopenOpen(true)}
                    disabled={processing}
                    className="ml-2 px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {t('closure.reopenDay')}
                  </button>
                )}
              </div>
            );
          })()
        )}

        {actionError && !validationErrors.length && !validationWarnings.length && (
          <span className="text-xs text-red-500">{actionError}</span>
        )}
      </div>

      {isAdminOrManager && (
        <>
          <Modal isOpen={isConfirmOpen} onClose={() => { if (!processing) { setIsConfirmOpen(false); setValidationErrors([]); setValidationWarnings([]); setPreValidation(null); setExpandedMissing(false); setExpandedAutoZero(false); } }} title={t('closure.confirmCloseTitle')}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('closure.confirmCloseMessage')}</p>

              {preValidating ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#1a1a2e]/50 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">{t('closure.checking')}</span>
                </div>
              ) : preValidation ? (
                <div className={`p-3 rounded-xl border ${!hasBlockingErrors ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {!hasBlockingErrors ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${!hasBlockingErrors ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {!hasBlockingErrors ? t('closure.validationPassed') : t('closure.validationFailed')}
                    </span>
                  </div>
                  {preValidation.errors?.length > 0 && renderBlockingErrors(preValidation.errors)}
                  {preValidation.warnings?.length > 0 && renderWarnings(preValidation.warnings)}
                </div>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">{t('closure.cannotValidate')}</span>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
                  {renderBlockingErrors(validationErrors)}
                  {validationWarnings.length > 0 && renderWarnings(validationWarnings)}
                </div>
              )}

              {actionError && validationErrors.length === 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {actionError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setIsConfirmOpen(false); setValidationErrors([]); setValidationWarnings([]); setPreValidation(null); setExpandedMissing(false); setExpandedAutoZero(false); }}
                  disabled={processing}
                  className="flex-1 px-6 py-3.5 border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] transition-colors text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleClose}
                  disabled={processing || hasBlockingErrors}
                  className={`flex-1 px-6 py-3.5 rounded-xl font-medium transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${hasBlockingErrors ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}
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
      )}
    </>
  );
}
