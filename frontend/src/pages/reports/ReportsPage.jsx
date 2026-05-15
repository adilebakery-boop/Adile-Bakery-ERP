import { useState, useEffect } from 'react';
import { Calendar, Download, Loader2, ChevronDown, AlertCircle, TrendingUp, Package, ArrowRight } from 'lucide-react';
import { getUserBranchId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import reportService from '../../services/reportService';
import branchService from '../../services/branchService';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(getOperationalDate());
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canManageAll = isManagerOrAdmin();

  useEffect(() => {
    if (canManageAll) loadBranches();
  }, [canManageAll]);

  useEffect(() => {
    if (date) {
      loadReport();
    }
  }, [activeTab, date, branchId]);

  const loadBranches = async () => {
    const res = await branchService.getActiveBranches();
    if (res.success) {
      setBranches(res.data || []);
      setBranchId('');
    }
  };

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      const params = { operationalDate: date };
      if (branchId) params.branchId = branchId;

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
      const params = { operationalDate: date };
      if (branchId) params.branchId = branchId;
      const res = await reportService.exportToCSV(params);
      if (res.success && res.data) {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-report-${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        console.error('Export failed:', res.message);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const totals = reportData?.totals || {};
  const products = reportData?.products || [];
  const days = reportData?.days || [];
  const weeks = reportData?.weeks || [];
  const hasData = activeTab === 'daily' ? products.length > 0 : activeTab === 'weekly' ? days.length > 0 : weeks.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F]">Reports</h1>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report - {formatOperationalDate(date)}
            {reportData?.branchName ? ` — ${reportData.branchName}` : ''}
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

            <div className="flex gap-3">
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
                      className="px-4 py-3 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm appearance-none pr-10 min-w-[160px]"
                    >
                      <option value="">All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
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
                          {reportData.branchName === 'All Branches'
                            ? (p.branchNames ? p.branchNames.join(', ') : p.branchName || '-')
                            : (reportData.branchName || '-')
                          }
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

                {reportData.source === 'snapshot' && (
                  <div className="px-6 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
                    This report is from a closed day (snapshot taken at closure).
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