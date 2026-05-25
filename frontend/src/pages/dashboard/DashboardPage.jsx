import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Package, DollarSign, AlertCircle, Loader2, Lock, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { getUserRole, getUserBranchId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { useDashboardData } from '../../features/dashboard/hooks/useDashboardData';
import { useCloseDayMutation } from '../../features/dashboard/hooks/mutations/useCloseDayMutation';
import { queryKeys } from '../../utils/queryKeys';
import { DashboardCardsSkeleton, ActivitySkeleton } from '../../components/skeletons';
import { ApiErrorState } from '../../components/ui/ErrorState';

export default function DashboardPage() {
  const { t } = useTranslation();
  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const isManager = isManagerOrAdmin();
  const operationalDate = getOperationalDate();
  const canClose = isManager;
  const queryClient = useQueryClient();

  const targetBranchId = isManager ? 'all' : (userBranchId ? Number(userBranchId) : 'all');

  const { overview, activity, closure } = useDashboardData({
    branchId: targetBranchId,
    date: operationalDate,
    isManager,
  });

  const [lastUpdated, setLastUpdated] = useState(null);
  const [closureLoading, setClosureLoading] = useState(false);
  const [closureError, setClosureError] = useState('');
  const [closureSuccess, setClosureSuccess] = useState('');

  const closeDayMutation = useCloseDayMutation();

  useEffect(() => {
    if (overview.data) {
      setLastUpdated(new Date());
    }
  }, [overview.data]);

  const kpis = overview.data || {
    production: 0, sales: 0, remaining: 0, pendingDrafts: 0,
    pendingDraftsBranches: [], isAllBranches: false, branches: [], allFinalized: true,
  };

  const closureStatus = closure.data || { isClosed: false, operationalDate: '' };
  const recentActivity = activity.data || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(targetBranchId, operationalDate) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activity(targetBranchId, operationalDate) });
    queryClient.invalidateQueries({ queryKey: queryKeys.closure.status(operationalDate) });
  };

  const handleCloseDay = async () => {
    setClosureLoading(true);
    setClosureError('');
    setClosureSuccess('');
    try {
      await closeDayMutation.mutateAsync(operationalDate);
      setClosureSuccess(t('dashboard.closeDaySuccess'));
      setTimeout(() => setClosureSuccess(''), 3000);
    } catch (err) {
      setClosureError(err.message || t('common.errorLoading'));
    }
    setClosureLoading(false);
  };

  const getActivityIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'production': return <Package className="w-4 h-4" />;
      case 'remaining': return <CheckCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getActivityLabel = (activity) => {
    const productName = activity.product || activity.productName || activity.product?.name || 'Item';
    const branchName = activity.branchName ? ` (${activity.branchName})` : '';
    switch (activity.type?.toLowerCase()) {
      case 'production':
        return `Recorded production: ${productName} x${activity.quantity}${branchName}`;
      case 'remaining':
        return `Saved remaining: ${productName} = ${activity.quantity}${branchName}`;
      case 'closure':
        return `Day closed for ${activity.operationalDate}`;
      default:
        return `${activity.type} - ${productName}`;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{formatOperationalDate(operationalDate)}</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              {t('dashboard.updated')} {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canClose && !kpis.isAllBranches && (
            <>
              {closureStatus.isClosed ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm">
                  <Lock className="w-4 h-4" />
                  {t('dashboard.dayClosed')}
                </div>
              ) : (
                <button
                  onClick={handleCloseDay}
                  disabled={closureLoading}
                  className="px-4 py-2.5 bg-[#001F3F] text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#001a35] transition-colors disabled:opacity-70"
                >
                  {closureLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {t('dashboard.closeDay')}
                </button>
              )}
            </>
          )}
          <button onClick={handleRefresh} className="p-2 hover:bg-[#F9F7F2] rounded-xl transition-colors">
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {closureError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {closureError}
        </div>
      )}
      {closureSuccess && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {closureSuccess}
        </div>
      )}

      {kpis.pendingDrafts > 0 && !closureStatus.isClosed && !kpis.isAllBranches && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {t('dashboard.draftWarning', { count: kpis.pendingDrafts })}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {t('dashboard.draftWarningSubtitle')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {overview.isLoading ? (
          <div className="col-span-full">
            <DashboardCardsSkeleton count={4} />
          </div>
        ) : overview.isError ? (
          <div className="col-span-full">
            <ApiErrorState error={overview.error} onRetry={overview.refetch} />
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.todayProduction')}</span>
                <div className="w-10 h-10 bg-[#D2B48C]/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#D2B48C]" />
                </div>
              </div>
              <p className="text-4xl font-bold text-[#001F3F] dark:text-white">{kpis.production}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.itemsProducedToday')}</p>
            </div>

            <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.estimatedSales')}</span>
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <p className="text-4xl font-bold text-[#001F3F] dark:text-white">{kpis.sales}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.itemsSoldToday')}</p>
            </div>

            <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.remaining')}</span>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-4xl font-bold text-[#001F3F] dark:text-white">{kpis.remaining}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.itemsInStock')}</p>
            </div>

            <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.pendingDrafts')}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpis.pendingDrafts > 0 ? 'bg-red-50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <AlertCircle className={`w-5 h-5 ${kpis.pendingDrafts > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
              </div>
              <p className="text-4xl font-bold text-[#001F3F] dark:text-white">{kpis.pendingDrafts}</p>
              <p className={`text-sm mt-1 ${kpis.allFinalized ? 'text-gray-400 dark:text-gray-500' : 'text-red-500'}`}>
                {kpis.allFinalized ? t('dashboard.allFinalized') : t('dashboard.needsAttention')}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <h2 className="text-xl font-semibold text-[#001F3F] dark:text-white mb-6">{t('dashboard.recentActivity')}</h2>
        {activity.isLoading ? (
          <ActivitySkeleton />
        ) : activity.isError ? (
          <ApiErrorState error={activity.error} onRetry={activity.refetch} />
        ) : recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.slice(0, 8).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activity.type?.toLowerCase() === 'production' ? 'bg-[#D2B48C]/10 text-[#D2B48C]' :
                  activity.type?.toLowerCase() === 'remaining' ? 'bg-green-50 text-green-500' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#001F3F] dark:text-white">{getActivityLabel(activity)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(activity.time || activity.createdAt || activity.timestamp).toLocaleString('en-US', {
                      timeZone: 'Africa/Addis_Ababa',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-[#F9F7F2] dark:bg-[#2d2d4a] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm">{t('dashboard.noRecentActivity')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
