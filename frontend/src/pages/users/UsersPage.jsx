import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Loader2, Shield, ShieldOff, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../../components/Modal';
import { getUser, isManagerOrAdmin } from '../../utils/authUtils';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { useUsersQuery } from '../../features/users/hooks/queries/useUsersQuery';
import { useCreateUserMutation } from '../../features/users/hooks/mutations/useCreateUserMutation';
import { useUpdateUserMutation } from '../../features/users/hooks/mutations/useUpdateUserMutation';
import { useDeleteUserMutation } from '../../features/users/hooks/mutations/useDeleteUserMutation';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';

const ALL_ROLES = [
  { value: 'CASHIER', labelKey: 'cashier', id: 7 },
  { value: 'FETIR_CHEF', labelKey: 'fetirChef', id: 6 },
  { value: 'COOKIE_BAKER', labelKey: 'cookieBaker', id: 5 },
  { value: 'CAKE_CHEF', labelKey: 'cakeChef', id: 4 },
  { value: 'BAKER', labelKey: 'baker', id: 3 },
  { value: 'MANAGER', labelKey: 'manager', id: 2 },
  { value: 'ADMIN', labelKey: 'admin', id: 1 },
];

const OPERATIONAL_ROLES = ['BAKER', 'CAKE_CHEF', 'COOKIE_BAKER', 'FETIR_CHEF', 'CASHIER'];

