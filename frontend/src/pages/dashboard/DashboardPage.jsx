import { Package, DollarSign, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#001F3F] mb-8">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Today's Production */}
        <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 font-medium">Today's Production</span>
            <div className="w-10 h-10 bg-[#D2B48C]/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-[#D2B48C]" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F]">0</p>
          <p className="text-sm text-gray-400 mt-1">items produced</p>
        </div>

        {/* Today's Sales */}
        <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 font-medium">Today's Sales</span>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F]">0 ETB</p>
          <p className="text-sm text-gray-400 mt-1">total revenue</p>
        </div>

        {/* Pending Remaining */}
        <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 font-medium">Pending Remaining</span>
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <p className="text-4xl font-bold text-[#001F3F]">0</p>
          <p className="text-sm text-[#D2B48C] mt-1">Needs attention</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[24px] p-6 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <h2 className="text-xl font-semibold text-[#001F3F] mb-6">Recent Activity</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-[#F9F7F2] rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm">No recent activity</p>
        </div>
      </div>
    </div>
  );
}