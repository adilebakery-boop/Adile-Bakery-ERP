import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Shield, ShieldOff } from 'lucide-react';
import Modal from '../../components/Modal';
import { getUser, isManagerOrAdmin } from '../../utils/authUtils';
import userService from '../../services/userService';
import branchService from '../../services/branchService';

const ROLES = [
  { value: 'CASHIER', label: 'Cashier', id: 7 },
  { value: 'FETIR_CHEF', label: 'Fetir Chef', id: 6 },
  { value: 'COOKIE_BAKER', label: 'Cookie Baker', id: 5 },
  { value: 'CAKE_CHEF', label: 'Cake Chef', id: 4 },
  { value: 'BAKER', label: 'Baker', id: 3 },
  { value: 'MANAGER', label: 'Manager', id: 2 },
  { value: 'ADMIN', label: 'Admin', id: 1 },
];

export default function UsersPage() {
  const canManage = isManagerOrAdmin();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: '', branchId: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadBranches();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    const res = await userService.getUsers();
    if (res.success) {
      setUsers(res.data?.users || res.data || []);
    } else {
      setError(res.message || 'Failed to load users');
    }
    setLoading(false);
  };

  const loadBranches = async () => {
    const res = await branchService.getActiveBranches();
    if (res.success) {
      setBranches(res.data || []);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const roleObj = ROLES.find(r => r.value === formData.role);
    const submitData = {
      name: formData.name,
      username: formData.username,
      password: formData.password,
      roleId: roleObj?.id,
      branchId: parseInt(formData.branchId),
    };
    
    const res = await userService.createUser(submitData);
    setSubmitting(false);
    if (res.success) {
      setIsModalOpen(false);
      setFormData({ name: '', username: '', password: '', role: '', branchId: '' });
      await loadUsers();
    } else {
      setError(res.message);
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
    setSubmitting(true);
    
    const roleObj = ROLES.find(r => r.value === formData.role);
    const submitData = {
      name: formData.name,
      username: formData.username,
      roleId: roleObj?.id,
      branchId: parseInt(formData.branchId),
    };
    
    if (formData.password) {
      submitData.password = formData.password;
    }
    
    const res = await userService.updateUser(editingUser.id, submitData);
    setSubmitting(false);
    if (res.success) {
      setIsEditModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', username: '', password: '', role: '', branchId: '' });
      await loadUsers();
    } else {
      setError(res.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const res = await userService.deleteUser(id);
      if (res.success) {
        await loadUsers();
      } else {
        setError(res.message);
      }
    }
  };

  const handleToggleBlock = async (user) => {
    try {
      const newStatus = !user.isBlocked;
      const res = await userService.updateUser(user.id, { isBlocked: newStatus });
      if (res.success) {
        await loadUsers();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const isAdminOrManagerRole = (roleName) => {
    return roleName === 'ADMIN' || roleName === 'MANAGER';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F]">Users</h1>
        {canManage && (
          <button onClick={() => setIsModalOpen(true)} className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Status</th>
                {canManage && <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F9F7F2]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role?.name === 'ADMIN' || user.role?.name === 'MANAGER' ? 'bg-[#001F3F] text-white' : 'bg-[#F9F7F2] text-gray-700'}`}>
                        {user.role?.name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.branch?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isBlocked ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isAdminOrManagerRole(user.role?.name) && (
                            <button 
                              onClick={() => handleToggleBlock(user)} 
                              className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                              title={user.isBlocked ? 'Unblock' : 'Block'}
                            >
                              {user.isBlocked ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                            </button>
                          )}
                          <button onClick={() => handleEditClick(user)} className="p-2 text-gray-400 hover:text-[#001F3F] hover:bg-[#F9F7F2] rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add User">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter full name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Username</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter username" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter password" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Role</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">Select role</option>
              {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Branch</label>
            <select value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Username</label>
            <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Role</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">Select role</option>
              {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Branch</label>
            <select value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">Select branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">New Password (leave blank to keep current)</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter new password" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}