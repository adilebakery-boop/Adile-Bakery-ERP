import { useState, useEffect } from 'react';
import { Plus, Package, Loader2, RefreshCw, Edit2 } from 'lucide-react';
import Modal from '../../components/Modal';
import { getUserRole, getUserBranchId, getUserId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getCategoriesForRole, CATEGORIES } from '../../utils/permissions';
import productionService from '../../services/productionService';
import productService from '../../services/productService';
import branchService from '../../services/branchService';

const SHIFTS = [
  { value: 'DAY', label: 'Day 7:30-7:30' },
  { value: 'NIGHT', label: 'Night 9:00-12:30' },
];

const CATEGORY_LABELS = {
  [CATEGORIES.BREAD_AND_SWEET_BREADS]: 'Bread & Sweet Breads',
  [CATEGORIES.CREAM_CAKES]: 'Cream Cakes',
  [CATEGORIES.SOFT_CAKES]: 'Soft Cakes',
  [CATEGORIES.DRY_CAKES]: 'Dry Cakes',
  [CATEGORIES.COOKIES]: 'Cookies',
  [CATEGORIES.FETIRE_AND_SNACKS]: 'Fetire & Snacks',
  [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: 'Drinks & Retail',
};

export default function ProductionPage() {
  const [product, setProduct] = useState('');
  const [branch, setBranch] = useState('');
  const [shift, setShift] = useState('');
  const [quantity, setQuantity] = useState('');
  const [entries, setEntries] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({ quantity: '', shift: '' });

  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const allowedCategories = getCategoriesForRole(userRole);
  const canManageAll = isManagerOrAdmin();
  const operationalDate = getOperationalDate();

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    setError('');
    try {
      const result = await productService.getProducts({ isActive: true, limit: 100 });
      if (result.success && result.data) {
        const filtered = result.data.filter(p => allowedCategories.includes(p.category));
        setAvailableProducts(filtered);
      } else {
        setError(result.message || 'Failed to load products');
      }
    } catch (err) {
      setError('Error loading products: ' + err.message);
    }
    setIsLoadingProducts(false);
  };

  const loadBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const result = await branchService.getActiveBranches();
      if (result.success && result.data) {
        setBranches(result.data);
        if (userBranchId) {
          setBranch(userBranchId.toString());
        }
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
    setIsLoadingBranches(false);
  };

  const loadProductions = async () => {
    setIsLoadingEntries(true);
    try {
      const params = {};
      if (canManageAll && branch) {
        params.branchId = parseInt(branch);
      } else if (!canManageAll) {
        params.branchId = userBranchId;
      }
      const result = await productionService.getProductions(params);
      if (result.success && result.data) {
        setEntries(result.data || []);
      }
    } catch (err) {
      console.error('Error loading productions:', err);
    }
    setIsLoadingEntries(false);
  };

  useEffect(() => {
    loadProducts();
    loadBranches();
    loadProductions();
  }, [userRole, userBranchId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const requiredBranch = branch || userBranchId;
    if (!product || !requiredBranch || !shift || !quantity) {
      setError('All fields are required');
      return;
    }

    setIsSubmitting(true);

    const result = await productionService.createProduction({
      productId: parseInt(product),
      branchId: parseInt(requiredBranch),
      shift,
      quantity: parseFloat(quantity),
      operationalDate,
    });

    setIsSubmitting(false);

    if (result.success) {
      setSuccess('Production recorded successfully!');
      loadProductions();
      setProduct('');
      setQuantity('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.message || 'Failed to record production');
    }
  };

  const getShiftLabel = (shiftValue) => {
    return SHIFTS.find(s => s.value === shiftValue)?.label || shiftValue;
  };

  const getCategoryLabel = (category) => {
    return CATEGORY_LABELS[category] || category;
  };

  const handleEditClick = (entry) => {
    setEditingEntry(entry);
    setEditFormData({
      quantity: entry.quantity.toString(),
      shift: entry.shift,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    console.log('Updating production:', editingEntry.id, { quantity: editFormData.quantity, shift: editFormData.shift });
    try {
      const result = await productionService.updateProduction(editingEntry.id, {
        quantity: parseFloat(editFormData.quantity),
        shift: editFormData.shift,
      });
      console.log('Update result:', result);

      setIsSubmitting(false);

      if (result.success) {
        setSuccess('Production updated successfully!');
        loadProductions();
        setIsEditModalOpen(false);
        setEditingEntry(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to update production');
      }
    } catch (err) {
      console.error('Update error:', err);
      setIsSubmitting(false);
      setError('Error updating production: ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F]">Production</h1>
          <p className="text-sm text-gray-400 mt-1">Operational Date: {formatOperationalDate(operationalDate)}</p>
</div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Production">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Product</label>
            <input 
              type="text" 
              value={editingEntry?.product?.name || ''} 
              disabled 
              className="w-full px-4 py-3.5 bg-gray-100 border-0 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Shift</label>
            <select 
              value={editFormData.shift} 
              onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
            >
              <option value="">Select shift</option>
              {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Quantity</label>
            <input 
              type="number" 
              value={editFormData.quantity} 
              onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
              step="0.01"
              min="0"
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
              disabled={isSubmitting}
              className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-[24px] p-6 mb-8 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-600 mb-2">Product</label>
            {isLoadingProducts ? (
              <div className="flex items-center gap-2 px-4 py-3.5 bg-[#F9F7F2] rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading...</span>
              </div>
            ) : (
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                required
                disabled={isSubmitting}
              >
                <option value="">Select product ({availableProducts.length})</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({getCategoryLabel(p.category)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {canManageAll && (
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-600 mb-2">Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                required
                disabled={isSubmitting}
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-600 mb-2">Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
              disabled={isSubmitting}
            >
              <option value="">Select shift</option>
              {SHIFTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className="block text-sm font-medium text-gray-600 mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              placeholder="0"
              required
              disabled={isSubmitting}
              min="0"
              step="0.01"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Record Production
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="px-6 py-5 border-b border-[#E5E1D8] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            {canManageAll ? 'All Production Records' : "Today's Entries"}
          </h2>
          <button
            onClick={() => loadProductions()}
            className="p-2 hover:bg-[#F9F7F2] rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {isLoadingEntries ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : entries.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Qty</th>
                {canManageAll && (
                  <>
                    <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Recorded By</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
{entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#F9F7F2]">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(entry.createdAt).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">
                    {entry.product?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getShiftLabel(entry.shift)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#001F3F]">
                    {entry.quantity}
                  </td>
                  {canManageAll && (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {entry.branch?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {entry.creator?.name || entry.creator?.username || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleEditClick(entry)} 
                          className="p-2 text-gray-400 hover:text-[#001F3F] hover:bg-[#F9F7F2] rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-[#F9F7F2] rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">No entries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}