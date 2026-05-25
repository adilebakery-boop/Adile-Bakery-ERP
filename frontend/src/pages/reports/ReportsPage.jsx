import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Download, Loader2, ChevronDown, AlertCircle, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getLocalizedName, PRODUCT_NAMES, BRANCH_NAMES } from '../../utils/getLocalizedName';
import reportService from '../../services/reportService';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useProductCategoriesQuery } from '../../features/products/hooks/queries/useProductCategoriesQuery';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useDailyReportQuery } from '../../features/reports/hooks/queries/useDailyReportQuery';
import { useWeeklyReportQuery } from '../../features/reports/hooks/queries/useWeeklyReportQuery';
import { useMonthlyReportQuery } from '../../features/reports/hooks/queries/useMonthlyReportQuery';
import { useYearlyReportQuery } from '../../features/reports/hooks/queries/useYearlyReportQuery';

const DAY_NAMES = {
  Monday: 'ሰኞ', Tuesday: 'ማክሰኞ', Wednesday: 'ረቡዕ', Thursday: 'ሐሙስ',
  Friday: 'ዓርብ', Saturday: 'ቅዳሜ', Sunday: 'እሑድ'
};
const MONTH_NAMES = {
  January: 'ጥር', February: 'የካቲት', March: 'መጋቢት', April: 'ሚያዝያ',
  May: 'ግንቦት', June: 'ሰኔ', July: 'ሐምሌ', August: 'ነሐሴ',
  September: 'መስከረም', October: 'ጥቅምት', November: 'ኅዳር', December: 'ታኅሣሥ'
};

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(getOperationalDate());
  const [branchId, setBranchId] = useState('');
  const [category, setCategory] = useState('');
  const [productId, setProductId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const canManageAll = isManagerOrAdmin();
  const effectiveBranchId = canManageAll ? branchId : null;

  const getProductNameDisplay = (product) => {
    if (!product) return '';
    const name = product.productName || product.name || '';
    if (i18n.language === 'am' && name && PRODUCT_NAMES[name]) {
      return PRODUCT_NAMES[name];
    }
    if (i18n.language === 'am' && (product.name_am || product.productNameAm)) {
      return product.name_am || product.productNameAm;
    }
    return name;
  };

  const getBranchNameDisplay = (branchName) => {
    if (!branchName) return '-';
    if (i18n.language === 'am' && BRANCH_NAMES[branchName]) {
      return BRANCH_NAMES[branchName];
    }
    return branchName;
  };

  const { data: branches = [] } = useActiveBranchesQuery();
  const { data: categories = [] } = useProductCategoriesQuery();

  const {
    data: productsResult,
  } = useProductsQuery({ category: category || undefined, limit: 200 });
  const productList = productsResult?.data || [];

  const filters = {};
  if (category) filters.category = category;
  if (productId) filters.productId = productId;

  const dailyQuery = useDailyReportQuery(effectiveBranchId, date, activeTab === 'daily' ? filters : {});
  const weeklyQuery = useWeeklyReportQuery(effectiveBranchId, date, activeTab === 'weekly' ? filters : {});
  const monthlyQuery = useMonthlyReportQuery(effectiveBranchId, date, activeTab === 'monthly' ? filters : {});
  const yearlyQuery = useYearlyReportQuery(effectiveBranchId, date, activeTab === 'yearly' ? filters : {});

  const activeQuery = activeTab === 'daily' ? dailyQuery
    : activeTab === 'weekly' ? weeklyQuery
    : activeTab === 'monthly' ? monthlyQuery
    : yearlyQuery;

  const reportData = activeQuery.data || {};
  const loading = activeQuery.isLoading;
  const error = activeQuery.error;

  const products = reportData.products || [];
  const days = reportData.days || [];
  const weeks = reportData.weeks || [];
  const months = reportData.months || [];
  const hasData = activeTab === 'daily' ? products.length > 0
    : activeTab === 'weekly' ? days.length > 0
    : activeTab === 'monthly' ? weeks.length > 0
    : months.length > 0;

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, date, branchId, category, productId]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setProductId('');
  };

  const handleExport = useCallback(async () => {
    try {
      const params = {
        type: activeTab,
        operationalDate: date,
      };
      if (branchId) params.branchId = branchId;
      if (category) params.category = category;
      if (productId) params.productId = productId;

      const res = await reportService.exportToCSV(params);
      if (res.success && res.data) {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-report-${date}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  }, [activeTab, date, branchId, category, productId]);

  const totals = useMemo(() => {
    if (activeTab === 'daily') {
      return products.reduce((acc, p) => ({
        totalDayProduction: acc.totalDayProduction + (parseFloat(p.dayProduction) || 0),
        totalNightProduction: acc.totalNightProduction + (parseFloat(p.nightProduction) || 0),
        totalRemainingStock: acc.totalRemainingStock + (parseFloat(p.remainingStock) || 0),
        totalWaste: acc.totalWaste + (parseFloat(p.wasteQuantity) || 0),
        totalEstSold: acc.totalEstSold + (parseFloat(p.estimatedSold) || 0),
        totalRevenue: acc.totalRevenue + (parseFloat(p.estimatedRevenue) || 0),
      }), { totalDayProduction: 0, totalNightProduction: 0, totalRemainingStock: 0, totalWaste: 0, totalEstSold: 0, totalRevenue: 0 });
    }
    if (activeTab === 'weekly') {
      return days.reduce((acc, d) => {
        const t = d.totals || {};
        return {
          totalDayProduction: acc.totalDayProduction + (parseFloat(t.totalDayProduction) || 0),
          totalNightProduction: acc.totalNightProduction + (parseFloat(t.totalNightProduction) || 0),
          totalRemainingStock: acc.totalRemainingStock + (parseFloat(t.totalRemainingStock) || 0),
          totalWaste: acc.totalWaste + (parseFloat(t.totalWasteQuantity) || 0),
          totalEstSold: acc.totalEstSold + (parseFloat(t.totalEstimatedSold) || 0),
          totalRevenue: acc.totalRevenue + (parseFloat(t.totalEstimatedRevenue) || 0),
        };
      }, { totalDayProduction: 0, totalNightProduction: 0, totalRemainingStock: 0, totalWaste: 0, totalEstSold: 0, totalRevenue: 0 });
    }
    if (activeTab === 'monthly') {
      return weeks.reduce((acc, w) => {
        const t = w.totals || {};
        return {
          totalDayProduction: acc.totalDayProduction + (parseFloat(t.totalDayProduction) || 0) + (parseFloat(t.totalNightProduction) || 0),
          totalRemainingStock: acc.totalRemainingStock + (parseFloat(t.totalRemainingStock) || 0),
          totalWaste: acc.totalWaste + (parseFloat(t.totalWasteQuantity) || 0),
          totalEstSold: acc.totalEstSold + (parseFloat(t.totalEstimatedSold) || 0),
          totalRevenue: acc.totalRevenue + (parseFloat(t.totalEstimatedRevenue) || 0),
        };
      }, { totalDayProduction: 0, totalRemainingStock: 0, totalWaste: 0, totalEstSold: 0, totalRevenue: 0 });
    }
    if (activeTab === 'yearly') {
      const t = reportData.totals || {};
      return {
        totalDayProduction: parseFloat(t.totalDayProduction) || 0,
        totalSellableStock: parseFloat(t.totalSellableStock) || 0,
        totalRemainingStock: parseFloat(t.totalRemainingStock) || 0,
        totalWasteQuantity: parseFloat(t.totalWasteQuantity) || 0,
        totalEstimatedSold: parseFloat(t.totalEstimatedSold) || 0,
        totalEstimatedRevenue: parseFloat(t.totalEstimatedRevenue) || 0,
      };
    }
    return {};
  }, [activeTab, products, days, weeks, months, reportData]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('reports.title')}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report — {formatOperationalDate(date)}
            {branchId ? ` — ${getLocalizedName(branches.find(b => b.id.toString() === branchId), i18n.language) || ''}` : ''}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="bg-[#001F3F] text-white px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#001a35] transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error.message || 'Failed to load report'}
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="p-6 border-b border-[#E5E1D8] dark:border-[#2d2d4a]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex bg-[#F9F7F2] dark:bg-[#2d2d4a] rounded-[50px] p-1 w-fit">
              {['daily', 'weekly', 'monthly', 'yearly'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-[40px] text-sm font-medium transition-all ${
                    activeTab === tab ? 'bg-white dark:bg-[#1a1a2e] text-[#001F3F] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t(`reports.${tab}`)}
                </button>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm w-40 dark:text-white"
                />
              </div>

              {canManageAll && (
                <div className="relative">
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="px-4 py-2.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm appearance-none pr-10 min-w-[160px] dark:text-white"
                  >
                    <option value="">{t('reports.allBranches')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                </div>
              )}

              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="px-4 py-2.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm appearance-none pr-10 min-w-[160px] dark:text-white"
                >
                  <option value="">{t('reports.allCategories')}</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{t(`productCategories.${cat.value}`)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {(activeTab === 'weekly' || activeTab === 'monthly' || activeTab === 'yearly') && (
                <div className="relative">
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    disabled={!category && productList.length === 0}
                    className="px-4 py-2.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm appearance-none pr-10 min-w-[180px] disabled:opacity-50"
                  >
                    <option value="">All Products</option>
                    {productList.map((p) => (
                      <option key={p.id} value={p.id}>{getLocalizedName(p, i18n.language)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#D2B48C]" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-[#F9F7F2] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">No data for this period</p>
          </div>
        ) : (
          <>
            {activeTab === 'daily' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F9F7F2]/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.product')}</th>
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.category')}</th>
                        {canManageAll && <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.branch')}</th>}
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.opening')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.dayProd')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.nightProd')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.sellable')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.remaining')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.waste')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.estSold')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
                      {paginatedProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a]">
                          <td className="px-6 py-4 text-sm font-semibold text-[#001F3F] dark:text-white">{getProductNameDisplay(p)}</td>
                          <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">{t(`productCategories.${p.category}`)}</td>
                          {canManageAll && <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500">{getBranchNameDisplay(p.branchName)}</td>}
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.openingStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.dayProduction || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.nightProduction || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.sellableStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.remainingStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.wasteQuantity || 0}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-[#001F3F] dark:text-white">{p.estimatedSold || 0}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-[#D2B48C]">
                            {p.estimatedRevenue ? `${parseFloat(p.estimatedRevenue).toLocaleString()} ETB` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#2d2d4a]">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('reports.showingProducts', { start: ((currentPage - 1) * itemsPerPage) + 1, end: Math.min(currentPage * itemsPerPage, products.length), total: products.length })}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                        {t('reports.pageOf', { current: currentPage, total: totalPages })}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-[#D2B48C] p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[#001F3F] uppercase tracking-wider">{t('reports.totalSummary')}</span>
                    <div className="flex flex-wrap gap-6 lg:gap-10">
                      <div>
                        <p className="text-xs text-[#001F3F]/60">{t('reports.dayProduction')}</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalDayProduction || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">{t('reports.nightProduction')}</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalNightProduction || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">{t('reports.remaining')}</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalRemainingStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">{t('reports.waste')}</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalWaste || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">{t('reports.estSold')}</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalEstSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">{t('reports.revenue')}</p>
                        <p className="text-2xl font-bold text-[#001F3F]">
                          {totals.totalRevenue ? `${totals.totalRevenue.toLocaleString()} ETB` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'weekly' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {days.map((day, idx) => (
                    <div key={idx} className="bg-[#F9F7F2] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-[#001F3F]">{i18n.language === 'am' && DAY_NAMES[day.dayName] ? DAY_NAMES[day.dayName] : day.dayName || `Day ${idx + 1}`}</span>
                        <span className="text-xs text-gray-400">{day.date || '-'}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{t('reports.dayProduction')}</span>
                          <span className="font-medium text-gray-700">{day.totals?.totalDayProduction || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{t('reports.nightProduction')}</span>
                          <span className="font-medium text-gray-700">{day.totals?.totalNightProduction || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{t('reports.remaining')}</span>
                          <span className="font-medium text-gray-700">{day.totals?.totalRemainingStock || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{t('reports.estSold')}</span>
                          <span className="font-medium text-[#001F3F]">{day.totals?.totalEstimatedSold || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{t('reports.revenue')}</span>
                          <span className="font-semibold text-[#D2B48C]">
                            {day.totals?.totalEstimatedRevenue ? `${day.totals.totalEstimatedRevenue.toLocaleString()}` : '0'} ETB
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#001F3F] rounded-xl p-6 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm font-semibold uppercase tracking-wider">{t('reports.weeklyTotals')}</span>
                    <div className="flex flex-wrap gap-8">
                      <div>
                        <p className="text-xs text-white/60">{t('reports.production')}</p>
                        <p className="text-xl font-bold">{(totals.totalDayProduction || 0) + (totals.totalNightProduction || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.remaining')}</p>
                        <p className="text-xl font-bold">{totals.totalRemainingStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.estSold')}</p>
                        <p className="text-xl font-bold">{totals.totalEstSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.revenue')}</p>
                        <p className="text-2xl font-bold">{totals.totalRevenue ? totals.totalRevenue.toLocaleString() : '0'} ETB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="p-6">
                <div className="overflow-x-auto mb-6">
                  <table className="w-full">
                    <thead className="bg-[#F9F7F2]/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.week')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.production')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.remaining')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.waste')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.estSold')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8]">
                      {weeks.map((week, idx) => {
                        const wTotals = week.totals || {};
                        return (
                          <tr key={idx} className="hover:bg-[#F9F7F2]">
                            <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">
                              {t('reports.week')} {idx + 1} <span className="text-gray-400 font-normal text-xs ml-2">({week.weekStartDate || '-'})</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">
                              {(wTotals.totalDayProduction || 0) + (wTotals.totalNightProduction || 0)}
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">{wTotals.totalRemainingStock || 0}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">{wTotals.totalWasteQuantity || 0}</td>
                            <td className="px-6 py-4 text-sm text-right font-medium text-[#001F3F]">{wTotals.totalEstimatedSold || 0}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-[#D2B48C]">
                              {wTotals.totalEstimatedRevenue ? `${wTotals.totalEstimatedRevenue.toLocaleString()} ETB` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#001F3F] rounded-xl p-6 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm font-semibold uppercase tracking-wider">{t('reports.monthlyTotals')}</span>
                    <div className="flex flex-wrap gap-8">
                      <div>
                        <p className="text-xs text-white/60">{t('reports.production')}</p>
                        <p className="text-xl font-bold">{(totals.totalDayProduction || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.remaining')}</p>
                        <p className="text-xl font-bold">{totals.totalRemainingStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.estSold')}</p>
                        <p className="text-xl font-bold">{totals.totalEstSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.revenue')}</p>
                        <p className="text-2xl font-bold">{totals.totalRevenue ? totals.totalRevenue.toLocaleString() : '0'} ETB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'yearly' && (
              <div className="p-6">
                <div className="overflow-x-auto mb-6">
                  <table className="w-full">
                    <thead className="bg-[#F9F7F2]/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.month')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.production')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.sellable')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.remaining')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.waste')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.estSold')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">{t('reports.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8]">
                      {months.map((month, idx) => {
                        const mTotals = month.totals || {};
                        const production = (mTotals.totalDayProduction || 0) + (mTotals.totalNightProduction || 0);
                        return (
                          <tr key={idx} className="hover:bg-[#F9F7F2]">
                            <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{i18n.language === 'am' && MONTH_NAMES[month.monthName] ? MONTH_NAMES[month.monthName] : month.monthName}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">{production.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">{(mTotals.totalSellableStock || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">{(mTotals.totalRemainingStock || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-right text-gray-600">{(mTotals.totalWasteQuantity || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-right font-medium text-[#001F3F]">{(mTotals.totalEstimatedSold || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-[#D2B48C]">
                              {mTotals.totalEstimatedRevenue ? `${mTotals.totalEstimatedRevenue.toLocaleString()} ETB` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#001F3F] rounded-xl p-6 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm font-semibold uppercase tracking-wider">{t('reports.yearlyTotals')}</span>
                    <div className="flex flex-wrap gap-8">
                      <div>
                        <p className="text-xs text-white/60">{t('reports.production')}</p>
                        <p className="text-xl font-bold">{(totals.totalDayProduction || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.sellable')}</p>
                        <p className="text-xl font-bold">{(totals.totalSellableStock || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.remaining')}</p>
                        <p className="text-xl font-bold">{(totals.totalRemainingStock || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.waste')}</p>
                        <p className="text-xl font-bold">{(totals.totalWasteQuantity || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.estSold')}</p>
                        <p className="text-xl font-bold">{(totals.totalEstimatedSold || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">{t('reports.revenue')}</p>
                        <p className="text-2xl font-bold">{totals.totalEstimatedRevenue ? totals.totalEstimatedRevenue.toLocaleString() : '0'} ETB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
