import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, DollarSign, AlertCircle, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { getUserRole, getUserBranchId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { useDashboardData } from '../../features/dashboard/hooks/useDashboardData';
import { queryKeys } from '../../utils/queryKeys';
import { DashboardCardsSkeleton, ActivitySkeleton } from '../../components/skeletons';
import { ApiErrorState } from '../../components/ui/ErrorState';

export default function DashboardPage() {
  const { t } = useTranslation();
  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const isManager = isManagerOrAdmin();
  const operationalDate = getOperationalDate();
  const queryClient = useQueryClient();

  const navigate = useNavigate();
  const targetBranchId = isManager ? 'all' : (userBranchId ? Number(userBranchId) : 'all');

  const { overview, activity } = useDashboardData({
    branchId: targetBranchId,
    date: operationalDate,
    isManager,
  });

  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (overview.data) {
      setLastUpdated(new Date());
    }
  }, [overview.data]);

  const kpis = overview.data || {
    production: 0, sales: 0, remaining: 0, pendingDrafts: 0,
    pendingDraftsBranches: [], isAllBranches: false, branches: [], allFinalized: true,
  };

  const recentActivity = activity.data || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(targetBranchId, operationalDate) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activity(targetBranchId, operationalDate) });
  };

  const getActivityIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'production': return <Package className="w-4 h-4" />;
      case 'remaining': return <CheckCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getActivityLabel = (activity) => {
    const productName = activity.product?.name ? getLocalizedName(activity.product, i18n.language) : activity.product || activity.productName || 'Item';
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
    <div className="px-4 sm:px-6 md:px-8 lg:px-10 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{formatOperationalDate(operationalDate)}</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              {t('dashboard.updated')} {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} className="p-2 hover:bg-[#DFEDE2] rounded-xl transition-colors">
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {kpis.pendingDrafts > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {t('dashboard.draftWarning', { count: kpis.pendingDrafts })}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {t('dashboard.draftWarningSubtitle')}
              </p>
              {kpis.isAllBranches && kpis.branches && kpis.branches.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {kpis.branches.filter(b => b.pendingDrafts > 0).map(b => (
                    <li key={b.branchId} className="text-xs text-amber-700 dark:text-amber-300">
                      {b.branchName}: {b.pendingDrafts} pending
                    </li>
                  ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/remaining')}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
                  >
                    {t('dashboard.goToRemaining')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
            </div>
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
            <div className="bg-white dark:bg-[#12262A] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-500 font-medium">{t('dashboard.todayProduction')}</span>
                <div className="w-10 h-10 bg-[#CAEAFD]/20 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#024A5B]" />
                </div>
              </div>
              <p className="text-4xl font-bold text-[#024A5B] dark:text-white">{kpis.production}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('dashboard.itemsProducedToday')}</p>
            </div>

            <div className="bg-white dark:bg-[#12262A] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-500 font-medium">{t('dashboard.estimatedSales')}</span>
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <p className="text-4xl font-bold text-[#024A5B] dark:text-white">{kpis.sales}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('dashboard.itemsSoldToday')}</p>
            </div>

            <div className="bg-white dark:bg-[#12262A] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-500 font-medium">{t('dashboard.remaining')}</span>
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-4xl font-bold text-[#024A5B] dark:text-white">{kpis.remaining}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('dashboard.itemsInStock')}</p>
            </div>

            <div className="bg-white dark:bg-[#12262A] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-500 font-medium">{t('dashboard.pendingDrafts')}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpis.pendingDrafts > 0 ? 'bg-red-50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <AlertCircle className={`w-5 h-5 ${kpis.pendingDrafts > 0 ? 'text-red-500' : 'text-gray-500'}`} />
                </div>
              </div>
              <p className="text-4xl font-bold text-[#024A5B] dark:text-white">{kpis.pendingDrafts}</p>
              <p className={`text-sm mt-1 ${kpis.allFinalized ? 'text-gray-500 dark:text-gray-500' : 'text-red-500'}`}>
                {kpis.allFinalized ? t('dashboard.allFinalized') : t('dashboard.needsAttention')}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white dark:bg-[#12262A] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <h2 className="text-xl font-semibold text-[#024A5B] dark:text-white mb-6">{t('dashboard.recentActivity')}</h2>
        {activity.isLoading ? (
          <ActivitySkeleton />
        ) : activity.isError ? (
          <ApiErrorState error={activity.error} onRetry={activity.refetch} />
        ) : recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.slice(0, 8).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activity.type?.toLowerCase() === 'production' ? 'bg-[#CAEAFD]/10 text-[#024A5B]' :
                  activity.type?.toLowerCase() === 'remaining' ? 'bg-green-50 text-green-500' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#024A5B] dark:text-white">{getActivityLabel(activity)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
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
            <div className="w-16 h-16 bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-500 text-sm">{t('dashboard.noRecentActivity')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
