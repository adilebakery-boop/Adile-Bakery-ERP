import { useState, useEffect, useRef } from 'react';
import { Plus, Package, Loader2, RefreshCw, Edit2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import Modal from '../../components/Modal';
import { getUserRole, getUserBranchId, getUserId, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
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
  const [selectedProductUnitType, setSelectedProductUnitType] = useState(null);
  const today = new Date();
  const maxDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 2);
  const minDateStr = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;

  const [productionDate, setProductionDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [branch, setBranch] = useState('');
  const [shift, setShift] = useState('');
  const [quantity, setQuantity] = useState('');
  const [groupedEntries, setGroupedEntries] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const loadProductionsRef = useRef(0);

  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const allowedCategories = getCategoriesForRole(userRole);
  const canManageAll = isManagerOrAdmin();

  const calculatedOperationalDate = (() => {
    if (!productionDate || !shift) return null;
    const prodDate = new Date(productionDate);
    prodDate.setHours(0, 0, 0, 0);
    if (shift === 'NIGHT') {
      prodDate.setDate(prodDate.getDate() + 1);
    }
    return `${prodDate.getFullYear()}-${String(prodDate.getMonth() + 1).padStart(2, '0')}-${String(prodDate.getDate()).padStart(2, '0')}`;
  })();

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
        if (!canManageAll && userBranchId) {
          setBranch(userBranchId.toString());
        }
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
    setIsLoadingBranches(false);
  };

  const loadProductions = async () => {
    const requestId = ++loadProductionsRef.current;
    setIsLoadingEntries(true);
    try {
      const params = {};
      if (canManageAll && branch) {
        params.branchId = parseInt(branch);
      } else if (!canManageAll) {
        params.branchId = userBranchId;
      }
      const result = await productionService.getProductionsGrouped(params);
      if (requestId === loadProductionsRef.current && result.success && result.data) {
        setGroupedEntries(result.data || []);
      }
    } catch (err) {
      if (requestId === loadProductionsRef.current) {
        console.error('Error loading productions:', err);
      }
    }
    if (requestId === loadProductionsRef.current) {
      setIsLoadingEntries(false);
    }
  };

  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const getGroupKey = (group) => {
    return `${group.productId}-${group.branchId}-${group.operationalDate}`;
  };

  const totalPages = Math.ceil(groupedEntries.length / itemsPerPage);
  const paginatedGroups = groupedEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [groupedEntries.length, branch]);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  useEffect(() => {
    loadProducts();
    loadBranches();
    loadProductions();
  }, [userRole, userBranchId, branch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const requiredBranch = branch || userBranchId;
    if (!product || !requiredBranch || !shift || !quantity) {
      setError('All fields are required');
      return;
    }

    if (productionDate < minDateStr || productionDate > maxDateStr) {
      setError('Production date must be within the last 2 days or today');
      return;
    }

    if (selectedProductUnitType === 'piece') {
      const qty = parseFloat(quantity);
      if (!Number.isInteger(qty)) {
        setError('Quantity for piece products must be a whole number (no decimals)');
        return;
      }
    }

    setIsSubmitting(true);

    const result = await productionService.createProduction({
      productId: parseInt(product),
      branchId: parseInt(requiredBranch),
      shift,
      quantity: parseFloat(quantity),
      productionDate,
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

  const isEditable = (operationalDateStr) => {
    if (!operationalDateStr) return false;
    const [y, m, d] = operationalDateStr.split('-');
    const opDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - opDate) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < 3;
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

    if (editingEntry?.product?.unitType === 'piece') {
      const qty = parseFloat(editFormData.quantity);
      if (!Number.isInteger(qty)) {
        setError('Quantity for piece products must be a whole number (no decimals)');
        setIsSubmitting(false);
        return;
      }
    }

    const updatePayload = {
      quantity: parseFloat(editFormData.quantity),
    };

    if (editFormData.shift !== editingEntry?.shift) {
      updatePayload.shift = editFormData.shift;
    }

    console.log('Updating production:', editingEntry.id, updatePayload);
    try {
      const result = await productionService.updateProduction(editingEntry.id, updatePayload);
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
          <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">Production</h1>
          <p className="text-sm text-gray-400 mt-1">
            Production Date: {productionDate ? formatOperationalDate(productionDate) : '-'}
            {calculatedOperationalDate && calculatedOperationalDate !== productionDate && (
              <span className="ml-2 text-[#D2B48C]">→ Sales Day: {formatOperationalDate(calculatedOperationalDate)}</span>
            )}
          </p>
</div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Production">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Product</label>
            <input 
              type="text" 
              value={editingEntry?.product?.name || ''} 
              disabled 
              className="w-full px-4 py-3.5 bg-gray-100 dark:bg-[#2d2d4a] border-0 rounded-xl text-sm dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Shift</label>
            <select 
              value={editFormData.shift} 
              onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              required
            >
              <option value="">Select shift</option>
              {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Quantity</label>
            <input 
              type="number" 
              value={editFormData.quantity} 
              onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              required
              step={editingEntry?.product?.unitType === 'piece' ? '1' : '0.01'}
              min="0"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-6 py-3.5 border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] transition-colors text-sm"
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
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 mb-8 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="w-44">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Production Date</label>
            <input
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              required
              disabled={isSubmitting}
              min={minDateStr}
              max={maxDateStr}
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Product</label>
            {isLoadingProducts ? (
              <div className="flex items-center gap-2 px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-400 dark:text-gray-500">Loading...</span>
              </div>
            ) : (
              <select
                value={product}
                onChange={(e) => {
                  setProduct(e.target.value);
                  const selected = availableProducts.find(p => p.id === parseInt(e.target.value));
                  setSelectedProductUnitType(selected?.unitType || null);
                  setQuantity('');
                }}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
                required
                disabled={isSubmitting}
              >
                <option value="">Select product ({availableProducts.length})</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({getCategoryLabel(p.category)}) [{p.unitType}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {canManageAll && (
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              placeholder="0"
              required
              disabled={isSubmitting}
              min="0"
              step={selectedProductUnitType === 'piece' ? '1' : '0.01'}
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

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="px-6 py-5 border-b border-[#E5E1D8] dark:border-[#2d2d4a] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#001F3F] dark:text-white">
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
        ) : groupedEntries.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10"></th>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Operation Date</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Entries</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Produced</th>
                {canManageAll && (
                  <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Branch</th>
                )}
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
              {paginatedGroups.map((group) => {
                const groupKey = getGroupKey(group);
                const isExpanded = expandedGroups[groupKey];
                const [y, m, d] = group.operationalDate.split('-');
                const formattedDate = `${d}/${m}/${y}`;
                return (
                  <>
                    <tr 
                      key={groupKey} 
                      className="hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] cursor-pointer transition-colors"
                      onClick={() => toggleGroupExpand(groupKey)}
                    >
                      <td className="px-6 py-3.5">
                        <button className="p-1 text-gray-400 hover:text-[#001F3F] dark:hover:text-white transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-[#001F3F] dark:text-white">
                        {group.product?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F9F7F2] dark:bg-[#2d2d4a] text-gray-600 dark:text-gray-300">
                          {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm font-bold text-[#001F3F] dark:text-white">
                        {Number(group.totalQuantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      {canManageAll && (
                        <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                          {group.branch?.name || '-'}
                        </td>
                      )}
                      <td className="px-6 py-3.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleGroupExpand(groupKey); }}
                          className="text-xs font-medium text-[#001F3F] dark:text-[#D2B48C] hover:underline"
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={canManageAll ? 7 : 6} className="p-0">
                          <div className="bg-[#F9F7F2]/40 dark:bg-[#2d2d4a]/40 border-l-4 border-[#D2B48C] dark:border-[#D2B48C]/50 ml-6 mr-3 my-1 rounded-r-lg">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-[#E5E1D8]/50 dark:border-[#2d2d4a]/50">
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Time & Date</th>
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Shift</th>
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quantity</th>
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">User</th>
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E1D8]/30 dark:divide-[#2d2d4a]/30">
                                {group.entries.map((entry) => {
                                  const entryDate = new Date(entry.createdAt);
                                  const entryTime = entryDate.toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour: '2-digit', minute: '2-digit', hour12: true });
                                  const entryFormattedDate = entryDate.toLocaleDateString('en-GB', { timeZone: 'Africa/Addis_Ababa', day: '2-digit', month: '2-digit', year: 'numeric' });
                                  return (
                                    <tr key={entry.id} className="hover:bg-[#F9F7F2]/60 dark:hover:bg-[#2d2d4a]/60">
                                      <td className="px-6 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                                        <span className="font-medium">{entryTime}</span>
                                        <span className="text-gray-400 dark:text-gray-500">&nbsp;{entryFormattedDate}</span>
                                      </td>
                                      <td className="px-6 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                                        {getShiftLabel(entry.shift)}
                                      </td>
                                      <td className="px-6 py-2.5 text-xs font-semibold text-[#001F3F] dark:text-white">
                                        {Number(entry.quantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-6 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                                        {entry.creator?.name || entry.creator?.username || '-'}
                                      </td>
                                      <td className="px-6 py-2.5">
                                        {isEditable(group.operationalDate) ? (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }} 
                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#001F3F] dark:text-[#D2B48C] hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] rounded-md transition-colors"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            Edit
                                          </button>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 dark:text-gray-500 cursor-not-allowed" title="Editing allowed only within 3 operational days">
                                            <Lock className="w-3 h-3" />
                                            Locked
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
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

        {!isLoadingEntries && groupedEntries.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#2d2d4a]">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, groupedEntries.length)} of {groupedEntries.length} production groups
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}