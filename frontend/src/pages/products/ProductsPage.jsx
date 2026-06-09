import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Loader2, Search, RotateCcw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../../components/Modal';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useDeletedProductsQuery } from '../../features/products/hooks/queries/useDeletedProductsQuery';
import { useCreateProductMutation } from '../../features/products/hooks/mutations/useCreateProductMutation';
import { useUpdateProductMutation } from '../../features/products/hooks/mutations/useUpdateProductMutation';
import { useDeleteProductMutation } from '../../features/products/hooks/mutations/useDeleteProductMutation';
import { useRestoreProductMutation } from '../../features/products/hooks/mutations/useRestoreProductMutation';
import { getUser } from '../../utils/authUtils';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { TableSkeleton } from '../../components/skeletons';

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

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeletedModalOpen, setIsDeletedModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', name_am: '', category: '', price: '', unitType: '' });
  const [actionError, setActionError] = useState(null);

  const filters = {
    search: searchTerm || undefined,
    category: selectedCategory || undefined,
    page: currentPage,
    limit: 10,
  };

  const { data, isLoading, isError, error: queryError, isPreviousData, refetch } = useProductsQuery(filters);
  const products = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  const { data: deletedProducts = [], isLoading: deletedLoading, refetch: refetchDeleted } = useDeletedProductsQuery(
    {},
    { enabled: isDeletedModalOpen }
  );

  const createProduct = useCreateProductMutation();
  const updateProduct = useUpdateProductMutation();
  const deleteProduct = useDeleteProductMutation();
  const restoreProduct = useRestoreProductMutation();

  const error = actionError || queryError;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await createProduct.mutateAsync({ ...formData, price: parseFloat(formData.price) });
      setIsModalOpen(false);
      setFormData({ name: '', name_am: '', category: '', price: '', unitType: '' });
    } catch (err) {
      setActionError(err.message);
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
    setActionError(null);
    try {
      await updateProduct.mutateAsync({ id: editingProduct.id, data: { ...formData, price: parseFloat(formData.price) } });
      setIsEditModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', name_am: '', category: '', price: '', unitType: '' });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setActionError(null);
      try {
        await deleteProduct.mutateAsync(id);
      } catch (err) {
        setActionError(err.message);
      }
    }
  };

  const handleRestore = async (id) => {
    setActionError(null);
    try {
      await restoreProduct.mutateAsync(id);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (!isPreviousData && currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">{t('products.title')}</h1>
        <div className="flex items-center gap-3">
          {canManage && (
            <button 
              onClick={() => setIsDeletedModalOpen(true)}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {t('products.deletedProducts')}
            </button>
          )}
          {canManage && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('products.addProduct')}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-500" />
          <input 
            type="text" 
            placeholder={t('products.searchProducts')} 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#12262A] border border-[#E5E1D8] dark:border-[#1E3A3F] rounded-xl focus:ring-2 focus:ring-[#024A5B] focus:border-transparent outline-none text-sm dark:text-white"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#12262A] border border-[#E5E1D8] dark:border-[#1E3A3F] rounded-xl focus:ring-2 focus:ring-[#024A5B] focus:border-transparent outline-none text-sm dark:text-white"
        >
          {CATEGORIES.map((cat) => (
<option key={cat.value} value={cat.value}>{getCategoryLabel(cat.labelKey)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error?.message || error}
        </div>
      )}

      <div className="bg-white dark:bg-[#12262A] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#DFEDE2]/50 dark:bg-[#1E3A3F]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('products.product')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('products.category')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('products.priceEtb')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('products.unit')}</th>
                {canManage && <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#1E3A3F]">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4}>
                    <TableSkeleton rows={8} columns={canManage ? 5 : 4} />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4}>
                    <ApiErrorState error={queryError} onRetry={() => refetch()} />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
<td colSpan={canManage ? 5 : 4}>
                    <EmptyState type="products" message={t('products.noProductsFound')} />
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#024A5B] dark:text-white">{getLocalizedName(product, i18n.language)}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#CAEAFD]/20 text-[#024A5B] dark:bg-[#236B56] dark:text-white">{t(`productCategories.${product.category}`)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#024A5B]">{product.price} ETB</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-500">{t(`units.${product.unitType}`)}</td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditClick(product)} className="p-2 text-gray-500 dark:text-gray-500 hover:text-[#024A5B] dark:hover:text-white hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-500 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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

        {!isLoading && products.length > 0 && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#1E3A3F]">
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} products
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1 || isPreviousData}
                className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#1E3A3F] text-gray-600 dark:text-gray-500 hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-500 px-2">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === pagination.totalPages || isPreviousData}
                className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#1E3A3F] text-gray-600 dark:text-gray-500 hover:bg-[#DFEDE2] dark:hover:bg-[#1E3A3F] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('products.addProduct')}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.productName')}</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm" placeholder={t('products.enterProductName')} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Amharic Name (Optional)</label>
            <input type="text" value={formData.name_am || ''} onChange={(e) => setFormData({ ...formData, name_am: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm" placeholder="የአማርኛ ስም (አማራጭ)" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.category')}</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm" required>
              <option value="">{t('products.selectCategory')}</option>
              {CATEGORIES.filter(c => c.value).map((cat) => <option key={cat.value} value={cat.value}>{getCategoryLabel(cat.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.price')}</label>
            <div className="relative">
              <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm pr-12" placeholder={t('products.enterPrice')} required />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ETB</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Unit</label>
            <select value={formData.unitType} onChange={(e) => setFormData({ ...formData, unitType: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm" required>
              <option value="">{t('products.selectUnit')}</option>
              {UNITS.map((unit) => <option key={unit} value={unit}>{getUnitLabel(unit)}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#DFEDE2] transition-colors text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={createProduct.isPending} className="flex-1 px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70">{createProduct.isPending ? t('products.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('products.editProduct')}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.productName')}</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Amharic Name (Optional)</label>
            <input type="text" value={formData.name_am || ''} onChange={(e) => setFormData({ ...formData, name_am: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.category')}</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm" required>
              <option value="">{t('products.selectCategory')}</option>
              {CATEGORIES.filter(c => c.value).map((cat) => <option key={cat.value} value={cat.value}>{getCategoryLabel(cat.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.price')}</label>
            <div className="relative">
              <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm pr-12" required />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ETB</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('products.unit')}</label>
            <select value={formData.unitType} onChange={(e) => setFormData({ ...formData, unitType: e.target.value })} className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm" required>
              <option value="">{t('products.selectUnit')}</option>
              {UNITS.map((unit) => <option key={unit} value={unit}>{getUnitLabel(unit)}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#DFEDE2] transition-colors text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={updateProduct.isPending} className="flex-1 px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70">{updateProduct.isPending ? t('products.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeletedModalOpen} onClose={() => setIsDeletedModalOpen(false)} title={t('products.deletedProducts')}>
        {deletedLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-500" />
          </div>
        ) : deletedProducts.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No deleted products</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {deletedProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-[#DFEDE2] rounded-xl">
                <div>
                  <div className="font-medium text-[#024A5B]">{product.name}</div>
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
            className="w-full px-6 py-3 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
