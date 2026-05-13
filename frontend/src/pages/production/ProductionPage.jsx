import { useState, useEffect } from 'react';
import { Plus, Package, Loader2, RefreshCw } from 'lucide-react';
import { getUserRole, getUserBranchId } from '../../utils/authUtils';
import productionService from '../../services/productionService';
import productService from '../../services/productService';
import branchService from '../../services/branchService';

const SHIFTS = [
  { value: 'DAY', label: 'Day Shift (7:30 AM - 7:30 PM)' },
  { value: 'NIGHT', label: 'Night Shift (9:00 PM - 6:30 AM)' },
];

const CATEGORIES = {
  BREAD_AND_SWEET_BREADS: 'BREAD_AND_SWEET_BREADS',
  CREAM_CAKES: 'CREAM_CAKES',
  SOFT_CAKES: 'SOFT_CAKES',
  DRY_CAKES: 'DRY_CAKES',
  COOKIES: 'COOKIES',
  FETIRE_AND_SNACKS: 'FETIRE_AND_SNACKS',
  DRINKS_AND_RETAIL_ITEMS: 'DRINKS_AND_RETAIL_ITEMS',
};

const ROLE_CATEGORIES = {
  ADMIN: Object.values(CATEGORIES),
  MANAGER: Object.values(CATEGORIES),
  BAKER: [CATEGORIES.BREAD_AND_SWEET_BREADS],
  CAKE_CHEF: [CATEGORIES.CREAM_CAKES, CATEGORIES.SOFT_CAKES, CATEGORIES.DRY_CAKES],
  COOKIE_BAKER: [CATEGORIES.COOKIES],
  FETIR_CHEF: [CATEGORIES.FETIRE_AND_SNACKS],
  CASHIER: [CATEGORIES.DRINKS_AND_RETAIL_ITEMS],
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

  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const allowedCategories = ROLE_CATEGORIES[userRole] || [];
  const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';

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
      const result = await productionService.getProductions({ limit: 100 });
      if (result.success && result.data) {
        setEntries(result.data);
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
    });

    setIsSubmitting(false);

    if (result.success) {
      setSuccess('Production recorded successfully!');
      setEntries([result.data, ...entries]);
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
    const labels = {
      [CATEGORIES.BREAD_AND_SWEET_BREADS]: 'Bread',
      [CATEGORIES.CREAM_CAKES]: 'Cream Cakes',
      [CATEGORIES.SOFT_CAKES]: 'Soft Cakes',
      [CATEGORIES.DRY_CAKES]: 'Dry Cakes',
      [CATEGORIES.COOKIES]: 'Cookies',
      [CATEGORIES.FETIRE_AND_SNACKS]: 'Fetir',
      [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: 'Drinks',
    };
    return labels[category] || category;
  };

  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#001F3F] mb-8">Production</h1>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          {success}
        </div>
      )}
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

          {isManagerOrAdmin && (
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
            {isManagerOrAdmin ? 'All Production Records' : "Today's Entries"}
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
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
                {isManagerOrAdmin && (
                  <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Recorded By</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#F9F7F2]">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">
                    {entry.product?.name || entry.product}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getShiftLabel(entry.shift)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#001F3F]">
                    {entry.quantity}
                  </td>
                  {isManagerOrAdmin && (
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.user?.name || '-'}
                    </td>
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