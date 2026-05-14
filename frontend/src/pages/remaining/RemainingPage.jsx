import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { getUserRole, getUserBranchId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getCategoriesForRole, CATEGORIES } from '../../utils/permissions';
import remainingService from '../../services/remainingService';
import productService from '../../services/productService';

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

  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const allowedCategories = getCategoriesForRole(userRole);
  const operationalDate = getOperationalDate();

  useEffect(() => {
    loadProducts();
    loadRemainings();
  }, [userRole, userBranchId, operationalDate]);

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
    setLoadingRemainings(true);
    try {
      const res = await remainingService.getByOperationalDate(operationalDate, { branchId: userBranchId });
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

  const handleQuantityChange = (productId, value) => {
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

    const items = Object.values(existingRemainings)
      .filter(r => r.remainingQuantity !== null && r.remainingQuantity !== undefined)
      .map(r => ({
        productId: r.productId,
        remainingQuantity: r.remainingQuantity,
        status: r.status === 'FINAL' ? 'FINAL' : 'DRAFT',
      }));

    if (items.length === 0) {
      setError('Please enter at least one remaining value');
      setSaving(false);
      return;
    }

    const result = await remainingService.saveBulk({
      branchId: userBranchId,
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

    const result = await remainingService.saveBulk({
      branchId: userBranchId,
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

  const hasAnyRemainings = Object.keys(existingRemainings).length > 0;
  const hasFinal = Object.values(existingRemainings).some(r => r.status === 'FINAL');
  const hasDraft = Object.values(existingRemainings).some(r => r.status === 'DRAFT');

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F]">Remaining Stock</h1>
          <p className="text-sm text-gray-400 mt-1">{formatOperationalDate(operationalDate)}</p>
        </div>
        <div className="flex items-center gap-3">
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
            <RefreshCw className="w-5 h-5 text-gray-400" />
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
          <div className="w-16 h-16 bg-[#F9F7F2] rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm">No products available for your role</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, prods]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-[#001F3F] mb-4">
              {CATEGORY_LABELS[category] || category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {prods.map((p) => {
                const status = getStatus(p.id);
                return (
                  <div
                    key={p.id}
                    className={`relative bg-white p-5 rounded-[24px] border transition-all ${
                      status === 'FINAL'
                        ? 'border-green-300 bg-green-50/30'
                        : status === 'DRAFT'
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-[#E5E1D8]'
                    }`}
                    style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}
                  >
                    {status && (
                      <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        status === 'FINAL' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {status === 'FINAL' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {status}
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mb-3 font-medium">{p.name}</p>
                    <input
                      type="number"
                      value={getValue(p.id)}
                      onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                      className="w-full px-4 py-4 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-3xl font-bold text-center text-[#001F3F]"
                      placeholder="0"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E1D8] p-4 lg:left-72 z-10">
        <div className="max-w-7xl mx-auto flex justify-end gap-3">
          {!hasFinal && hasAnyRemainings && (
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