import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import Modal from '../../components/Modal';
import useBranches from '../../hooks/useBranches';
import { getUser } from '../../utils/authUtils';

export default function BranchesPage() {
  const user = getUser();
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role);

  const { branches, loading, error, fetchBranches, addBranch, editBranch, removeBranch } = useBranches();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await addBranch(formData);
    setSubmitting(false);
    if (result.success) {
      setIsModalOpen(false);
      setFormData({ name: '', address: '', phone: '' });
    }
  };

  const handleEditClick = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await editBranch(editingBranch.id, formData);
    setSubmitting(false);
    if (result.success) {
      setIsEditModalOpen(false);
      setEditingBranch(null);
      setFormData({ name: '', address: '', phone: '' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      await removeBranch(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F]">Branches</h1>
        {canManage && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Branch Name</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                {canManage && <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center text-gray-400">
                    No branches found
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-[#F9F7F2]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{branch.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{branch.address || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{branch.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        branch.isActive !== false 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {branch.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditClick(branch)} className="p-2 text-gray-400 hover:text-[#001F3F] hover:bg-[#F9F7F2] rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(branch.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Branch Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Branch">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Branch Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              placeholder="Enter branch name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Full Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              placeholder="Enter full address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              placeholder="Enter phone number"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Branch">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Branch Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Full Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}