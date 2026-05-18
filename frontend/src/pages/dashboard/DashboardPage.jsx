import { useState, useEffect } from 'react';
import { Package, DollarSign, AlertCircle, Loader2, Lock, Unlock, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { getUserRole, getUserBranchId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getCategoriesForRole, CATEGORIES } from '../../utils/permissions';
import productionService from '../../services/productionService';
import remainingService from '../../services/remainingService';
import dashboardService from '../../services/dashboardService';
import closureService from '../../services/closureService';

const CATEGORY_LABELS = {
  [CATEGORIES.BREAD_AND_SWEET_BREADS]: 'Bread & Sweet Breads',
  [CATEGORIES.CREAM_CAKES]: 'Cream Cakes',
  [CATEGORIES.SOFT_CAKES]: 'Soft Cakes',
  [CATEGORIES.DRY_CAKES]: 'Dry Cakes',
  [CATEGORIES.COOKIES]: 'Cookies',
  [CATEGORIES.FETIRE_AND_SNACKS]: 'Fetire & Snacks',
  [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: 'Drinks & Retail',
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ production: 0, sales: 0, remaining: 0, pendingDrafts: 0, pendingDraftsBranches: [] });
  const [closureStatus, setClosureStatus] = useState({ isClosed: false, operationalDate: '' });
  const [recentActivity, setRecentActivity] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [closureLoading, setClosureLoading] = useState(false);
  const [closureError, setClosureError] = useState('');
  const [closureSuccess, setClosureSuccess] = useState('');

const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const isManager = isManagerOrAdmin();
  
  let targetBranchId;
  if (isManager) {
    targetBranchId = 'all';
  } else {
    targetBranchId = userBranchId ? Number(userBranchId) : 'all';
  }
  
  const operationalDate = getOperationalDate();
  const canClose = isManager;

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => {
      loadDashboard();
    }, 10000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboard();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [targetBranchId]);

  const loadDashboard = async () => {
    const branchIdForApi = isManager ? 'all' : (userBranchId ? Number(userBranchId) : undefined);
    console.log('Fetching - targetBranchId:', targetBranchId, 'branchIdForApi:', branchIdForApi, 'isManager:', isManager);
    
    try {
      const [overviewRes, statusRes, activityRes] = await Promise.all([
        dashboardService.getOverview(branchIdForApi, operationalDate),
        isManager ? Promise.resolve({ success: true, data: { isClosed: false } }) : closureService.getStatus(operationalDate),
        dashboardService.getRecentActivity(isManager ? 'all' : userBranchId, operationalDate, 10),
      ]);
      
      console.log('Overview response:', overviewRes.data);

      if (overviewRes.success) {
        const data = overviewRes.data;
        setKpis({
          production: data.totalProduction || 0,
          sales: data.totalEstimatedSold || 0,
          remaining: data.totalRemaining || 0,
          pendingDrafts: data.pendingDrafts || 0,
          isAllBranches: data.isAllBranches || false,
          branches: data.branches || [],
          allFinalized: data.allFinalized !== undefined ? data.allFinalized : (data.pendingDrafts === 0),
        });
      }

      if (statusRes.success) {
        setClosureStatus({
          isClosed: statusRes.data.isClosed || false,
          operationalDate: operationalDate,
        });
      }

      if (activityRes.success) {
        setRecentActivity(activityRes.data || []);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
    setLastUpdated(new Date());
  };

  const handleCloseDay = async () => {
    setClosureLoading(true);
    setClosureError('');
    setClosureSuccess('');

    const validateRes = await closureService.validate(operationalDate);
    if (!validateRes.success) {
      setClosureError(validateRes.message || 'Validation failed');
      setClosureLoading(false);
      return;
    }

    const result = await closureService.closeDay(operationalDate);
    setClosureLoading(false);

    if (result.success) {
      setClosureSuccess('Day closed successfully!');
      setClosureStatus(prev => ({ ...prev, isClosed: true }));
      loadDashboard();
      setTimeout(() => setClosureSuccess(''), 3000);
    } else {
      setClosureError(result.message || 'Failed to close day');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#D2B48C]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{formatOperationalDate(operationalDate)}</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canClose && !kpis.isAllBranches && (
            <>
              {closureStatus.isClosed ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm">
                  <Lock className="w-4 h-4" />
                  Day Closed
                </div>
              ) : (
                <button
                  onClick={handleCloseDay}
                  disabled={closureLoading}
                  className="px-4 py-2.5 bg-[#001F3F] text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#001a35] transition-colors disabled:opacity-70"
                >
                  {closureLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Close Day
                </button>
              )}
            </>
          )}
          <button onClick={loadDashboard} className="p-2 hover:bg-[#F9F7F2] rounded-xl transition-colors">
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
              {kpis.pendingDrafts} product(s) still in DRAFT status
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Finalize all remainings before closing the day
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Today's Production</span>
            <div className="w-10 h-10 bg-[#D2B48C]/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#D2B48C]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F] dark:text-white">{kpis.production}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">items produced today</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Estimated Sales</span>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F] dark:text-white">{kpis.sales}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">items sold today</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Remaining</span>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F] dark:text-white">{kpis.remaining}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">items in stock</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending Drafts</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpis.pendingDrafts > 0 ? 'bg-red-50' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <AlertCircle className={`w-5 h-5 ${kpis.pendingDrafts > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F] dark:text-white">{kpis.pendingDrafts}</p>
          <p className={`text-sm mt-1 ${kpis.allFinalized ? 'text-gray-400 dark:text-gray-500' : 'text-red-500'}`}>
            {kpis.allFinalized ? 'All finalized' : 'Needs attention'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <h2 className="text-xl font-semibold text-[#001F3F] dark:text-white mb-6">Recent Activity</h2>
        {recentActivity.length > 0 ? (
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
            <p className="text-gray-400 dark:text-gray-500 text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}