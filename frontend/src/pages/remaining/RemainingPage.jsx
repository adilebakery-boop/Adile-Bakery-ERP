import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, Clock, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { getUserRole, getUserBranchId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getCategoriesForRole, CATEGORIES } from '../../utils/permissions';
import remainingService from '../../services/remainingService';
import productService from '../../services/productService';
import branchService from '../../services/branchService';

const CATEGORY_LABELS = {
  [CATEGORIES.BREAD_AND_SWEET_BREADS]: 'Bread & Sweet Breads',
  [CATEGORIES.CREAM_CAKES]: 'Cream Cakes',
  [CATEGORIES.SOFT_CAKES]: 'Soft Cakes',
  [CATEGORIES.DRY_CAKES]: 'Dry Cakes',
  [CATEGORIES.COOKIES]: 'Cookies',
  [CATEGORIES.FETIRE_AND_SNACKS]: 'Fetire & Snacks',
  [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: 'Drinks & Retail',
};

export default function RemainingPage() {
  const [products, setProducts] = useState([]);
  const [existingRemainings, setExistingRemainings] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRemainings, setLoadingRemainings] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unsaved, setUnsaved] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const allowedCategories = getCategoriesForRole(userRole);
  const operationalDate = getOperationalDate();
  const canManageAll = isManagerOrAdmin();

  const effectiveBranchId = canManageAll ? selectedBranchId : userBranchId;

  useEffect(() => {
    loadProducts();
    loadRemainings();
    if (canManageAll) {
      loadBranches();
    }
  }, [userRole, userBranchId, operationalDate, canManageAll, selectedBranchId]);

  const loadBranches = async () => {
    try {
      const result = await branchService.getActiveBranches();
      if (result.success && result.data) {
        setBranches(result.data);
        if (!selectedBranchId && result.data.length > 0) {
          setSelectedBranchId(result.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const handleBranchChange = (e) => {
    const branchId = parseInt(e.target.value);
    setSelectedBranchId(branchId);
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await productService.getProducts({ isActive: true, limit: 100 });
      if (res.success) {
        const filtered = (res.data || []).filter(p => allowedCategories.includes(p.category));
        setProducts(filtered);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
    setLoadingProducts(false);
  };

  const loadRemainings = async () => {
    if (!effectiveBranchId) {
      setLoadingRemainings(false);
      return;
    }
    setLoadingRemainings(true);
    try {
      const res = await remainingService.getByOperationalDate(operationalDate, { branchId: effectiveBranchId });
      if (res.success) {
        const map = {};
        (res.data || []).forEach(r => {
          map[r.productId] = {
            ...r,
            remainingQuantity: r.quantity,
          };
        });
        setExistingRemainings(map);
      }
    } catch (err) {
      console.error('Error loading remainings:', err);
    }
    setLoadingRemainings(false);
  };

  const getProductUnitType = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.unitType || 'kg';
  };

  const handleQuantityChange = (productId, value) => {
    const unitType = getProductUnitType(productId);
    if (unitType === 'piece' && value !== '') {
      const qty = parseFloat(value);
      if (!Number.isInteger(qty)) {
        return;
      }
    }
    setUnsaved(true);
    const existing = existingRemainings[productId];
    setExistingRemainings(prev => ({
      ...prev,
      [productId]: {
        ...existing,
        id: existing?.id || null,
        productId,
        remainingQuantity: value === '' ? null : parseFloat(value),
        status: 'DRAFT',
        _dirty: true,
      },
    }));
  };

  const getValue = (productId) => {
    const r = existingRemainings[productId];
    return r?.remainingQuantity ?? '';
  };

  const getStatus = (productId) => {
    const r = existingRemainings[productId];
    return r?.status || null;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    for (const r of Object.values(existingRemainings)) {
      if (r.remainingQuantity !== null && r.remainingQuantity !== undefined) {
        const unitType = getProductUnitType(r.productId);
        if (unitType === 'piece') {
          const qty = parseFloat(r.remainingQuantity);
          if (!Number.isInteger(qty)) {
            const product = products.find(p => p.id === r.productId);
            setError(`Quantity for "${product?.name}" must be a whole number (no decimals)`);
            setSaving(false);
            return;
          }
        }
      }
    }

    const items = Object.values(existingRemainings)
      .filter(r => r.remainingQuantity !== null && r.remainingQuantity !== undefined)
      .map(r => ({
        productId: r.productId,
        remainingQuantity: r.remainingQuantity,
        status: r._dirty ? 'DRAFT' : r.status,
      }));

    if (items.length === 0) {
      setError('Please enter at least one remaining value');
      setSaving(false);
      return;
    }

    if (!effectiveBranchId) {
      setError('Please select a branch');
      setSaving(false);
      return;
    }

    const result = await remainingService.saveBulk({
      branchId: effectiveBranchId,
      operationalDate,
      items,
    });

    setSaving(false);

    if (result.success) {
      setSuccess('Remaining saved successfully!');
      setUnsaved(false);
      loadRemainings();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.message || 'Failed to save remaining');
    }
  };

  const handleFinalize = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    const items = Object.values(existingRemainings)
      .filter(r => r.remainingQuantity !== null && r.remainingQuantity !== undefined)
      .map(r => ({
        productId: r.productId,
        remainingQuantity: r.remainingQuantity,
        status: 'FINAL',
      }));

    if (items.length === 0) {
      setError('Please enter at least one remaining value before finalizing');
      setSaving(false);
      return;
    }

    if (!effectiveBranchId) {
      setError('Please select a branch');
      setSaving(false);
      return;
    }

    const result = await remainingService.saveBulk({
      branchId: effectiveBranchId,
      operationalDate,
      items,
    });

    setSaving(false);

    if (result.success) {
      setSuccess('All remainings finalized!');
      setUnsaved(false);
      loadRemainings();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.message || 'Failed to finalize remaining');
    }
  };

  const grouped = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const hasUnfinalizedChanges = Object.values(existingRemainings).some(r => r._dirty === true || r.status === 'DRAFT');

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">Remaining Stock</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{formatOperationalDate(operationalDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageAll && (
            <div className="flex items-center gap-2 bg-[#F9F7F2] dark:bg-[#0f0f1a] px-3 py-2 rounded-xl border border-[#E5E1D8] dark:border-[#2d2d4a]">
              <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <select
                value={selectedBranchId || ''}
                onChange={handleBranchChange}
                className="bg-transparent border-none outline-none text-sm font-medium text-[#001F3F] dark:text-white cursor-pointer"
              >
                <option value="">Select Branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!canManageAll && (
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              Branch: {userBranchId || 'N/A'}
            </span>
          )}
          {unsaved && (
            <span className="text-sm text-amber-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={loadRemainings}
            className="p-2 hover:bg-[#F9F7F2] rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loadingProducts || loadingRemainings ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#D2B48C]" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-[#F9F7F2] dark:bg-[#2d2d4a] rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">No products available for your role</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, prods]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-[#001F3F] dark:text-white mb-4">
              {CATEGORY_LABELS[category] || category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {prods.map((p) => {
                const status = getStatus(p.id);
                return (
                  <div
                    key={p.id}
                    className={`relative bg-white dark:bg-[#1a1a2e] p-5 rounded-[24px] border transition-all ${
                      status === 'FINAL'
                        ? 'border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
                        : status === 'DRAFT'
                        ? 'border-amber-200 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-900/10'
                        : 'border-[#E5E1D8] dark:border-[#2d2d4a]'
                    }`}
                    style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}
                  >
                    {status && (
                      <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        status === 'FINAL' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400'
                      }`}>
                        {status === 'FINAL' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {status}
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">{p.name} [{p.unitType}]</p>
                    <input
                      type="number"
                      value={getValue(p.id)}
                      onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                      className="w-full px-4 py-4 bg-[#F9F7F2] dark:bg-[#0f0f1a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-3xl font-bold text-center text-[#001F3F] dark:text-white"
                      placeholder="0"
                      min="0"
                      step={p.unitType === 'piece' ? '1' : '0.01'}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a2e] border-t border-[#E5E1D8] dark:border-[#2d2d4a] p-4 lg:left-72 z-10">
        <div className="max-w-7xl mx-auto flex justify-end gap-3">
          {hasUnfinalizedChanges && (
            <button
              onClick={handleFinalize}
              disabled={saving}
              className="px-8 py-3.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Finalize All
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Remaining
          </button>
        </div>
      </div>
    </div>
  );
}