import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Package, Loader2, RefreshCw, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../../components/Modal';
import { getUserRole, getUserBranchId, getUserId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getCategoriesForRole, CATEGORIES } from '../../utils/permissions';
import productionService from '../../services/productionService';
import productService from '../../services/productService';
import branchService from '../../services/branchService';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { LoadingSpinner, ApiErrorState, EmptyState } from '../../components/ui';
import { TableSkeleton, FormSkeleton } from '../../components/skeletons';

const SHIFTS = [
  { value: 'DAY', labelKey: 'shifts.day' },
  { value: 'NIGHT', labelKey: 'shifts.night' },
];

const CATEGORY_LABELS = {
  [CATEGORIES.BREAD_AND_SWEET_BREADS]: 'productCategories.BREAD_AND_SWEET_BREADS',
  [CATEGORIES.CREAM_CAKES]: 'productCategories.CREAM_CAKES',
  [CATEGORIES.SOFT_CAKES]: 'productCategories.SOFT_CAKES',
  [CATEGORIES.DRY_CAKES]: 'productCategories.DRY_CAKES',
  [CATEGORIES.COOKIES]: 'productCategories.COOKIES',
  [CATEGORIES.FETIRE_AND_SNACKS]: 'productCategories.FETIRE_AND_SNACKS',
  [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: 'productCategories.DRINKS_AND_RETAIL_ITEMS',
};

export default function ProductionPage() {
  const { t, i18n } = useTranslation();
  const [product, setProduct] = useState('');
  const [selectedProductUnitType, setSelectedProductUnitType] = useState(null);
  const [branch, setBranch] = useState('');
  const [shift, setShift] = useState('');
  const [quantity, setQuantity] = useState('');
  const [entries, setEntries] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({ quantity: '', shift: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    setLoadingError(null);
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
      } else {
        setLoadingError(result);
      }
    } catch (err) {
      console.error('Error loading productions:', err);
      setLoadingError(err.response ? err.response.data : { message: 'Failed to load productions', status: 0 });
    }
    setIsLoadingEntries(false);
  };

  const totalPages = Math.ceil(entries.length / itemsPerPage);
  const paginatedEntries = entries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [entries.length, branch]);

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
    const shift = SHIFTS.find(s => s.value === shiftValue);
    return shift ? t(shift.labelKey) : shiftValue;
  };

  const getCategoryLabel = (category) => {
    return t(`productCategories.${category}`) || category;
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
          <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('production.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('production.operationalDateLabel')} {formatOperationalDate(operationalDate)}</p>
</div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('production.editProduction')}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.product')}</label>
            <input 
              type="text" 
              value={editingEntry?.product?.name || ''} 
              disabled 
              className="w-full px-4 py-3.5 bg-gray-100 dark:bg-[#2d2d4a] border-0 rounded-xl text-sm dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.shift')}</label>
            <select 
              value={editFormData.shift} 
              onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              required
            >
              <option value="">{t('production.selectShift')}</option>
              {SHIFTS.map((s) => <option key={s.value} value={s.value}>{t(s.labelKey)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.quantity')}</label>
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
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70"
            >
              {isSubmitting ? t('production.saving') : t('common.save')}
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
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.product')}</label>
            {isLoadingProducts ? (
              <div className="flex items-center gap-2 px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-400 dark:text-gray-500">{t('common.loading')}</span>
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
                <option value="">{t('production.selectProduct')} ({availableProducts.length})</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
{getLocalizedName(p, i18n.language)} ({getCategoryLabel(p.category)}) [{p.unitType}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {canManageAll && (
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.branch')}</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
                required
                disabled={isSubmitting}
              >
                <option value="">{t('production.selectBranch')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.shift')}</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              required
              disabled={isSubmitting}
            >
              <option value="">{t('production.selectShift')}</option>
              {SHIFTS.map((s) => (
                <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
              ))}
            </select>
          </div>

          <div className="w-40">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.quantity')}</label>
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
                {t('production.recording')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {t('production.recordProduction')}
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="px-6 py-5 border-b border-[#E5E1D8] dark:border-[#2d2d4a] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#001F3F] dark:text-white">
            {canManageAll ? t('production.allProductionRecords') : t('production.todaysEntries')}
          </h2>
          <button
            onClick={() => loadProductions()}
            className="p-2 hover:bg-[#F9F7F2] rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {isLoadingEntries ? (
          <TableSkeleton rows={10} columns={canManageAll ? 6 : 4} />
        ) : loadingError ? (
          <ApiErrorState error={loadingError} onRetry={loadProductions} />
        ) : entries.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.time')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.product')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.shift')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.qty')}</th>
                {canManageAll && (
                  <>
                    <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.branch')}</th>
                    <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.recordedBy')}</th>
                  </>
                )}
              </tr>
            </thead>
<tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
              {paginatedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a]">
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {new Date(entry.createdAt).toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#001F3F] dark:text-white">
                    {getLocalizedName(entry.product, i18n.language) || t('common.na')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {getShiftLabel(entry.shift)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#001F3F] dark:text-white">
                    {entry.quantity}
                  </td>
                  {canManageAll && (
                    <>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {getLocalizedName(entry.branch, i18n.language) || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {entry.creator?.name || entry.creator?.username || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleEditClick(entry)} 
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#001F3F] dark:hover:text-white hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] rounded-lg transition-colors"
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
          <EmptyState type="production" message="No production records yet" />
        )}

        {!isLoadingEntries && entries.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#2d2d4a]">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, entries.length)} of {entries.length} production records
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