import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Download, Loader2, ChevronDown, AlertCircle, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getLocalizedName, BRANCH_NAMES } from '../../utils/getLocalizedName';
import reportService from '../../services/reportService';
import { useBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useProductCategoriesQuery } from '../../features/products/hooks/queries/useProductCategoriesQuery';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useDailyReportQuery } from '../../features/reports/hooks/queries/useDailyReportQuery';
import { useWeeklyReportQuery } from '../../features/reports/hooks/queries/useWeeklyReportQuery';
import { useMonthlyReportQuery } from '../../features/reports/hooks/queries/useMonthlyReportQuery';
import { useYearlyReportQuery } from '../../features/reports/hooks/queries/useYearlyReportQuery';
import ReportSummaryCard from '../../components/reports/ReportSummaryCard';
import ReportTotalsBar from '../../components/reports/ReportTotalsBar';

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
  const [showAllProducts, setShowAllProducts] = useState(false);
  const itemsPerPage = 10;

  const canManageAll = isManagerOrAdmin();
  const isAllBranches = branchId === '' || branchId === 'all';
const isSingleBranch = !isAllBranches && branchId !== '';
  const showBranchColumn = isAllBranches;
  const effectiveBranchId = canManageAll ? branchId : null;

  const getBranchNameDisplay = (branchName) => {
    if (!branchName) return '-';
    if (i18n.language === 'am' && BRANCH_NAMES[branchName]) {
      return BRANCH_NAMES[branchName];
    }
    return branchName;
  };

  const { data: branches = [] } = useBranchesQuery({ limit: 100 });
  const { data: categories = [] } = useProductCategoriesQuery();

  const {
    data: productsResult,
  } = useProductsQuery({ category: category || undefined, limit: 200 });
  const productList = productsResult?.data || [];

  const filters = {};
  if (category) filters.category = category;
  if (productId) filters.productId = productId;

  const dailyQuery = useDailyReportQuery(effectiveBranchId, date, activeTab === 'daily' ? filters : {}, { enabled: activeTab === 'daily' && !!date });
  const weeklyQuery = useWeeklyReportQuery(effectiveBranchId, date, activeTab === 'weekly' ? filters : {}, { enabled: activeTab === 'weekly' && !!date });
  const monthlyQuery = useMonthlyReportQuery(effectiveBranchId, date, activeTab === 'monthly' ? filters : {}, { enabled: activeTab === 'monthly' && !!date });
  const yearlyQuery = useYearlyReportQuery(effectiveBranchId, date, activeTab === 'yearly' ? filters : {}, { enabled: activeTab === 'yearly' && !!date });

  const activeQuery = activeTab === 'daily' ? dailyQuery
    : activeTab === 'weekly' ? weeklyQuery
    : activeTab === 'monthly' ? monthlyQuery
    : yearlyQuery;

  const reportData = activeQuery.data || {};
  const loading = activeQuery.isLoading;
  const error = activeQuery.error;


  const products = (reportData.products || []).filter(p => {
    if (showAllProducts) return true;
    return (
      (p.openingStock || 0) > 0 ||
      (p.dayProduction || 0) > 0 ||
      (p.nightProduction || 0) > 0 ||
      (p.wasteQuantity || 0) > 0 ||
      (p.remainingStock || 0) > 0
    );
  });
  const days = reportData.days || [];
  const weeks = reportData.weeks || [];
  const months = reportData.months || [];
  const hasData = activeTab === 'daily' ? products.length > 0
    : activeTab === 'weekly' ? days.length > 0
    : activeTab === 'monthly' ? weeks.length > 0
    : months.length > 0;

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isEmptyTotals = (t) =>
    !t ||
    (
      (t.totalDayProduction || 0) === 0 &&
      (t.totalNightProduction || 0) === 0 &&
      (t.totalRemainingStock || 0) === 0 &&
      (t.totalWasteQuantity || 0) === 0 &&
      (t.totalEstimatedSold || 0) === 0 &&
      (t.totalEstimatedRevenue || 0) === 0
    );

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
          totalDayProduction: acc.totalDayProduction + (parseFloat(t.totalDayProduction) || 0),
          totalNightProduction: acc.totalNightProduction + (parseFloat(t.totalNightProduction) || 0),
          totalRemainingStock: acc.totalRemainingStock + (parseFloat(t.totalRemainingStock) || 0),
          totalWaste: acc.totalWaste + (parseFloat(t.totalWasteQuantity) || 0),
          totalEstSold: acc.totalEstSold + (parseFloat(t.totalEstimatedSold) || 0),
          totalRevenue: acc.totalRevenue + (parseFloat(t.totalEstimatedRevenue) || 0),
        };
      }, { totalDayProduction: 0, totalNightProduction: 0, totalRemainingStock: 0, totalWaste: 0, totalEstSold: 0, totalRevenue: 0 });
    }
    if (activeTab === 'yearly') {
      const t = reportData.totals || {};
      return {
        totalDayProduction: parseFloat(t.totalDayProduction) || 0,
        totalNightProduction: parseFloat(t.totalNightProduction) || 0,
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
          <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">{t('reports.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {t(`reports.${activeTab}`)} {t('reports.report')} — {formatOperationalDate(date)}
            {branchId ? ` — ${getLocalizedName(branches.find(b => b.id.toString() === branchId), i18n.language) || ''}` : ''}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="bg-[#4CB094] text-[#002830] px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#236B56] transition-colors"
        >
          <Download className="w-4 h-4" />
          {t('reports.export')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error.message || t('reports.failedToLoadReport')}
        </div>
      )}

      <div className="bg-white dark:bg-[#12262A] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="p-6 border-b border-[#E5E1D8] dark:border-[#1E3A3F]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-[50px] p-1 w-full sm:w-fit overflow-x-auto flex-nowrap">
              {['daily', 'weekly', 'monthly', 'yearly'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-6 py-2.5 rounded-[40px] text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${
                    activeTab === tab ? 'bg-white dark:bg-[#12262A] text-[#024A5B] dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  {t(`reports.${tab}`)}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative w-full sm:w-auto">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm w-full sm:w-40 dark:text-white"
                />
              </div>

              {canManageAll && (
                <div className="relative w-full sm:w-auto">
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="px-4 py-2.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm appearance-none pr-10 w-full sm:min-w-[160px] dark:text-white"
                  >
                    <option value="">{t('reports.allBranches')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {getLocalizedName(b, i18n.language)}{b.isActive === false ? ' (Archived)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-500 pointer-events-none" />
                </div>
              )}

              <div className="relative w-full sm:w-auto">
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="px-4 py-2.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm appearance-none pr-10 w-full sm:min-w-[160px] dark:text-white"
                >
                  <option value="">{t('reports.allCategories')}</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{t(`productCategories.${cat.value}`)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              {(activeTab === 'weekly' || activeTab === 'monthly' || activeTab === 'yearly') && (
                <div className="relative w-full sm:w-auto">
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    disabled={!category && productList.length === 0}
                    className="px-4 py-2.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm appearance-none pr-10 w-full sm:min-w-[180px] disabled:opacity-50 dark:text-white"
                  >
                    <option value="">{t('reports.allProducts')}</option>
                    {productList.map((p) => (
                      <option key={p.id} value={p.id}>{getLocalizedName(p, i18n.language)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAllProducts}
                  aria-label={t('ui.showAllProducts')}
                  onClick={() => setShowAllProducts(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showAllProducts ? 'bg-[#4CB094]' : 'bg-gray-300 dark:bg-[#1E3A3F]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllProducts ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#024A5B]" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-[#DFEDE2] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-500 text-sm">{t('reports.noDataForPeriod')}</p>
          </div>
        ) : (
          <>
            {activeTab === 'daily' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#DFEDE2]/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.product')}</th>
                        <th className="hidden md:table-cell px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.category')}</th>
                        {canManageAll && showBranchColumn && <th className="hidden md:table-cell px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.branch')}</th>}
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.opening')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.dayProd')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.nightProd')}</th>
                        {/* TODO(future): Rename 'Sellable' — this value is opening + dayProd + nightProd (available inventory), NOT estimated sales. Consider 'Available Stock' or 'Total Stock'. */}
                        <th className="hidden md:table-cell px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.sellable')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.remaining')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.transfers')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.waste')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.estSold')}</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('reports.revenue')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#1E3A3F]">
                      {paginatedProducts.map((p) => (
                        <tr key={`${p.product?.id || p.id}-${p.branchName || ''}`} className="hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F]">
                          <td className="px-6 py-4 text-sm font-semibold text-[#024A5B] dark:text-white">{getLocalizedName(p.product, i18n.language) || p.product?.name || t('common.na')}</td>
                          <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-500 dark:text-gray-500">{t(`productCategories.${p.product?.category}`)}</td>
                          {canManageAll && showBranchColumn && <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-500 dark:text-gray-500">{getBranchNameDisplay(p.branchName)}</td>}
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.openingStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.dayProduction || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.nightProduction || 0}</td>
                          <td className="hidden md:table-cell px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.sellableStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.remainingStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                            {p.receivedTransfer || p.sentTransfer
                              ? `+${p.receivedTransfer || 0} / -${p.sentTransfer || 0}`
                              : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{p.wasteQuantity || 0}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-[#024A5B] dark:text-white">{p.estimatedSold || 0}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-[#024A5B]">
                            {p.estimatedRevenue ? `${parseFloat(p.estimatedRevenue).toLocaleString()} ETB` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#1E3A3F]">
                    <div className="text-sm text-gray-500 dark:text-gray-500">
                      {t('reports.showingProducts', { start: ((currentPage - 1) * itemsPerPage) + 1, end: Math.min(currentPage * itemsPerPage, products.length), total: products.length })}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#1E3A3F] text-gray-600 dark:text-gray-500 hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-500 px-2">
                        {t('reports.pageOf', { current: currentPage, total: totalPages })}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#1E3A3F] text-gray-600 dark:text-gray-500 hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-[#CAEAFD] dark:bg-[#1E3A3F] p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[#024A5B] dark:text-white uppercase tracking-wider">{t('reports.totalSummary')}</span>
                    <div className="flex flex-wrap gap-6 lg:gap-10">
                      <div>
                        <p className="text-xs text-[#024A5B]/60 dark:text-gray-400">{t('reports.dayProduction')}</p>
                        <p className="text-xl font-bold text-[#024A5B] dark:text-white">{totals.totalDayProduction || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#024A5B]/60 dark:text-gray-400">{t('reports.nightProduction')}</p>
                        <p className="text-xl font-bold text-[#024A5B] dark:text-white">{totals.totalNightProduction || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#024A5B]/60 dark:text-gray-400">{t('reports.remaining')}</p>
                        <p className="text-xl font-bold text-[#024A5B] dark:text-white">{totals.totalRemainingStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#024A5B]/60 dark:text-gray-400">{t('reports.waste')}</p>
                        <p className="text-xl font-bold text-[#024A5B] dark:text-white">{totals.totalWaste || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#024A5B]/60 dark:text-gray-400">{t('reports.estSold')}</p>
                        <p className="text-xl font-bold text-[#024A5B] dark:text-white">{totals.totalEstSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#024A5B]/60 dark:text-gray-400">{t('reports.revenue')}</p>
                        <p className="text-2xl font-bold text-[#024A5B] dark:text-white">
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
                  {days.map((day) => {
                    const title = i18n.language === 'am' && DAY_NAMES[day.dayName] ? DAY_NAMES[day.dayName] : day.dayName || day.date;
                    if (isEmptyTotals(day.totals)) {
                      return (
                        <div key={day.date} className="bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-[#024A5B] dark:text-white">{title}</span>
                            {day.date && <span className="text-xs text-gray-500 dark:text-gray-400">{day.date}</span>}
                          </div>
                          <div className="flex items-center justify-center h-24 text-xs text-gray-400 dark:text-gray-500 italic">
                            {t('reports.noDataForPeriod')}
                          </div>
                        </div>
                      );
                    }
                    const dayTotals = day.totals;
                    const dayTransfers = day.products?.reduce(
                      (acc, p) => ({
                        rec: acc.rec + (Number(p.receivedTransfer) || 0),
                        sent: acc.sent + (Number(p.sentTransfer) || 0),
                      }),
                      { rec: 0, sent: 0 }
                    ) || { rec: 0, sent: 0 };
                    return (
                      <ReportSummaryCard
                        key={day.date}
                        title={title}
                        subtitle={day.date || '-'}
                        fields={[
                          { label: t('reports.dayProduction'), value: dayTotals.totalDayProduction },
                          { label: t('reports.nightProduction'), value: dayTotals.totalNightProduction },
                          ...(isSingleBranch ? [{
                            label: t('reports.transfers'),
                            value: dayTransfers.rec || dayTransfers.sent
                              ? `+${dayTransfers.rec.toLocaleString()} / -${dayTransfers.sent.toLocaleString()}`
                              : '—',
                          }] : []),
                          { label: t('reports.remaining'), value: dayTotals.totalRemainingStock },
                          { label: t('reports.waste'), value: dayTotals.totalWasteQuantity },
                          { label: t('reports.estSold'), value: dayTotals.totalEstimatedSold, highlighted: true },
                          { label: t('reports.revenue'), value: dayTotals.totalEstimatedRevenue, highlighted: true, revenue: true },
                        ]}
                      />
                    );
                  })}
                </div>

                <ReportTotalsBar
                  title={t('reports.weeklyTotals')}
                  fields={[
                    { label: t('reports.production'), value: (totals.totalDayProduction || 0) + (totals.totalNightProduction || 0) },
                    { label: t('reports.remaining'), value: totals.totalRemainingStock },
                    { label: t('reports.estSold'), value: totals.totalEstSold },
                    { label: t('reports.revenue'), value: totals.totalRevenue, revenue: true },
                  ]}
                />
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {weeks.map((week, idx) => {
                    const title = `${t('reports.week')} ${idx + 1}`;
                    if (isEmptyTotals(week.totals)) {
                      return (
                        <div key={week.weekStartDate} className="bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-[#024A5B] dark:text-white">{title}</span>
                            {week.weekStartDate && <span className="text-xs text-gray-500 dark:text-gray-400">{week.weekStartDate}</span>}
                          </div>
                          <div className="flex items-center justify-center h-24 text-xs text-gray-400 dark:text-gray-500 italic">
                            {t('reports.noDataForPeriod')}
                          </div>
                        </div>
                      );
                    }
                    const weekTotals = week.totals;
                    const weekTransfers = week.days?.reduce(
                      (acc, day) => {
                        const daySum = (day.products || []).reduce(
                          (dAcc, p) => ({
                            rec: dAcc.rec + (Number(p.receivedTransfer) || 0),
                            sent: dAcc.sent + (Number(p.sentTransfer) || 0),
                          }),
                          { rec: 0, sent: 0 }
                        );
                        return {
                          rec: acc.rec + daySum.rec,
                          sent: acc.sent + daySum.sent,
                        };
                      },
                      { rec: 0, sent: 0 }
                    ) || { rec: 0, sent: 0 };
                    return (
                      <ReportSummaryCard
                        key={week.weekStartDate}
                        title={title}
                        subtitle={week.weekStartDate || '-'}
                        fields={[
                          { label: t('reports.dayProduction'), value: weekTotals.totalDayProduction },
                          { label: t('reports.nightProduction'), value: weekTotals.totalNightProduction },
                          ...(isSingleBranch ? [{
                            label: t('reports.transfers'),
                            value: weekTransfers.rec || weekTransfers.sent
                              ? `+${weekTransfers.rec.toLocaleString()} / -${weekTransfers.sent.toLocaleString()}`
                              : '—',
                          }] : []),
                          { label: t('reports.remaining'), value: weekTotals.totalRemainingStock },
                          { label: t('reports.waste'), value: weekTotals.totalWasteQuantity },
                          { label: t('reports.estSold'), value: weekTotals.totalEstimatedSold, highlighted: true },
                          { label: t('reports.revenue'), value: weekTotals.totalEstimatedRevenue, highlighted: true, revenue: true },
                        ]}
                      />
                    );
                  })}
                </div>

                <ReportTotalsBar
                  title={t('reports.monthlyTotals')}
                  fields={[
                    { label: t('reports.dayProduction'), value: totals.totalDayProduction },
                    { label: t('reports.nightProduction'), value: totals.totalNightProduction },
                    { label: t('reports.remaining'), value: totals.totalRemainingStock },
                    { label: t('reports.estSold'), value: totals.totalEstSold },
                    { label: t('reports.revenue'), value: totals.totalRevenue, revenue: true },
                  ]}
                />
              </div>
            )}

            {activeTab === 'yearly' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {months.map((month) => {
                    const title = i18n.language === 'am' && MONTH_NAMES[month.monthName] ? MONTH_NAMES[month.monthName] : month.monthName;
                    if (isEmptyTotals(month.totals)) {
                      return (
                        <div key={month.monthName} className="bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-[#024A5B] dark:text-white">{title}</span>
                          </div>
                          <div className="flex items-center justify-center h-24 text-xs text-gray-400 dark:text-gray-500 italic">
                            {t('reports.noDataForPeriod')}
                          </div>
                        </div>
                      );
                    }
                    const monthTotals = month.totals;
                    return (
                      <ReportSummaryCard
                        key={month.monthName}
                        title={title}
                        fields={[
                          { label: t('reports.production'), value: (monthTotals.totalDayProduction || 0) + (monthTotals.totalNightProduction || 0) },
                          { label: t('reports.remaining'), value: monthTotals.totalRemainingStock },
                          { label: t('reports.waste'), value: monthTotals.totalWasteQuantity },
                          { label: t('reports.estSold'), value: monthTotals.totalEstimatedSold, highlighted: true },
                          { label: t('reports.revenue'), value: monthTotals.totalEstimatedRevenue, highlighted: true, revenue: true },
                        ]}
                      />
                    );
                  })}
                </div>

                <ReportTotalsBar
                  title={t('reports.yearlyTotals')}
                  fields={[
                    { label: t('reports.production'), value: (totals.totalDayProduction || 0) + (totals.totalNightProduction || 0) },
                    { label: t('reports.remaining'), value: totals.totalRemainingStock },
                    { label: t('reports.waste'), value: totals.totalWasteQuantity },
                    { label: t('reports.estSold'), value: totals.totalEstimatedSold },
                    { label: t('reports.revenue'), value: totals.totalEstimatedRevenue, revenue: true },
                  ]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
