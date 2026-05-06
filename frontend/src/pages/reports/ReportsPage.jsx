import { useState } from 'react';
import { Calendar, ChevronDown, Download } from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState('2026-05-07');
  const [branch, setBranch] = useState('second');

  const summary = {
    production: 150,
    remaining: 45,
    sales: 120,
    revenue: 45000
  };

  const products = [
    { name: 'White Bread', category: 'Bread', branch: 'Second Branch', morning: 45, night: 30, total: 75, remaining: 15, sales: 60, revenue: 2100 },
    { name: 'Whole Wheat', category: 'Bread', branch: 'Second Branch', morning: 30, night: 25, total: 55, remaining: 10, sales: 45, revenue: 1800 },
    { name: 'Sourdough', category: 'Bread', branch: 'Second Branch', morning: 20, night: 15, total: 35, remaining: 8, sales: 27, revenue: 1485 },
    { name: 'Chocolate Cake', category: 'Cake', branch: 'Second Branch', morning: 10, night: 8, total: 18, remaining: 3, sales: 15, revenue: 3750 },
    { name: 'Vanilla Cake', category: 'Cake', branch: 'Second Branch', morning: 8, night: 6, total: 14, remaining: 2, sales: 12, revenue: 2640 },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F]">Reports</h1>
        <button className="bg-[#001F3F] text-white px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-[#001a35] transition-colors">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        {/* Filter Bar */}
        <div className="p-6 border-b border-[#E5E1D8]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Segmented Tabs */}
            <div className="flex bg-[#F9F7F2] rounded-[50px] p-1 w-fit">
              {['daily', 'weekly', 'monthly'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2.5 rounded-[40px] text-sm font-medium transition-all ${
                    activeTab === tab 
                      ? 'bg-white text-[#001F3F] shadow-sm' 
                      : 'text-gray-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Filters */}
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
              <div className="relative">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="px-4 py-2.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm appearance-none pr-10 min-w-[160px]"
                >
                  <option value="second">Second Branch</option>
                  <option value="main">Main Branch</option>
                  <option value="all">All Branches</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Morning</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Night</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Production</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Remaining</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Sales</th>
                <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {products.map((product, idx) => (
                <tr key={idx} className="hover:bg-[#F9F7F2]">
                  <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{product.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{product.branch}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.morning}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.night}</td>
                  <td className="px-6 py-4 text-sm font-medium text-[#001F3F]">{product.total}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.remaining}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.sales}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-[#D2B48C]">{product.revenue.toLocaleString()} ETB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="bg-[#D2B48C] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-sm font-semibold text-[#001F3F] uppercase tracking-wider">Total Branch Summary:</span>
            <div className="flex flex-wrap gap-6 lg:gap-10">
              <div>
                <p className="text-xs text-[#001F3F]/60">Production</p>
                <p className="text-xl font-bold text-[#001F3F]">{summary.production}</p>
              </div>
              <div>
                <p className="text-xs text-[#001F3F]/60">Remaining</p>
                <p className="text-xl font-bold text-[#001F3F]">{summary.remaining}</p>
              </div>
              <div>
                <p className="text-xs text-[#001F3F]/60">Sales</p>
                <p className="text-xl font-bold text-[#001F3F]">{summary.sales}</p>
              </div>
              <div>
                <p className="text-xs text-[#001F3F]/60">Revenue</p>
                <p className="text-2xl font-bold text-[#001F3F]">{summary.revenue.toLocaleString()} ETB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}