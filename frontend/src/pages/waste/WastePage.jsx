import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../../components/Modal';
import { useWasteQuery } from '../../features/waste/hooks/queries/useWasteQuery';
import { useCreateWasteMutation } from '../../features/waste/hooks/mutations/useCreateWasteMutation';
import { useUpdateWasteMutation } from '../../features/waste/hooks/mutations/useUpdateWasteMutation';
import { useDeleteWasteMutation } from '../../features/waste/hooks/mutations/useDeleteWasteMutation';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { getUser } from '../../utils/authUtils';
import { getCategoriesForRole } from '../../utils/permissions';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { TableSkeleton } from '../../components/skeletons';

export default function WastePage() {
  const { t, i18n } = useTranslation();
  const user = getUser();
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role);
  const userBranchId = user?.branchId;

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingWaste, setEditingWaste] = useState(null);
  const [formData, setFormData] = useState({
    productId: '',
    branchId: '',
    operationalDate: '',
    quantity: '',
    reason: '',
  });
  const [actionError, setActionError] = useState(null);

  const filters = {
    search: searchTerm || undefined,
    branchId: selectedBranch || undefined,
    productId: selectedProduct || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page: currentPage,
    limit: 20,
  };

  const { data, isLoading, isError, error: queryError, isPreviousData, refetch } = useWasteQuery(filters);
  const wastes = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };

  const { data: branches = [] } = useActiveBranchesQuery();
  const { data: productsData } = useProductsQuery({ isActive: true, limit: 500 });
  const products = productsData?.data || [];
  const allowedCategories = getCategoriesForRole(user?.role);
  const filteredProducts = canManage ? products : products.filter((p) => allowedCategories.includes(p.category));

  const createWaste = useCreateWasteMutation();
  const updateWaste = useUpdateWasteMutation();
  const deleteWaste = useDeleteWasteMutation();

  const error = actionError || queryError;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBranch, selectedProduct, startDate, endDate]);

  const resetForm = () => {
    setFormData({ productId: '', branchId: userBranchId ? String(userBranchId) : '', operationalDate: '', quantity: '', reason: '' });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await createWaste.mutateAsync({
        ...formData,
        quantity: parseFloat(formData.quantity),
      });
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleEditClick = (waste) => {
    setEditingWaste(waste);
    setFormData({
      productId: waste.productId.toString(),
      branchId: waste.branchId.toString(),
      operationalDate: waste.operationalDate ? waste.operationalDate.split('T')[0] : '',
      quantity: waste.quantity.toString(),
      reason: waste.reason || '',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await updateWaste.mutateAsync({
        id: editingWaste.id,
        data: {
          quantity: parseFloat(formData.quantity),
          reason: formData.reason || undefined,
        },
      });
      setIsEditOpen(false);
      setEditingWaste(null);
      resetForm();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('waste.deleteConfirm'))) {
      setActionError(null);
      try {
        await deleteWaste.mutateAsync(id);
      } catch (err) {
        setActionError(err.message);
      }
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (!isPreviousData && currentPage < pagination.totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('waste.title')}</h1>
          <button
            onClick={() => { setIsCreateOpen(true); resetForm(); }}
            className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('waste.recordWaste')}
          </button>
      </div>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={t('waste.searchWaste')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white"
          />
        </div>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white min-w-[140px]"
        >
          <option value="">{t('waste.allBranches')}</option>
          {(Array.isArray(branches) ? branches : []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white min-w-[140px]"
        >
          <option value="">{t('waste.allProducts')}</option>
          {(Array.isArray(products) ? products : []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white"
          placeholder="Start date"
        />
        <span className="text-gray-400 text-sm">-</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white"
          placeholder="End date"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error?.message || error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F9F7F2]/50 dark:bg-[#2d2d4a]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.product')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.branch')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.quantity')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.date')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.reason')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.recordedBy')}</th>
                {canManage && <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6}>
                    <TableSkeleton rows={8} columns={canManage ? 7 : 6} />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6}>
                    <ApiErrorState error={queryError} onRetry={() => refetch()} />
                  </td>
                </tr>
              ) : wastes.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6}>
                    <EmptyState type="files" message={t('waste.noWasteRecords')} />
                  </td>
                </tr>
              ) : (
                wastes.map((waste) => (
                  <tr key={waste.id} className="hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a]">
                    <td className="px-6 py-4 text-sm font-semibold text-[#001F3F] dark:text-white">
                      {waste.product?.name || `#${waste.productId}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {waste.branch?.name || `#${waste.branchId}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#D2B48C]">{waste.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {waste.operationalDate ? waste.operationalDate.split('T')[0] : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                      {waste.reason || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {waste.creator?.name || waste.creator?.username || `#${waste.createdBy}`}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(waste)}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#001F3F] dark:hover:text-white hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(waste.id)}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
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

        {!isLoading && wastes.length > 0 && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#2d2d4a]">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('waste.showing', {
                from: ((currentPage - 1) * pagination.limit) + 1,
                to: Math.min(currentPage * pagination.limit, pagination.total),
                total: pagination.total,
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1 || isPreviousData}
                className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                {t('waste.pageOf', { current: currentPage, total: pagination.totalPages })}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === pagination.totalPages || isPreviousData}
                className="p-2 rounded-lg border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t('waste.recordWaste')}>
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.product')}</label>
            <select
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
            >
              <option value="">{t('waste.selectProduct')}</option>
              {(Array.isArray(filteredProducts) ? filteredProducts : []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.branch')}</label>
            {canManage ? (
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
                required
              >
                <option value="">{t('waste.selectBranch')}</option>
                {(Array.isArray(branches) ? branches : []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : (
              <div className="px-4 py-3.5 bg-[#F9F7F2] rounded-xl text-sm text-gray-700">
                {(Array.isArray(branches) ? branches : []).find((b) => b.id === Number(userBranchId))?.name || '-'}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.operationalDate')}</label>
            <input
              type="date"
              value={formData.operationalDate}
              onChange={(e) => setFormData({ ...formData, operationalDate: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.quantity')}</label>
            <input
              type="number"
              step="any"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              placeholder={t('waste.enterQuantity')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.reason')}</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm resize-none"
              rows={3}
              placeholder={t('waste.enterReason')}
              maxLength={500}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={createWaste.isPending} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{createWaste.isPending ? t('waste.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditingWaste(null); }} title={t('waste.editWaste')}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.product')}</label>
              <div className="px-4 py-3.5 bg-[#F9F7F2] rounded-xl text-sm text-gray-700">
                {editingWaste?.product?.name || `#${editingWaste?.productId}`}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.branch')}</label>
              <div className="px-4 py-3.5 bg-[#F9F7F2] rounded-xl text-sm text-gray-700">
                {editingWaste?.branch?.name || `#${editingWaste?.branchId}`}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.quantity')}</label>
            <input
              type="number"
              step="any"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">{t('waste.reason')}</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setIsEditOpen(false); setEditingWaste(null); }} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#F9F7F2] transition-colors text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={updateWaste.isPending} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{updateWaste.isPending ? t('waste.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