const getRoleKey = (roleName) => {
  const roleMap = {
    'ADMIN': 'admin',
    'MANAGER': 'manager',
    'BAKER': 'baker',
    'CAKE_CHEF': 'cakeChef',
    'COOKIE_BAKER': 'cookieBaker',
    'FETIR_CHEF': 'fetirChef',
    'CASHIER': 'cashier',
  };
  return roleMap[roleName] || roleName.toLowerCase();
};

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const canManage = isManagerOrAdmin();
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';

  const getAllowedRoles = () => {
    if (isAdmin) return ALL_ROLES;
    if (isManager) return ALL_ROLES.filter(r => OPERATIONAL_ROLES.includes(r.value));
    return [];
  };

  const canUserEditTarget = (targetRole) => {
    if (isAdmin) return true;
    if (isManager && targetRole !== 'ADMIN' && targetRole !== 'MANAGER') return true;
    return false;
  };

  const canUserDeleteTarget = (targetRole) => {
    if (isAdmin) return true;
    if (isManager && targetRole !== 'ADMIN' && targetRole !== 'MANAGER') return true;
    return false;
  };

  const canUserBlockTarget = (targetRole) => {
    if (isAdmin) return true;
    if (isManager && targetRole !== 'ADMIN' && targetRole !== 'MANAGER') return true;
    return false;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: '', branchId: '' });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: users = [], isLoading: loading } = useUsersQuery();
  const { data: branches = [] } = useActiveBranchesQuery();

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (paginatedUsers.length === 0 && currentPage > 1 && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const roleObj = getAllowedRoles().find(r => r.value === formData.role);
    const submitData = {
      name: formData.name,
      username: formData.username,
      password: formData.password,
      roleId: roleObj?.id,
    };

    if (formData.role === 'MANAGER' && isAdmin) {
      submitData.branchId = null;
    } else if (formData.branchId) {
      submitData.branchId = parseInt(formData.branchId);
    }

    try {
      await createMutation.mutateAsync(submitData);
      setIsModalOpen(false);
      setFormData({ name: '', username: '', password: '', role: '', branchId: '' });
    } catch (err) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role?.name || '',
      branchId: user.branchId ? String(user.branchId) : ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const roleObj = getAllowedRoles().find(r => r.value === formData.role);
    const submitData = {
      name: formData.name,
      username: formData.username,
      roleId: roleObj?.id,
    };

    if (formData.role === 'MANAGER' && isAdmin) {
      submitData.branchId = null;
    } else if (formData.branchId) {
      submitData.branchId = parseInt(formData.branchId);
    }

    if (formData.password) {
      submitData.password = formData.password;
    }

    try {
      await updateMutation.mutateAsync({ id: editingUser.id, data: submitData });
      setIsEditModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', username: '', password: '', role: '', branchId: '' });
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id, targetRole) => {
    if (!canUserDeleteTarget(targetRole)) return;
    if (window.confirm('Are you sure you want to deactivate this user? Their historical data will be preserved but they will no longer be able to log in.')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        setError(err.message || 'Failed to deactivate user');
      }
    }
  };

  const handleToggleBlock = async (user) => {
    if (!canUserBlockTarget(user.role?.name)) return;
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: { isBlocked: !user.isBlocked },
      });
    } catch (err) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const isAdminOrManagerRole = (roleName) => {
    return roleName === 'ADMIN' || roleName === 'MANAGER';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('users.title')}</h1>
        {canManage && (
          <button onClick={() => setIsModalOpen(true)} className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('users.addUser')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50 dark:bg-[#2d2d4a]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('users.fullName')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('users.username')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('users.role')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('users.branch')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
                {canManage && <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">{t('users.noUsersFound')}</td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#001F3F] dark:text-white">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role?.name === 'ADMIN' || user.role?.name === 'MANAGER' ? 'bg-[#001F3F] text-white dark:bg-[#001F3F]/80' : 'bg-[#F9F7F2] text-gray-700 dark:bg-[#2d2d4a] dark:text-gray-300'}`}>
                        {user.role?.name ? t(`roles.${getRoleKey(user.role.name)}`) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.branch ? getLocalizedName(user.branch, i18n.language) : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isBlocked ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {user.isBlocked ? t('common.blocked') : t('common.active')}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canUserBlockTarget(user.role?.name) && (
                            <button
                              onClick={() => handleToggleBlock(user)}
                              className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
                              title={user.isBlocked ? 'Unblock' : 'Block'}
                            >
                              {user.isBlocked ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                            </button>
                          )}
                          {canUserEditTarget(user.role?.name) && (
                            <button onClick={() => handleEditClick(user)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#001F3F] dark:hover:text-white hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canUserDeleteTarget(user.role?.name) && (
                            <button onClick={() => handleDelete(user.id, user.role?.name)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && users.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#2d2d4a]">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, users.length)} of {users.length} users
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
                Page {currentPage} of {totalPages}
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
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add User">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter full name" required disabled={createMutation.isPending} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Username</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter username" required disabled={createMutation.isPending} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter password" required disabled={createMutation.isPending} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Role</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value, branchId: '' })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required disabled={createMutation.isPending}>
              <option value="">{t('users.selectRole')}</option>
              {getAllowedRoles().map((role) => <option key={role.value} value={role.value}>{t(`roles.${role.labelKey}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Branch {formData.role === 'MANAGER' && isAdmin ? '(All Branches)' : ''}
            </label>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required={!(formData.role === 'MANAGER' && isAdmin)}
              disabled={formData.role === 'MANAGER' && isAdmin || createMutation.isPending}
            >
              <option value="">{formData.role === 'MANAGER' && isAdmin ? 'All Branches' : 'Select branch'}</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm" disabled={createMutation.isPending}>Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{createMutation.isPending ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required disabled={updateMutation.isPending} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Username</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required disabled={updateMutation.isPending} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Role</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required disabled={updateMutation.isPending}>
              <option value="">{t('users.selectRole')}</option>
              {getAllowedRoles().map((role) => <option key={role.value} value={role.value}>{t(`roles.${role.labelKey}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Branch {formData.role === 'MANAGER' ? '(All Branches)' : ''}
            </label>
            <select
              value={formData.branchId}
              onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required={formData.role !== 'MANAGER'}
              disabled={formData.role === 'MANAGER' || updateMutation.isPending}
            >
              <option value="">{formData.role === 'MANAGER' ? 'All Branches' : 'Select branch'}</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">New Password (leave blank to keep current)</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter new password" disabled={updateMutation.isPending} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm" disabled={updateMutation.isPending}>Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{updateMutation.isPending ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
