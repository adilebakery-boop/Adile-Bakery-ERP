import { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Loader2, ChevronDown, AlertCircle, Package } from 'lucide-react';
import { getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import reportService from '../../services/reportService';
import branchService from '../../services/branchService';
import productService from '../../services/productService';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(getOperationalDate());
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [category, setCategory] = useState('');
  const [productId, setProductId] = useState('');
  const [categories, setCategories] = useState([]);
  const [productList, setProductList] = useState([]);
  const [allProductsData, setAllProductsData] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canManageAll = isManagerOrAdmin();

  useEffect(() => {
    setDate(getOperationalDate());
  }, []);

  useEffect(() => {
    if (canManageAll) loadBranches();
    loadCategories();
  }, [canManageAll]);

  useEffect(() => {
    loadProducts();
  }, [category]);

  useEffect(() => {
    if (date) {
      loadReport();
    }
  }, [activeTab, date, branchId, category, productId]);

  const loadBranches = async () => {
    const res = await branchService.getActiveBranches();
    if (res.success) {
      setBranches(res.data || []);
      setBranchId('');
    }
  };

  const loadCategories = async () => {
    const res = await productService.getCategories();
    if (res.success) {
      setCategories(res.data || []);
    }
  };

  const loadProducts = async () => {
    const res = await productService.getProducts({ category: category || undefined });
    if (res.success) {
      setAllProductsData(res.data || []);
      setProductList(res.data || []);
      if (!category) {
        setProductList(res.data || []);
      }
    }
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setProductId('');
    if (cat) {
      const filtered = allProductsData.filter(p => p.category === cat);
      setProductList(filtered);
    } else {
      setProductList(allProductsData);
    }
};

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      const params = { operationalDate: date };
      if (branchId) params.branchId = branchId;
      if (category) params.category = category;
      if (productId) params.productId = productId;

      switch (activeTab) {
        case 'daily':
          res = await reportService.getDailyReport(params);
          break;
        case 'weekly':
          res = await reportService.getWeeklyReport(params);
          break;
        case 'monthly':
          res = await reportService.getMonthlyReport(params);
          break;
        case 'yearly':
          res = await reportService.getYearlyReport(params);
          break;
        default:
          res = await reportService.getDailyReport(params);
      }

      if (res.success) {
        setReportData(res.data);
      } else {
        setError(res.message || 'Failed to load report');
        setReportData(null);
      }
    } catch (err) {
      setError('Error loading report: ' + (err.message || 'Unknown error'));
      setReportData(null);
    }
    setLoading(false);
  };

  const handleExport = async () => {
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
      } else {
        setError(res.message || 'Export failed');
      }
    } catch (err) {
      console.error('Export error:', err);
      setError('Export failed. Please try again.');
    }
  };

  const products = reportData?.products || [];
  const days = reportData?.days || [];
  const weeks = reportData?.weeks || [];
  const months = reportData?.months || [];
  const hasData = activeTab === 'daily' ? products.length > 0 : activeTab === 'weekly' ? days.length > 0 : activeTab === 'monthly' ? weeks.length > 0 : months.length > 0;

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
      }, { totalDayProduction: 0, totalNightProduction: 0, totalRemainingStock: 0, totalWaste: 0, totalEstSold: 0, totalRevenue: 0 });
    }
    return {};
  }, [activeTab, products, days, weeks]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F]">Reports</h1>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report - {formatOperationalDate(date)}
            {branchId ? ` — ${branches.find(b => b.id.toString() === branchId)?.name || ''}` : ''}
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
          {error}
        </div>
      )}

      <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="p-6 border-b border-[#E5E1D8]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
