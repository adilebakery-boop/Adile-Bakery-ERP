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
  const [productionData, setProductionData] = useState([]);
  const [remainingData, setRemainingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canManageAll = isManagerOrAdmin();

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
      let prodRes, remainRes;
      const params = { operationalDate: date, branchId: branchId || undefined };

      if (activeTab === 'daily') {
        prodRes = await reportService.getProductionReport(params);
        remainRes = await reportService.getRemainingReport(params);
      } else if (activeTab === 'weekly') {
        const startOfWeek = getWeekStart(date);
        prodRes = await reportService.getProductionReport({ startDate: startOfWeek, endDate: date, branchId: branchId || undefined });
        remainRes = await reportService.getRemainingReport({ startDate: startOfWeek, endDate: date, branchId: branchId || undefined });
      } else if (activeTab === 'monthly') {
        const startOfMonth = date.substring(0, 7) + '-01';
        prodRes = await reportService.getProductionReport({ startDate: startOfMonth, endDate: date, branchId: branchId || undefined });
        remainRes = await reportService.getRemainingReport({ startDate: startOfMonth, endDate: date, branchId: branchId || undefined });
      } else {
        prodRes = await reportService.getProductionReport(params);
        remainRes = await reportService.getRemainingReport(params);
      }

      const prodData = prodRes.success ? (prodRes.data?.data || prodRes.data || []) : [];
      const remainData = remainRes.success ? (remainRes.data?.data || remainRes.data || []) : [];

      setProductionData(prodData);
      setRemainingData(remainData);
      setReportData(null);
    } catch (err) {
      setError('Error loading report: ' + (err.message || 'Unknown error'));
      setProductionData([]);
      setRemainingData([]);
    }
setLoading(false);
  };

  const handleExport = async () => {
    if (!mergedProducts.length) return;
    
    const headers = ['Product', 'Category', 'Branch', 'Day Prod', 'Night Prod', 'Sellable', 'Remaining', 'Waste', 'Est. Sold', 'Revenue'];
    const rows = mergedProducts.map(p => [
      p.productName,
      p.category,
      p.branchName,
      p.dayProduction,
      p.nightProduction,
      p.sellableStock,
      p.remainingStock,
      p.wasteQuantity,
      p.estimatedSold,
      p.estimatedRevenue.toFixed(2),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getWeekStart = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const mergedProducts = useMemo(() => {
    const prodMap = new Map();
    
    productionData.forEach((prod) => {
      const key = `${prod.productId}-${prod.branchId}`;
      if (prodMap.has(key)) {
        prodMap.get(key).dayProduction += parseFloat(prod.quantity) || 0;
      } else {
        prodMap.set(key, {
          productId: prod.productId,
          productName: prod.product?.name || 'Unknown',
          category: prod.product?.category || '-',
          branchId: prod.branchId,
          branchName: prod.branch?.name || '-',
          dayProduction: parseFloat(prod.quantity) || 0,
          nightProduction: 0,
          openingStock: 0,
          remainingStock: 0,
          wasteQuantity: 0,
          estimatedSold: 0,
          estimatedRevenue: 0,
          price: parseFloat(prod.product?.price) || 0,
        });
      }
    });

    remainingData.forEach((rem) => {
      const key = `${rem.productId}-${rem.branchId}`;
      if (prodMap.has(key)) {
        prodMap.get(key).remainingStock = parseFloat(rem.quantity) || 0;
      }
    });

    const rows = Array.from(prodMap.values());
    rows.forEach(row => {
      row.sellableStock = row.dayProduction;
      row.estimatedSold = row.dayProduction - row.remainingStock;
      row.estimatedRevenue = row.estimatedSold * row.price;
    });

    return rows;
  }, [productionData, remainingData]);

  const totals = activeTab === 'daily' ? {
    totalDayProduction: mergedProducts.reduce((sum, p) => sum + p.dayProduction, 0),
    totalNightProduction: mergedProducts.reduce((sum, p) => sum + p.nightProduction, 0),
    totalRemainingStock: mergedProducts.reduce((sum, p) => sum + p.remainingStock, 0),
    totalWaste: mergedProducts.reduce((sum, p) => sum + p.wasteQuantity, 0),
    totalEstSold: mergedProducts.reduce((sum, p) => sum + p.estimatedSold, 0),
    totalRevenue: mergedProducts.reduce((sum, p) => sum + p.estimatedRevenue, 0),
  } : {};

  const products = activeTab === 'daily' ? mergedProducts : [];
  const days = [];
  const weeks = [];
  const hasData = activeTab === 'daily' ? products.length > 0 : false;

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
          Export CSV
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
              {['daily', 'weekly', 'monthly'].map((tab) => (
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
                    {(activeTab === 'weekly' || activeTab === 'monthly') && (
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

              {(activeTab === 'weekly' || activeTab === 'monthly') && (
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
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.openingStock}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.dayProduction}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.nightProduction}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.sellableStock}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.remainingStock}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-600">{p.wasteQuantity}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-[#001F3F]">{p.estimatedSold}</td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-[#D2B48C]">
                            {p.estimatedRevenue ? `${p.estimatedRevenue.toLocaleString()} ETB` : '-'}
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
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalWasteQuantity || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">Est. Sold</p>
                        <p className="text-xl font-bold text-[#001F3F]">{totals.totalEstimatedSold || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#001F3F]/60">Revenue</p>
                        <p className="text-2xl font-bold text-[#001F3F]">
                          {totals.totalEstimatedRevenue ? `${totals.totalEstimatedRevenue.toLocaleString()} ETB` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {activeTab !== 'daily' && products.length > 0 && (
                  <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
                    Showing aggregated data for selected period.
                  </div>
                )}
              </>
            )}

            {activeTab === 'weekly' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {days.map((day, idx) => (
                    <div key={idx} className="bg-[#F9F7F2] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-[#001F3F]">{day.dayName}</span>
                        <span className="text-xs text-gray-400">{day.date}</span>
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
                        <p className="text-xl font-bold">{totals.totalEstimatedSold || 0}</p>
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
                              Week {idx + 1} <span className="text-gray-400 font-normal text-xs ml-2">({week.weekStartDate})</span>
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
                          {(totals.totalDayProduction || 0) + (totals.totalNightProduction || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Remaining</p>
                        <p className="text-xl font-bold">{totals.totalRemainingStock || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60">Est. Sold</p>
                        <p className="text-xl font-bold">{totals.totalEstimatedSold || 0}</p>
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