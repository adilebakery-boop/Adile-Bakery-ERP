import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Loader2, Search, RotateCcw, Eye } from 'lucide-react';
import Modal from '../../components/Modal';
import useProducts from '../../hooks/useProducts';
import { getUser } from '../../utils/authUtils';
import productService from '../../services/productService';
import { getLocalizedName } from '../../utils/getLocalizedName';

const CATEGORIES = [
  { value: '', labelKey: 'products.allCategories' },
  { value: 'BREAD_AND_SWEET_BREADS', labelKey: 'productCategories.BREAD_AND_SWEET_BREADS' },
  { value: 'CREAM_CAKES', labelKey: 'productCategories.CREAM_CAKES' },
  { value: 'SOFT_CAKES', labelKey: 'productCategories.SOFT_CAKES' },
  { value: 'DRY_CAKES', labelKey: 'productCategories.DRY_CAKES' },
  { value: 'DRINKS_AND_RETAIL_ITEMS', labelKey: 'productCategories.DRINKS_AND_RETAIL_ITEMS' },
  { value: 'FETIRE_AND_SNACKS', labelKey: 'productCategories.FETIRE_AND_SNACKS' },
  { value: 'COOKIES', labelKey: 'productCategories.COOKIES' },
];
const UNITS = ['piece', 'kg'];

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const getCategoryLabel = (labelKey) => t(labelKey);
  const getUnitLabel = (unit) => t(`units.${unit}`);
  const user = getUser();
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role);

  const { products, loading, error, fetchProducts, addProduct, editProduct, removeProduct, restoreProduct } = useProducts();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeletedModalOpen, setIsDeletedModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletedProducts, setDeletedProducts] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', name_am: '', category: '', price: '', unitType: '' });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      fetchProducts({ search: searchTerm, category: selectedCategory });
    }, 300);
    return () => clearTimeout(delaySearch);
  }, [searchTerm, selectedCategory, fetchProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await addProduct({ ...formData, price: parseFloat(formData.price) });
    setSubmitting(false);
    if (result.success) {
      setIsModalOpen(false);
      setFormData({ name: '', name_am: '', category: '', price: '', unitType: '' });
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      name_am: product.name_am || '',
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
      setFormData({ name: '', name_am: '', category: '', price: '', unitType: '' });
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

  const loadDeletedProducts = async () => {
    setDeletedLoading(true);
    const result = await productService.getDeletedProducts();
    if (result.success) {
      setDeletedProducts(result.data?.data || result.data || []);
    }
    setDeletedLoading(false);
  };

  const handleRestore = async (id) => {
    const result = await restoreProduct(id);
    if (result.success) {
      await loadDeletedProducts();
    }
  };

  const openDeletedModal = () => {
    loadDeletedProducts();
    setIsDeletedModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('products.title')}</h1>
        <div className="flex items-center gap-3">
          {canManage && (
            <button 
              onClick={openDeletedModal}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {t('products.deletedProducts')}
            </button>
          )}
          {canManage && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('products.addProduct')}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input 
            type="text" 
            placeholder={t('products.searchProducts')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white"
        >
          {CATEGORIES.map((cat) => (
<option key={cat.value} value={cat.value}>{getCategoryLabel(cat.labelKey)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50 dark:bg-[#2d2d4a]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('products.product')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('products.category')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('products.priceEtb')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('products.unit')}</th>
                {canManage && <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                    {t('products.noProductsFound')}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#001F3F] dark:text-white">{getLocalizedName(product, i18n.language)}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#D2B48C]/20 text-[#D2B48C]">{t(`productCategories.${product.category}`)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#D2B48C]">{product.price} ETB</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{t(`units.${product.unitType}`)}</td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditClick(product)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#001F3F] dark:hover:text-white hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('products.addProduct')}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.productName')}</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder={t('products.enterProductName')} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Amharic Name (Optional)</label>
            <input type="text" value={formData.name_am || ''} onChange={(e) => setFormData({ ...formData, name_am: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" placeholder="የአማርኛ ስም (አማራጭ)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.category')}</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">{t('products.selectCategory')}</option>
              {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{getCategoryLabel(cat.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.price')}</label>
            <div className="relative">
              <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm pr-12" placeholder={t('products.enterPrice')} required />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ETB</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Unit</label>
            <select value={formData.unitType} onChange={(e) => setFormData({ ...formData, unitType: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">{t('products.selectUnit')}</option>
              {UNITS.map((unit) => <option key={unit} value={unit}>{getUnitLabel(unit)}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{submitting ? t('products.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('products.editProduct')}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.productName')}</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Amharic Name (Optional)</label>
            <input type="text" value={formData.name_am || ''} onChange={(e) => setFormData({ ...formData, name_am: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.category')}</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">{t('products.selectCategory')}</option>
              {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{getCategoryLabel(cat.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.price')}</label>
            <div className="relative">
              <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm pr-12" required />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ETB</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.unit')}</label>
            <select value={formData.unitType} onChange={(e) => setFormData({ ...formData, unitType: e.target.value })} className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm" required>
              <option value="">{t('products.selectUnit')}</option>
              {UNITS.map((unit) => <option key={unit} value={unit}>{getUnitLabel(unit)}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{submitting ? t('products.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeletedModalOpen} onClose={() => setIsDeletedModalOpen(false)} title={t('products.deletedProducts')}>
        {deletedLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          </div>
        ) : deletedProducts.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No deleted products</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {deletedProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-[#F9F7F2] rounded-xl">
                <div>
                  <div className="font-medium text-[#001F3F]">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.category} - {product.price} ETB</div>
                </div>
                <button
                  onClick={() => handleRestore(product.id)}
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
            className="w-full px-6 py-3 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}