<div className="flex bg-[#F9F7F2] rounded-[50px] p-1 w-fit">
                {['daily', 'weekly', 'monthly', 'yearly'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2.5 rounded-[40px] text-sm font-medium transition-all ${
                      activeTab === tab ? 'bg-white text-[#001F3F] shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm w-40"
                />
              </div>

              {canManageAll && (
                <div className="relative">
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="px-4 py-2.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm appearance-none pr-10 min-w-[160px]"
                  >
                    <option value="">All Branches</option>
{(activeTab === 'weekly' || activeTab === 'monthly' || activeTab === 'yearly') && (
                      <option value="comparison">Comparison Mode</option>
                    )}
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}

              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="px-4 py-2.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm appearance-none pr-10 min-w-[160px]"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
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
                      <option key={p.id} value={p.id}>{p.name}</option>
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
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Category</th>
                        {canManageAll && <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Branch</th>}
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Opening</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Day Prod.</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Night Prod.</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Sellable</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Remaining</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Waste</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Est. Sold</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8]">
                      {products.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[#F9F7F2]">
                          <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{p.productName}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{p.category}</td>
                          {canManageAll && <td className="px-6 py-4 text-sm text-gray-400">
                            {p.branchName || '-'}
                          </td>}
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.openingStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.dayProduction || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.nightProduction || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.sellableStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.remainingStock || 0}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.wasteQuantity || 0}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-[#001F3F]">{p.estimatedSold || 0}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-[#D2B48C]">
                            {p.estimatedRevenue ? `${parseFloat(p.estimatedRevenue).toLocaleString()} ETB` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#D2B48C] p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[#001F3F] uppercase tracking-wider">Total Summary:</span>
                    <div className="flex flex-wrap gap-6 lg:gap-10">
                      <div>
                        <p className="text-xs text-[#001F3F]/60">Day Production</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalDayProduction || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">Night Production</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalNightProduction || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">Remaining</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalRemainingStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">Waste</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalWaste || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">Est. Sold</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalEstSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">Revenue</p>
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
                        <span className="text-sm font-semibold text-[#001F3F]">{day.dayName || `Day ${idx + 1}`}</span>
                        <span className="text-xs text-gray-400">{day.date || '-'}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Day Production</span>
                          <span className="font-medium text-gray-700">{day.totals?.totalDayProduction || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Night Production</span>
                          <span className="font-medium text-gray-700">{day.totals?.totalNightProduction || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Remaining</span>
                          <span className="font-medium text-gray-700">{day.totals?.totalRemainingStock || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Est. Sold</span>
                          <span className="font-medium text-[#001F3F]">{day.totals?.totalEstimatedSold || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Revenue</span>
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
                    <span className="text-sm font-semibold uppercase tracking-wider">Weekly Totals:</span>
                    <div className="flex flex-wrap gap-8">
                      <div>
                        <p className="text-xs text-white/60">Production</p>
                        <p className="text-xl font-bold">
                          {(totals.totalDayProduction || 0) + (totals.totalNightProduction || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Remaining</p>
                        <p className="text-xl font-bold">{totals.totalRemainingStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Est. Sold</p>
                        <p className="text-xl font-bold">{totals.totalEstSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Revenue</p>
                        <p className="text-2xl font-bold">
                          {totals.totalRevenue ? totals.totalRevenue.toLocaleString() : '0'} ETB
                        </p>
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
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Week</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Production</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Remaining</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Waste</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Est. Sold</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8]">
                      {weeks.map((week, idx) => {
                        const wTotals = week.totals || {};
                        return (
                          <tr key={idx} className="hover:bg-[#F9F7F2]">
                            <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">
                              Week {idx + 1} <span className="text-gray-400 font-normal text-xs ml-2">({week.weekStartDate || '-'})</span>
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
                    <span className="text-sm font-semibold uppercase tracking-wider">Monthly Totals:</span>
                    <div className="flex flex-wrap gap-8">
                      <div>
                        <p className="text-xs text-white/60">Production</p>
                        <p className="text-xl font-bold">
                          {(totals.totalDayProduction || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Remaining</p>
                        <p className="text-xl font-bold">{totals.totalRemainingStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Est. Sold</p>
                        <p className="text-xl font-bold">{totals.totalEstSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Revenue</p>
                        <p className="text-2xl font-bold">
                          {totals.totalRevenue ? totals.totalRevenue.toLocaleString() : '0'} ETB
                        </p>
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
                        <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Month</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Production</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Sellable</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Remaining</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Waste</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Est. Sold</th>
                        <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8]">
                      {months.map((month, idx) => {
                        const mTotals = month.totals || {};
                        const production = (mTotals.totalDayProduction || 0) + (mTotals.totalNightProduction || 0);
                        return (
                          <tr key={idx} className="hover:bg-[#F9F7F2]">
                            <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{month.monthName}</td>
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
                    <span className="text-sm font-semibold uppercase tracking-wider">Yearly Totals:</span>
                    <div className="flex flex-wrap gap-8">
                      <div>
                        <p className="text-xs text-white/60">Production</p>
                        <p className="text-xl font-bold">
                          {((totals.totalDayProduction || 0) + (totals.totalNightProduction || 0)).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Sellable</p>
                        <p className="text-xl font-bold">{(totals.totalSellableStock || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Remaining</p>
                        <p className="text-xl font-bold">{(totals.totalRemainingStock || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Waste</p>
                        <p className="text-xl font-bold">{(totals.totalWasteQuantity || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Est. Sold</p>
                        <p className="text-xl font-bold">{(totals.totalEstimatedSold || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Revenue</p>
                        <p className="text-2xl font-bold">
                          {totals.totalEstimatedRevenue ? totals.totalEstimatedRevenue.toLocaleString() : '0'} ETB
                        </p>
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