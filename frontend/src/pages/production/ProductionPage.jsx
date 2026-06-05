import { useState, useEffect, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, RefreshCw, Edit2, Trash2, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../../components/Modal';
import { getUserRole, getUserBranchId, formatOperationalDate, canEditOperationalRecord } from '../../utils/authUtils';
import { getCategoriesForRole } from '../../utils/permissions';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { TableSkeleton } from '../../components/skeletons';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useProductionEntriesQuery } from '../../features/production/hooks/queries/useProductionEntriesQuery';
import { useClosureStatus } from '../../hooks/useClosureStatus';
import OperationalDayControlBar from '../../components/OperationalDayControlBar';
import { useCreateProductionMutation } from '../../features/production/hooks/mutations/useCreateProductionMutation';
import { useUpdateProductionMutation } from '../../features/production/hooks/mutations/useUpdateProductionMutation';
import { useDeleteProductionMutation } from '../../features/production/hooks/mutations/useDeleteProductionMutation';

const SHIFTS = [
  { value: 'DAY', labelKey: 'shifts.day' },
  { value: 'NIGHT', labelKey: 'shifts.night' },
];

export default function ProductionPage() {
  const { t, i18n } = useTranslation();
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
  const [inputBranch, setInputBranch] = useState(() => {
    const role = getUserRole();
    const uid = getUserBranchId();
    return (role !== 'ROLE_MANAGER' && role !== 'ROLE_ADMIN') && uid ? uid.toString() : '';
  });
  const [selectedFilterBranch, setSelectedFilterBranch] = useState(() => {
    const uid = getUserBranchId();
    return uid ? uid.toString() : '';
  });
  const [closureBranch, setClosureBranch] = useState(() => {
    const uid = getUserBranchId();
    return uid ? uid.toString() : '';
  });
  const [selectedFilterProduct, setSelectedFilterProduct] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [shift, setShift] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

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
  const canManageAll = userRole === 'ADMIN';

  const entriesBranchId = canManageAll ? (selectedFilterBranch ? Number(selectedFilterBranch) : null) : userBranchId;

  const calculatedOperationalDate = (() => {
    if (!productionDate || !shift) return null;
    const prodDate = new Date(productionDate);
    prodDate.setHours(0, 0, 0, 0);
    if (shift === 'NIGHT') {
      prodDate.setDate(prodDate.getDate() + 1);
    }
    return `${prodDate.getFullYear()}-${String(prodDate.getMonth() + 1).padStart(2, '0')}-${String(prodDate.getDate()).padStart(2, '0')}`;
  })();

  const createFormBranch = canManageAll ? inputBranch : userBranchId;
  const { data: createFormClosureStatus } = useClosureStatus(createFormBranch, calculatedOperationalDate);
  const isCreateFormClosed = createFormBranch && calculatedOperationalDate ? createFormClosureStatus === 'CLOSED' : false;

  const { data: productsResult, isLoading: isLoadingProducts } = useProductsQuery({ isActive: true, limit: 100 });
  const fullProductList = (productsResult?.data || []).filter(p => allowedCategories.includes(p.category));

  const { data: branches = [] } = useActiveBranchesQuery();

  const {
    data: response,
    isLoading: isLoadingEntries,
    isError: entriesError,
    error: entriesErrorObj,
    refetch: refetchEntries,
  } = useProductionEntriesQuery(entriesBranchId, {
    limit: 10000,
    productId: selectedFilterProduct || undefined,
  });

  const groupedEntries = response?.data || [];

  const searchedGroups = searchTerm
    ? groupedEntries.filter(g => {
        const name = getLocalizedName(g.product, i18n.language) || g.product?.name || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : groupedEntries;

  const totalGroups = searchedGroups.length;
  const totalPages = Math.ceil(totalGroups / itemsPerPage);
  const displayGroups = searchedGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const createMutation = useCreateProductionMutation();
  const updateMutation = useUpdateProductionMutation();
  const deleteMutation = useDeleteProductionMutation();

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilterBranch, selectedFilterProduct, searchTerm]);

  useEffect(() => {
    if (canManageAll && branches.length > 0) {
      if (!closureBranch) {
        setClosureBranch(branches[0].id.toString());
      }
    }
  }, [branches, canManageAll, closureBranch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const getGroupKey = (group) => {
    return `${group.productId}-${group.branchId}-${group.operationalDate}`;
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const requiredBranch = inputBranch || userBranchId;
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

    try {
      await createMutation.mutateAsync({
        productId: parseInt(product),
        branchId: parseInt(requiredBranch),
        shift,
        quantity: parseFloat(quantity),
        productionDate,
      });
      setSuccess('Production recorded successfully!');
      setProduct('');
      setQuantity('');
      setSelectedProductUnitType(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to record production');
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

    if (editingEntry?.product?.unitType === 'piece') {
      const qty = parseFloat(editFormData.quantity);
      if (!Number.isInteger(qty)) {
        setError('Quantity for piece products must be a whole number (no decimals)');
        return;
      }
    }

    const updatePayload = {
      quantity: parseFloat(editFormData.quantity),
    };

    try {
      await updateMutation.mutateAsync({
        id: editingEntry.id,
        data: updatePayload,
        branchId: editingEntry.branchId,
      });
      setSuccess('Production updated successfully!');
      setIsEditModalOpen(false);
      setEditingEntry(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update production');
    }
  };

  const handleDelete = async (id, branchId) => {
    if (window.confirm(t('production.deleteConfirm'))) {
      setError('');
      setSuccess('');
      try {
        await deleteMutation.mutateAsync({ id, branchId });
        setSuccess(t('production.deleted'));
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message || 'Failed to delete production');
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('production.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {t('production.productionDate')}: {productionDate ? formatOperationalDate(productionDate) : '-'}
            {calculatedOperationalDate && calculatedOperationalDate !== productionDate && (
              <span className="ml-2 text-[#D2B48C]">→ {t('production.salesDay')}: {formatOperationalDate(calculatedOperationalDate)}</span>
            )}
          </p>
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
              disabled
              className="w-full px-4 py-3.5 bg-gray-100 dark:bg-[#2d2d4a] border-0 rounded-xl text-sm dark:text-white cursor-not-allowed opacity-70"
              title={t('production.shiftLockedTooltip')}
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
              disabled={updateMutation.isPending}
              className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70"
            >
              {updateMutation.isPending ? t('production.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 mb-8 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-44">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.productionDate')}</label>
            <input
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              required
              disabled={createMutation.isPending}
              min={minDateStr}
              max={maxDateStr}
            />
          </div>

          <div className="w-full md:flex-1 md:min-w-[180px]">
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
                  const selected = fullProductList.find(p => p.id === parseInt(e.target.value));
                  setSelectedProductUnitType(selected?.unitType || null);
                  setQuantity('');
                }}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
                required
                disabled={createMutation.isPending}
              >
                <option value="">{t('production.selectProduct')} ({fullProductList.length})</option>
                {fullProductList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getLocalizedName(p, i18n.language)} ({getCategoryLabel(p.category)}) [{p.unitType}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {canManageAll && (
            <div className="w-full md:flex-1 md:min-w-[180px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.branch')}</label>
              <select
                value={inputBranch}
                onChange={(e) => setInputBranch(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
                required
                disabled={createMutation.isPending}
              >
                <option value="">{t('production.selectBranch')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="w-full md:flex-1 md:min-w-[180px]">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.shift')}</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              required
              disabled={createMutation.isPending}
            >
              <option value="">{t('production.selectShift')}</option>
              {SHIFTS.map((s) => (
                <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-40">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('production.quantity')}</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              placeholder="0"
              required
              disabled={createMutation.isPending}
              min="0"
              step={selectedProductUnitType === 'piece' ? '1' : '0.01'}
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || isCreateFormClosed}
            className="w-full md:w-auto px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center justify-center md:justify-start gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
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

      <OperationalDayControlBar
        branchId={closureBranch}
        branches={branches}
        onBranchChange={setClosureBranch}
      />

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={t('production.searchProduction')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white"
          />
        </div>
        {canManageAll && (
          <select
            value={selectedFilterBranch}
            onChange={(e) => setSelectedFilterBranch(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white min-w-[140px]"
          >
            <option value="">{t('production.allBranches')}</option>
            {(Array.isArray(branches) ? branches : []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <select
          value={selectedFilterProduct}
          onChange={(e) => setSelectedFilterProduct(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white min-w-[140px]"
        >
          <option value="">{t('production.allProducts')}</option>
          {(Array.isArray(fullProductList) ? fullProductList : []).map((p) => (
            <option key={p.id} value={p.id}>{getLocalizedName(p, i18n.language)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="px-6 py-5 border-b border-[#E5E1D8] dark:border-[#2d2d4a] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#001F3F] dark:text-white">
            {canManageAll ? t('production.allProductionRecords') : t('production.todaysEntries')}
          </h2>
          <button
            onClick={() => refetchEntries()}
            className="p-2 hover:bg-[#F9F7F2] rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {isLoadingEntries ? (
          <TableSkeleton rows={10} columns={canManageAll ? 6 : 5} />
        ) : entriesError ? (
          <ApiErrorState error={entriesErrorObj} onRetry={() => refetchEntries()} />
        ) : displayGroups.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-[#F9F7F2]/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10"></th>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.operationalDate')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider sticky left-0 bg-white dark:bg-[#1a1a2e] z-10">{t('production.product')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.entries')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.totalProduced')}</th>
                {canManageAll && (
                  <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.branch')}</th>
                )}
                <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#2d2d4a]">
              {displayGroups.map((group) => {
                const groupKey = getGroupKey(group);
                const isExpanded = expandedGroups[groupKey];
                const [y, m, d] = group.operationalDate.split('-');
                const formattedDate = `${d}/${m}/${y}`;
                return (
                  <Fragment key={groupKey}>
                    <tr
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
                      <td className="px-6 py-3.5 text-sm font-semibold text-[#001F3F] dark:text-white sticky left-0 bg-white dark:bg-[#1a1a2e] z-10">
                        {getLocalizedName(group.product, i18n.language) || group.product?.name || t('common.na')}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F9F7F2] dark:bg-[#2d2d4a] text-gray-600 dark:text-gray-300">
                          {group.entries.length} {group.entries.length === 1 ? t('production.entry') : t('production.entries')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm font-bold text-[#001F3F] dark:text-white">
                        {Number(group.totalQuantity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      {canManageAll && (
                        <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                          {getLocalizedName(group.branch, i18n.language) || group.branch?.name || '-'}
                        </td>
                      )}
                      <td className="px-6 py-3.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleGroupExpand(groupKey); }}
                          className="text-xs font-medium text-[#001F3F] dark:text-[#D2B48C] hover:underline"
                        >
                          {isExpanded ? t('common.hide') : t('common.view')}
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
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.timeDate')}</th>
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.shift')}</th>
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.quantity')}</th>
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.user')}</th>
                                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.action')}</th>
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
                                        {canEditOperationalRecord(group.operationalDate, userRole) && !group.isClosed ? (
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }}
                                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#001F3F] dark:text-[#D2B48C] hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] rounded-md transition-colors"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                              {t('common.edit')}
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDelete(entry.id, group.branchId); }}
                                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              {t('common.delete')}
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                                            <Edit2 className="w-3 h-3" />
                                            {t('common.edit')}
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
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        ) : (
          <EmptyState type="production" message={t('production.noRecords')} />
        )}

        {!isLoadingEntries && !entriesError && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E1D8] dark:border-[#2d2d4a]">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('production.showing', {
                from: ((currentPage - 1) * itemsPerPage) + 1,
                to: Math.min(currentPage * itemsPerPage, totalGroups),
                total: totalGroups
              })}
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
                {t('production.pageOf', { current: currentPage, total: totalPages })}
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
