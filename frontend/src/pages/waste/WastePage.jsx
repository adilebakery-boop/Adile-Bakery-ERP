import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, ChevronDown, ChevronUp, RefreshCw, Loader2, CheckCircle } from 'lucide-react';
import Modal from '../../components/Modal';
import { useWasteQuery } from '../../features/waste/hooks/queries/useWasteQuery';
import { useClosureStatus } from '../../hooks/useClosureStatus';
import OperationalDayControlBar from '../../components/OperationalDayControlBar';
import { useCreateWasteMutation } from '../../features/waste/hooks/mutations/useCreateWasteMutation';
import { useUpdateWasteMutation } from '../../features/waste/hooks/mutations/useUpdateWasteMutation';
import { useDeleteWasteMutation } from '../../features/waste/hooks/mutations/useDeleteWasteMutation';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { getUser, canEditOperationalRecord } from '../../utils/authUtils';
import { getCategoriesForRole } from '../../utils/permissions';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { GroupedTable, OperationalPagination } from '../../components/operational';

export default function WastePage() {
  const { t, i18n } = useTranslation();
  const user = getUser();
  const isAdmin = user?.role === 'ADMIN';
  const canManage = user && ['ADMIN', 'MANAGER'].includes(user.role);
  const userBranchId = user?.branchId;

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(() => {
    const u = getUser();
    return u?.branchId ? u.branchId.toString() : '';
  });
  const [closureBranch, setClosureBranch] = useState(() => {
    const u = getUser();
    return u?.branchId ? u.branchId.toString() : '';
  });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});

  const entriesBranchId = isAdmin ? (selectedBranch ? Number(selectedBranch) : null) : (userBranchId ?? null);

  const [selectedProductUnitType, setSelectedProductUnitType] = useState(null);
  const [createForm, setCreateForm] = useState(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return {
      productId: '',
      branchId: '',
      operationalDate: today,
      quantity: '',
      reason: '',
    };
  });

  const createFormBranch = canManage ? (createForm.branchId || undefined) : userBranchId;
  const { data: createFormClosureStatus } = useClosureStatus(createFormBranch, createForm.operationalDate);
  const isCreateFormClosed = createFormBranch ? createFormClosureStatus === 'CLOSED' : false;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingWaste, setEditingWaste] = useState(null);
  const [editForm, setEditForm] = useState({
    quantity: '',
    reason: '',
  });
  const [actionError, setActionError] = useState(null);
  const [success, setSuccess] = useState('');

  const filters = {
    search: searchTerm || undefined,
    branchId: entriesBranchId ?? undefined,
    productId: selectedProduct || undefined,
    limit: 10000,
  };

  const { data, isLoading, isError, error: queryError, refetch } = useWasteQuery(filters);
  const wastes = data?.data || [];

  const { data: branches = [] } = useActiveBranchesQuery();
  const { data: productsData } = useProductsQuery({ isActive: true, limit: 500 });
  const products = productsData?.data || [];
  const allowedCategories = getCategoriesForRole(user?.role);
  const filteredProducts = canManage ? products : products.filter((p) => allowedCategories.includes(p.category));

  const today = new Date();
  const maxCreateDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const minCreateDate = new Date();
  minCreateDate.setDate(minCreateDate.getDate() - 2);
  const minCreateDateStr = `${minCreateDate.getFullYear()}-${String(minCreateDate.getMonth() + 1).padStart(2, '0')}-${String(minCreateDate.getDate()).padStart(2, '0')}`;

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
  }, [searchTerm, selectedBranch, selectedProduct]);

  useEffect(() => {
    if (canManage && branches.length > 0) {
      if (!closureBranch) {
        setClosureBranch(branches[0].id.toString());
      }
    }
  }, [branches, canManage, closureBranch]);

  const normalizedOpDate = (d) => (d || '').split('T')[0];

  const groupedWastes = (() => {
    const groups = {};
    wastes.forEach(w => {
      const opDate = normalizedOpDate(w.operationalDate);
      const groupKey = `${opDate}-${w.productId}-${w.branchId}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          operationalDate: opDate,
          product: w.product,
          branch: w.branch,
          productId: w.productId,
          branchId: w.branchId,
          entries: [],
        };
      }
      groups[groupKey].entries.push(w);
    });
    return Object.values(groups).sort((a, b) => {
      const dateCmp = (b.operationalDate || '').localeCompare(a.operationalDate || '');
      if (dateCmp !== 0) return dateCmp;
      const productCmp = (a.product?.name || '').localeCompare(b.product?.name || '');
      if (productCmp !== 0) return productCmp;
      return (a.branch?.name || '').localeCompare(b.branch?.name || '');
    });
  })();

  const visibilityCutoff = (() => {
    const addisFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const todayStr = addisFormatter.format(new Date());
    const [ty, tm, td] = todayStr.split('-');
    const today = new Date(Date.UTC(parseInt(ty), parseInt(tm) - 1, parseInt(td)));
    const cutoff = new Date(today);
    cutoff.setUTCDate(cutoff.getUTCDate() - 5);
    const cy = cutoff.getUTCFullYear();
    const cm = String(cutoff.getUTCMonth() + 1).padStart(2, '0');
    const cd = String(cutoff.getUTCDate()).padStart(2, '0');
    return `${cy}-${cm}-${cd}`;
  })();
  const visibleGroups = groupedWastes.filter(g => g.operationalDate >= visibilityCutoff);

  const searchedGroups = searchTerm
    ? visibleGroups.filter(g => {
        const name = getLocalizedName(g.product, i18n.language) || g.product?.name || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : visibleGroups;

  const itemsPerPage = 10;
  const totalGroups = searchedGroups.length;
  const totalPages = Math.ceil(totalGroups / itemsPerPage);
  const displayGroups = searchedGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetCreateForm = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setCreateForm({
      productId: '',
      branchId: '',
      operationalDate: today,
      quantity: '',
      reason: '',
    });
    setSelectedProductUnitType(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionError(null);
    if (createForm.operationalDate && !canEditOperationalRecord(createForm.operationalDate, user.role)) {
      setActionError(t('waste.cannotEditOlderThan3Days'));
      return;
    }
    if (selectedProductUnitType === 'piece') {
      const qty = parseFloat(createForm.quantity);
      if (!Number.isInteger(qty)) {
        setActionError(t('waste.integerQuantityRequired'));
        return;
      }
    }
    try {
      await createWaste.mutateAsync({
        ...createForm,
        branchId: createForm.branchId || (userBranchId ? userBranchId.toString() : ''),
        quantity: parseFloat(createForm.quantity),
      });
      resetCreateForm();
      setSuccess('Waste record created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleEditClick = (waste) => {
    setEditingWaste(waste);
    setEditForm({
      quantity: waste.quantity.toString(),
      reason: waste.reason || '',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    if (editingWaste?.product?.unitType === 'piece') {
      const qty = parseFloat(editForm.quantity);
      if (!Number.isInteger(qty)) {
        setActionError(t('waste.integerQuantityRequired'));
        return;
      }
    }
    try {
      await updateWaste.mutateAsync({
        id: editingWaste.id,
        data: {
          quantity: parseFloat(editForm.quantity),
          reason: editForm.reason || undefined,
        },
        branchId: editingWaste.branchId,
      });
      setIsEditOpen(false);
      setEditingWaste(null);
      setSuccess('Waste record updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async (id, branchId) => {
    if (window.confirm(t('waste.deleteConfirm'))) {
      setActionError(null);
      try {
        await deleteWaste.mutateAsync({ id, branchId });
        setSuccess('Waste record deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setActionError(err.message);
      }
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const toggleGroupExpand = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getGroupKey = (group) => `${group.operationalDate}-${group.productId}-${group.branchId}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('waste.title')}</h1>
      </div>

        <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] p-6 mb-8 border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.product')}</label>
              <select
                value={createForm.productId}
                onChange={(e) => {
                  setCreateForm({ ...createForm, productId: e.target.value });
                  const selected = filteredProducts.find(p => p.id === parseInt(e.target.value));
                  setSelectedProductUnitType(selected?.unitType || null);
                }}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
                required
                autoFocus
                disabled={createWaste.isPending}
              >
                <option value="">{t('waste.selectProduct')}</option>
                {(Array.isArray(filteredProducts) ? filteredProducts : []).map((p) => (
                  <option key={p.id} value={p.id}>{getLocalizedName(p, i18n.language)}</option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div className="flex-1 min-w-[180px]">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.branch')}</label>
                <select
                  value={createForm.branchId}
                  onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}
                  className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
                  required
                  disabled={createWaste.isPending}
                >
                  <option value="">{t('waste.selectBranch')}</option>
                  {(Array.isArray(branches) ? branches : []).map((b) => (
                    <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="w-44">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.operationalDate')}</label>
              <input
                type="date"
                value={createForm.operationalDate}
                onChange={(e) => setCreateForm({ ...createForm, operationalDate: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
                required
                disabled={createWaste.isPending}
                min={minCreateDateStr}
                max={maxCreateDate}
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.quantity')}</label>
              <input
                type="number"
              step={selectedProductUnitType === 'piece' ? '1' : 'any'}
                value={createForm.quantity}
                onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
                placeholder="0"
                required
                disabled={createWaste.isPending}
                min="0"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.reason')}</label>
              <textarea
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white resize-none"
                rows={2}
                placeholder={t('waste.enterReason')}
                maxLength={500}
                disabled={createWaste.isPending}
              />
            </div>
            <button
              type="submit"
              disabled={createWaste.isPending || isCreateFormClosed}
              className="px-6 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {createWaste.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('waste.saving')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t('waste.recordWaste')}
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
            placeholder={t('waste.searchWaste')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white"
          />
        </div>
        {isAdmin && (
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
        )}
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#1a1a2e] border border-[#E5E1D8] dark:border-[#2d2d4a] rounded-xl focus:ring-2 focus:ring-[#001F3F] focus:border-transparent outline-none text-sm dark:text-white min-w-[140px]"
        >
          <option value="">{t('waste.allProducts')}</option>
          {(Array.isArray(filteredProducts) ? filteredProducts : []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error?.message || error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a2e] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#2d2d4a]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <div className="px-6 py-5 border-b border-[#E5E1D8] dark:border-[#2d2d4a] flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#001F3F] dark:text-white">
            {t('waste.title')}
          </h2>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <GroupedTable
          groups={displayGroups}
          getGroupKey={getGroupKey}
          expandedGroups={expandedGroups}
          isLoading={isLoading}
          isError={isError}
          error={queryError}
          onRetry={() => refetch()}
          emptyType="waste"
          emptyMessage={t('waste.noWasteRecords')}
          skeletonRows={8}
          skeletonColumns={canManage ? 7 : 6}
          colSpan={canManage ? 7 : 6}
          renderHeader={() => (
            <tr>
              <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10"></th>
              <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.operationalDate')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.product')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.entries')}</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.quantity')}</th>
              {canManage && <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.branch')}</th>}
              <th className="px-6 py-3.5 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          )}
          renderGroupRow={(group, { isExpanded }) => {
            const [y, m, d] = group.operationalDate.split('-');
            const formattedDate = `${m}/${d}/${y}`;
            const groupKey = getGroupKey(group);
            return (
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
                <td className="px-6 py-3.5 text-sm font-semibold text-[#001F3F] dark:text-white">
                  {getLocalizedName(group.product, i18n.language) || group.product?.name || t('common.na')}
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#F9F7F2] dark:bg-[#2d2d4a] text-gray-600 dark:text-gray-300">
                    {group.entries.length} {group.entries.length === 1 ? t('production.entry') : t('production.entries')}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-sm font-bold text-[#001F3F] dark:text-white">
                  {Number(group.entries.reduce((sum, e) => sum + Number(e.quantity || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                {canManage && (
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
            );
          }}
          renderEntryTable={(group) => (
            <>
              <thead>
                <tr className="border-b border-[#E5E1D8]/50 dark:border-[#2d2d4a]/50">
                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('production.timeDate')}</th>
                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.quantity')}</th>
                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.reason')}</th>
                  <th className="px-6 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('waste.recordedBy')}</th>
                  {canManage && <th className="px-6 py-2.5 text-right text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D8]/30 dark:divide-[#2d2d4a]/30">
                {group.entries.map((waste) => {
                  const entryDate = new Date(waste.createdAt);
                  const entryTime = entryDate.toLocaleTimeString('en-US', { timeZone: 'Africa/Addis_Ababa', hour: '2-digit', minute: '2-digit', hour12: true });
                  const entryFormattedDate = entryDate.toLocaleDateString('en-US', { timeZone: 'Africa/Addis_Ababa', day: '2-digit', month: '2-digit', year: 'numeric' });
                  return (
                    <tr key={waste.id} className="hover:bg-[#F9F7F2]/60 dark:hover:bg-[#2d2d4a]/60">
                      <td className="px-6 py-2.5 text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium">{entryTime}</span>
                        <span className="text-gray-400 dark:text-gray-500">&nbsp;{entryFormattedDate}</span>
                      </td>
                      <td className="px-6 py-2.5 text-xs font-semibold text-[#D2B48C]">{waste.quantity}</td>
                      <td className="px-6 py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                        {waste.reason || '-'}
                      </td>
                      <td className="px-6 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {waste.creator?.name || waste.creator?.username || `#${waste.createdBy}`}
                      </td>
                      <td className="px-6 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEditOperationalRecord(waste.operationalDate, user.role) && !waste.isClosed ? (
                            <>
                              <button
                                onClick={() => handleEditClick(waste)}
                                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-[#001F3F] dark:hover:text-white hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] rounded-md transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(waste.id, waste.branchId)}
                                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                              <Edit2 className="w-3 h-3" />
                              {t('common.edit')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          )}
        />

        {!isLoading && !isError && totalPages > 1 && (
          <OperationalPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
            disabledPrev={currentPage === 1}
            disabledNext={currentPage === totalPages}
          >
            {t('waste.showing', {
              from: ((currentPage - 1) * itemsPerPage) + 1,
              to: Math.min(currentPage * itemsPerPage, totalGroups),
              total: totalGroups,
            })}
          </OperationalPagination>
        )}
      </div>

      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditingWaste(null); }} title={t('waste.editWaste')}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.product')}</label>
              <div className="px-4 py-3.5 bg-gray-100 dark:bg-[#2d2d4a] rounded-xl text-sm text-gray-700 dark:text-gray-300">
                {editingWaste?.product?.name || `#${editingWaste?.productId}`}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.branch')}</label>
              <div className="px-4 py-3.5 bg-gray-100 dark:bg-[#2d2d4a] rounded-xl text-sm text-gray-700 dark:text-gray-300">
                {editingWaste?.branch?.name || `#${editingWaste?.branchId}`}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.quantity')}</label>
            <input
              type="number"
              step={editingWaste?.product?.unitType === 'piece' ? '1' : 'any'}
              value={editForm.quantity}
              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('waste.reason')}</label>
            <textarea
              value={editForm.reason}
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#F9F7F2] dark:bg-[#2d2d4a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-sm dark:text-white resize-none"
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setIsEditOpen(false); setEditingWaste(null); }} className="flex-1 px-6 py-3.5 border border-[#E5E1D8] dark:border-[#2d2d4a] text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-[#F9F7F2] dark:hover:bg-[#2d2d4a] transition-colors text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={updateWaste.isPending} className="flex-1 px-6 py-3.5 bg-[#001F3F] text-white rounded-xl font-medium hover:bg-[#001a35] transition-colors text-sm disabled:opacity-70">{updateWaste.isPending ? t('waste.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
