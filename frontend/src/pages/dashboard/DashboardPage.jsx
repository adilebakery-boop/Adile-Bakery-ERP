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
  const [closureLoading, setClosureLoading] = useState(false);
  const [closureError, setClosureError] = useState('');
  const [closureSuccess, setClosureSuccess] = useState('');

  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const branchId = userBranchId;
  const operationalDate = getOperationalDate();
  const canClose = isManagerOrAdmin();

  useEffect(() => {
    loadDashboard();
  }, [branchId]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [overviewRes, statusRes, activityRes] = await Promise.all([
        dashboardService.getOverview(branchId, operationalDate),
        closureService.getStatus(operationalDate),
        dashboardService.getRecentActivity(branchId, 10),
      ]);

      if (overviewRes.success) {
        setKpis({
          production: overviewRes.data.totalProduction || 0,
          sales: overviewRes.data.totalEstimatedSold || 0,
          remaining: overviewRes.data.totalRemaining || 0,
          pendingDrafts: overviewRes.data.pendingDrafts || 0,
          pendingDraftsBranches: overviewRes.data.pendingDraftsBranches || [],
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
    switch (type) {
      case 'production': return <Package className="w-4 h-4" />;
      case 'remaining': return <CheckCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getActivityLabel = (activity) => {
    const productName = activity.productName || activity.product?.name || 'Item';
    switch (activity.type) {
      case 'production':
        return `Recorded production: ${productName} x${activity.quantity}`;
      case 'remaining':
        return `Saved remaining: ${productName} = ${activity.remainingQuantity}`;
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
          <h1 className="text-[32px] font-bold text-[#001F3F]">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">{formatOperationalDate(operationalDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          {canClose && (
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
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {closureError}
        </div>
      )}
      {closureSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {closureSuccess}
        </div>
      )}

      {kpis.pendingDrafts > 0 && !closureStatus.isClosed && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {kpis.pendingDrafts} product(s) still in DRAFT status
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Finalize all remainings before closing the day
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 font-medium">Today's Production</span>
            <div className="w-10 h-10 bg-[#D2B48C]/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#D2B48C]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F]">{kpis.production}</p>
          <p className="text-sm text-gray-400 mt-1">items produced today</p>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 font-medium">Estimated Sales</span>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F]">{kpis.sales}</p>
          <p className="text-sm text-gray-400 mt-1">items sold today</p>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 font-medium">Remaining</span>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F]">{kpis.remaining}</p>
          <p className="text-sm text-gray-400 mt-1">items in stock</p>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 font-medium">Pending Drafts</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpis.pendingDrafts > 0 ? 'bg-red-50' : 'bg-gray-100'}`}>
              <AlertCircle className={`w-5 h-5 ${kpis.pendingDrafts > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F]">{kpis.pendingDrafts}</p>
          <p className={`text-sm mt-1 ${kpis.pendingDrafts > 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {kpis.pendingDrafts > 0 ? 'Needs attention' : 'All finalized'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <h2 className="text-xl font-semibold text-[#001F3F] mb-6">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.slice(0, 8).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F9F7F2] transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activity.type === 'production' ? 'bg-[#D2B48C]/10 text-[#D2B48C]' :
                  activity.type === 'remaining' ? 'bg-green-50 text-green-500' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#001F3F]">{getActivityLabel(activity)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(activity.createdAt || activity.timestamp).toLocaleString('en-US', {
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
            <div className="w-16 h-16 bg-[#F9F7F2] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}