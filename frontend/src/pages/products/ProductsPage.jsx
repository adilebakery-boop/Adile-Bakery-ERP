import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import Modal from '../../components/Modal';
import useProducts from '../../hooks/useProducts';
import { getUser } from '../../utils/authUtils';

const CATEGORIES = [
  { value: 'BREAD_AND_SWEET_BREADS', label: 'Bread & Sweet Breads' },
  { value: 'CREAM_CAKES', label: 'Cream Cakes' },
  { value: 'SOFT_CAKES', label: 'Soft Cakes' },
  { value: 'DRY_CAKES', label: 'Dry Cakes' },
  { value: 'DRINKS_AND_RETAIL_ITEMS', label: 'Drinks & Retail Items' },
  { value: 'FETIRE_AND_SNACKS', label: 'Fetir & Snacks' },
  { value: 'COOKIES', label: 'Cookies' },
];
const UNITS = ['piece', 'kg'];

export default function ProductsPage() {
  const user = getUser();
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role);

  const { products, loading, error, fetchProducts, addProduct, editProduct, removeProduct } = useProducts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', price: '', unitType: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await addProduct({ ...formData, price: parseFloat(formData.price) });
    setSubmitting(false);
    if (result.success) {
      setIsModalOpen(false);
      setFormData({ name: '', category: '', price: '', unitType: '' });
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      unitType: product.unitType,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await editProduct(editingProduct.id, { ...formData, price: parseFloat(formData.price) });
    setSubmitting(false);
    if (result.success) {
      setIsEditModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', category: '', price: '', unitType: '' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      console.log('Deleting product with id:', id);
      try {
        const result = await removeProduct(id);
        console.log('Delete result:', result);
        if (!result.success) {
          setError(result.message || 'Failed to delete product');
        }
      } catch (err) {
        console.error('Delete error:', err);
        setError('Error deleting product: ' + err.message);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F]">Products</h1>
        {canManage && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
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
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Price (ETB)</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">Unit</th>
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
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-[#F9F7F2]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#001F3F]">{product.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#D2B48C]/20 text-[#D2B48C]">{product.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#D2B48C]">{product.price} ETB</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{product.unitType}</td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditClick(product)} className="p-2 text-gray-400 hover:text-[#001F3F] hover:bg-[#F9F7F2] rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Product">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Product Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="Enter product name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">Select category</option>
              {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Price</label>
            <div className="relative">
              <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm pr-12" placeholder="Enter price" required />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ETB</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Unit</label>
            <select value={formData.unitType} onChange={(e) => setFormData({ ...formData, unitType: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">Select unit</option>
              {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Product">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Product Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">Select category</option>
              {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Price</label>
            <div className="relative">
              <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm pr-12" required />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ETB</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Unit</label>
            <select value={formData.unitType} onChange={(e) => setFormData({ ...formData, unitType: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">Select unit</option>
              {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
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