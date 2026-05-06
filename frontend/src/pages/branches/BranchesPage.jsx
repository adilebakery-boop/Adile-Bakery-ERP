import { Plus, Edit2, Trash2 } from 'lucide-react';

const branches = [
  { id: 1, name: 'Main Branch', address: 'Addis Ababa, Bole', phone: '+251 911 123 456', status: 'Active' },
  { id: 2, name: 'Branch 1', address: 'Addis Ababa, Piassa', phone: '+251 911 234 567', status: 'Active' },
  { id: 3, name: 'Branch 2', address: 'Addis Ababa, CMC', phone: '+251 911 345 678', status: 'Inactive' },
];

export default function BranchesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F]">Branches</h1>
        <button className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Branch Name</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-[#F9F7F2]">
                  <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{branch.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{branch.address}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{branch.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      branch.status === 'Active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {branch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-[#001F3F] hover:bg-[#F9F7F2] rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}