import { useState, useEffect } from 'react';
import { Plus, Package } from 'lucide-react';
import { getUserRole } from '../../utils/authUtils';
import { getCategoriesForRole, CATEGORIES } from '../../utils/permissions';

const MOCK_PRODUCTS = {
  [CATEGORIES.BREAD_AND_SWEET_BREADS]: [
    { id: 1, name: 'Arabic Bread' },
    { id: 2, name: 'Baguette' },
    { id: 3, name: 'Burger Buns' },
    { id: 4, name: 'Hot Dog Buns' },
    { id: 5, name: 'Croissant' },
    { id: 6, name: 'Danish' },
  ],
  [CATEGORIES.CREAM_CAKES]: [
    { id: 7, name: 'Birthday Cake' },
    { id: 8, name: 'Wedding Cake' },
    { id: 9, name: 'Cream Roll' },
  ],
  [CATEGORIES.SOFT_CAKES]: [
    { id: 10, name: 'Cupcake' },
    { id: 11, name: 'Muffin' },
    { id: 12, name: 'Sponge Cake' },
  ],
  [CATEGORIES.DRY_CAKES]: [
    { id: 13, name: 'Brownie' },
    { id: 14, name: 'Cookies' },
    { id: 15, name: ' Biscuits' },
  ],
  [CATEGORIES.COOKIES]: [
    { id: 16, name: 'Chocolate Chip Cookies' },
    { id: 17, name: 'Butter Cookies' },
    { id: 18, name: 'Oatmeal Cookies' },
  ],
  [CATEGORIES.FETIRE_AND_SNACKS]: [
    { id: 19, name: 'Fetire' },
    { id: 20, name: 'Fetire with Cheese' },
    { id: 21, name: 'Snack Pack' },
  ],
  [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: [
    { id: 22, name: 'Soft Drink' },
    { id: 23, name: 'Water' },
    { id: 24, name: 'Juice' },
  ],
};

const SHIFTS = [
  { value: 'MORNING', label: 'Morning 8:30-13:30' },
  { value: 'AFTERNOON', label: 'Afternoon 13:30-20:30' },
  { value: 'EVENING', label: 'Evening 20:30-00:30' },
];

export default function ProductionPage() {
  const [product, setProduct] = useState('');
  const [shift, setShift] = useState('');
  const [quantity, setQuantity] = useState('');
  const [entries, setEntries] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  
  const userRole = getUserRole();
  const allowedCategories = getCategoriesForRole(userRole);

  useEffect(() => {
    const products = [];
    allowedCategories.forEach(category => {
      if (MOCK_PRODUCTS[category]) {
        products.push(...MOCK_PRODUCTS[category].map(p => ({
          ...p,
          category
        })));
      }
    });
    setAvailableProducts(products);
  }, [userRole, allowedCategories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (product && shift && quantity) {
      const selectedProduct = availableProducts.find(p => p.id === parseInt(product));
      setEntries([...entries, { 
        id: Date.now(), 
        product: selectedProduct?.name || product, 
        shift, 
        quantity, 
        time: new Date().toLocaleTimeString() 
      }]);
      setProduct('');
      setShift('');
      setQuantity('');
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      [CATEGORIES.BREAD_AND_SWEET_BREADS]: 'Bread & Sweet Breads',
      [CATEGORIES.CREAM_CAKES]: 'Cream Cakes',
      [CATEGORIES.SOFT_CAKES]: 'Soft Cakes',
      [CATEGORIES.DRY_CAKES]: 'Dry Cakes',
      [CATEGORIES.COOKIES]: 'Cookies',
      [CATEGORIES.FETIRE_AND_SNACKS]: 'Fetire & Snacks',
      [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: 'Drinks & Retail',
    };
    return labels[category] || category;
  };

  return (
    <div>
      <h1 className="text-[32px] font-bold text-[#001F3F] mb-8">Production</h1>

      {/* Entry Form Card */}
      <div className="bg-white rounded-[24px] p-6 mb-8 border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-600 mb-2">Product</label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
            >
              <option value="">Select product</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({getCategoryLabel(p.category)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-600 mb-2">Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
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
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Record Production
          </button>
        </form>
      </div>

      {/* Today's Entries */}
      <div className="bg-white rounded-[24px] overflow-hidden border border-[#E5E1D8]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="px-6 py-5 border-b border-[#E5E1D8]">
          <h2 className="text-xl font-semibold text-[#001F3F]">Today's Entries</h2>
        </div>
        {entries.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#F9F7F2]">
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.time}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{entry.product}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {SHIFTS.find(s => s.value === entry.shift)?.label || entry.shift}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#001F3F]">{entry.quantity}</td>
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