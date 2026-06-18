import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Loader2, Eye, RotateCcw } from 'lucide-react';
import Modal from '../../components/Modal';
import { useBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useBranchMutations } from '../../features/branches/hooks/mutations/useBranchMutations';
import { getUser } from '../../utils/authUtils';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { TableSkeleton } from '../../components/skeletons';

export default function BranchesPage() {
  const { t, i18n } = useTranslation();
  const user = getUser();
  const canManage = user?.role === 'ADMIN';

  const { data: branches, isLoading, error: queryError, refetch } = useBranchesQuery();
  const { addBranch, editBranch, removeBranch, restoreBranch } = useBranchMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeletedModalOpen, setIsDeletedModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({ name: '', name_am: '', address: '', phone: '' });
  const [actionError, setActionError] = useState(null);

  const { data: deletedBranches = [], isLoading: deletedLoading } = useBranchesQuery(
    { isActive: false, limit: 100 },
    { enabled: isDeletedModalOpen }
  );

  const error = actionError || queryError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await addBranch.mutateAsync(formData);
      setIsModalOpen(false);
      setFormData({ name: '', name_am: '', address: '', phone: '' });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await editBranch.mutateAsync({ id: editingBranch.id, data: formData });
      setIsEditModalOpen(false);
      setEditingBranch(null);
      setFormData({ name: '', name_am: '', address: '', phone: '' });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      setActionError(null);
      try {
        await removeBranch.mutateAsync(id);
      } catch (err) {
        setActionError(err.message);
      }
    }
  };

  const handleRestore = async (id) => {
    if (window.confirm('Restore this branch?')) {
      setActionError(null);
      try {
        await restoreBranch.mutateAsync(id);
      } catch (err) {
        setActionError(err.message);
      }
    }
  };

  const handleEditClick = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      name_am: branch.name_am || '',
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setIsEditModalOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-8">
        <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">{t('branches.title')}</h1>
        {canManage && (
          <div className="flex flex-row flex-wrap gap-2">
            <button
              onClick={() => setIsDeletedModalOpen(true)}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Deleted Branches
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('branches.addBranch')}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error?.message || error}
        </div>
      )}

      <div className="bg-white dark:bg-[#12262A] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#DFEDE2]/50 dark:bg-[#1E3A3F]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('branches.branchName')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('branches.address')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('branches.phone')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
                {canManage && <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#1E3A3F]">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4}>
                    <TableSkeleton rows={8} columns={canManage ? 5 : 4} />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4}>
                    <ApiErrorState error={error} onRetry={refetch} />
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
<td colSpan={canManage ? 5 : 4}>
                    <EmptyState type="branches" message={t('branches.noBranchesFound')} />
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#024A5B] dark:text-white">{getLocalizedName(branch, i18n.language)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-500">{branch.address || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-500">{branch.phone || '-'}</td>
                    <td className="px-6 py-4">
<span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          branch.isActive !== false
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                        }`}>
                        {branch.isActive !== false ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditClick(branch)} className="p-2 text-gray-500 dark:text-gray-500 hover:text-[#024A5B] dark:hover:text-white hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(branch.id)} className="p-2 text-gray-500 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
              placeholder="Enter branch name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Amharic Name (Optional)</label>
            <input
              type="text"
              value={formData.name_am || ''}
              onChange={(e) => setFormData({ ...formData, name_am: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
              placeholder="የአማርኛ ስም (አማራጭ)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Full Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
              placeholder="Enter full address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
              placeholder="Enter phone number"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#DFEDE2] transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addBranch.isPending}
              className="flex-1 px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70"
            >
              {addBranch.isPending ? 'Saving...' : 'Save'}
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
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Amharic Name (Optional)</label>
            <input
              type="text"
              value={formData.name_am || ''}
              onChange={(e) => setFormData({ ...formData, name_am: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Full Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
              placeholder="Enter full address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#DFEDE2] transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editBranch.isPending}
              className="flex-1 px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70"
            >
              {editBranch.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deleted Branches Modal */}
      <Modal isOpen={isDeletedModalOpen} onClose={() => setIsDeletedModalOpen(false)} title="Deleted Branches">
        {deletedLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-500" />
          </div>
        ) : deletedBranches.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No deleted branches</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {deletedBranches.map((branch) => (
              <div key={branch.id} className="flex items-center justify-between p-3 bg-[#DFEDE2] rounded-xl">
                <div>
                  <div className="font-medium text-[#024A5B]">{getLocalizedName(branch, i18n.language)}</div>
                  <div className="text-sm text-gray-500">{branch.address || 'No address'}</div>
                </div>
                <button
                  onClick={() => handleRestore(branch.id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-[#E5E1D8]">
          <button
            onClick={() => setIsDeletedModalOpen(false)}
            className="w-full px-6 py-3 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}