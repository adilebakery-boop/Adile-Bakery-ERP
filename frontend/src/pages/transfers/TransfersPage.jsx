import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { getUserRole, getUserBranchId, getBranchType, formatOperationalDate, isManagerOrAdmin, canEditOperationalRecord } from '../../utils/authUtils';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { TableSkeleton } from '../../components/skeletons';
import Modal from '../../components/Modal';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useTransfersQuery } from '../../features/transfers/hooks/queries/useTransfersQuery';
import { useTransferMutations } from '../../features/transfers/hooks/mutations/useTransferMutations';
import { useProductCategoriesQuery } from '../../features/products/hooks/queries/useProductCategoriesQuery';

const FEATURE_TRANSFERS = import.meta.env.VITE_FEATURE_TRANSFERS === 'true';

export default function TransfersPage() {
  const { t, i18n } = useTranslation();

const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};
  const userRole = getUserRole();

  if (!FEATURE_TRANSFERS) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Transfers are not enabled</p>
      </div>
    );
  }

  const branchType = getBranchType();
  const isAdminManagerOrTransferOperator = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'TRANSFER_OPERATOR';
  if (!isAdminManagerOrTransferOperator && branchType === 'INDEPENDENT') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Transfers are not available for this branch</p>
      </div>
    );
  }

  const userBranchId = getUserBranchId();
  const canManageAll = isManagerOrAdmin();
  const isTransferOperator = userRole === 'TRANSFER_OPERATOR';

  const maxPastDays = canManageAll ? 4 : 2;
  const today = new Date();
  const maxDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - maxPastDays);
  const minDateStr = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;

  const isAdmin = userRole === 'ADMIN';
  const isLocked = !isAdmin;

  const endDate = new Date().toISOString().split('T')[0];
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5);
  const startDate = pastDate.toISOString().split('T')[0];

  const [form, setForm] = useState({
    branchType: isAdmin ? 'DEPENDENT' : '',
    branchId: '',
    toBranchId: '',
    productId: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dependentBranchFilter, setDependentBranchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const [expandedGroups, setExpandedGroups] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');

  const branchFilter = canManageAll || isTransferOperator ? {} : { dependentBranchId: userBranchId };
  const { data: transfersData, isLoading, isError, error: fetchError, refetch } = useTransfersQuery({
    ...branchFilter,
    startDate,
    endDate,
    dependentBranchId: dependentBranchFilter || undefined,
    limit: 10000,
  });

  const { data: productsResult } = useProductsQuery({ isActive: true, limit: 100 });
  const products = productsResult?.data || [];

  const { data: branches = [] } = useActiveBranchesQuery();
  const { data: categories = [] } = useProductCategoriesQuery();
  const filteredBranches = useMemo(() => {
    if (form.branchType === 'DEPENDENT') {
      return branches.filter(b => b.branchType === 'DEPENDENT');
    }
    return [];
  }, [branches, form.branchType]);

  const sourceBranches = useMemo(() => branches.filter(b => b.branchType === 'SOURCE' || !b.branchType), [branches]);

  const dependentBranches = useMemo(() => branches.filter(b => b.branchType === 'DEPENDENT'), [branches]);

  const resolvedSourceBranchName = useMemo(() => {
    if (form.branchType !== 'DEPENDENT' || !form.branchId) return '';
    const depBranch = branches.find(b => String(b.id) === String(form.branchId));
    if (!depBranch?.sourceBranchId) return '';
    const srcBranch = branches.find(b => String(b.id) === String(depBranch.sourceBranchId));
    return srcBranch ? getLocalizedName(srcBranch, i18n.language) : '';
  }, [form.branchType, form.branchId, branches, i18n.language]);

  const allTransfers = useMemo(() => {
    const list = transfersData || [];
    let filtered = list;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const name = getLocalizedName(t.product, i18n.language) || t.product?.name || '';
        return name.toLowerCase().includes(q);
      });
    }
    if (categoryFilter) {
      filtered = filtered.filter(t => {
        const catId = t.product?.category?.id || t.product?.category;
        return String(catId) === categoryFilter;
      });
    }
    return filtered;
  }, [transfersData, searchTerm, categoryFilter, i18n.language]);

  const groupedTransfers = useMemo(() => {
    const groups = {};
    for (const t of allTransfers) {
      const dateKey = t.operationalDate ? t.operationalDate.split('T')[0] : '';
      const key = `${t.productId}-${dateKey}-${t.sourceBranchId}-${t.dependentBranchId || 'null'}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          productId: t.productId,
          product: t.product,
          operationalDate: t.operationalDate,
          sourceBranch: t.sourceBranch,
          dependentBranch: t.dependentBranch,
          sourceBranchId: t.sourceBranchId,
          dependentBranchId: t.dependentBranchId,
          entries: [],
          totalQuantity: 0,
        };
      }
      groups[key].entries.push(t);
      groups[key].totalQuantity += Number(t.receivedQuantity || 0) + Number(t.sentQuantity || 0);
    }
    return Object.values(groups).sort((a, b) => {
      const dateCompare = (b.operationalDate || '').localeCompare(a.operationalDate || '');
      if (dateCompare !== 0) return dateCompare;
      const nameA = getLocalizedName(a.product, i18n.language) || '';
      const nameB = getLocalizedName(b.product, i18n.language) || '';
      return nameA.localeCompare(nameB);
    });
  }, [allTransfers, i18n.language]);

  const totalPages = Math.ceil(groupedTransfers.length / itemsPerPage);
  const displayGroups = groupedTransfers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const mutations = useTransferMutations();

  useEffect(() => { setCurrentPage(1); }, [searchTerm, dependentBranchFilter, categoryFilter]);
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (isLocked) {
      const userType = getBranchType();
      setForm(prev => ({
        ...prev,
        branchType: userType || '',
        branchId: userBranchId ? String(userBranchId) : '',
      }));
    }
  }, [isLocked, userBranchId]);

  const clearMessages = () => { setActionError(''); setActionSuccess(''); };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    clearMessages();

    if (form.date < minDateStr || form.date > maxDateStr) {
      setActionError(t('transfers.dateRangeError', { defaultValue: `Transfer date must be within the last ${maxPastDays} days or today` }));
      return;
    }

    const isSource = form.branchType === 'SOURCE';
    const payload = {
      branchType: form.branchType,
      productId: Number(form.productId),
      operationalDate: form.date,
    };
    if (isSource) {
      payload.sourceBranchId = Number(form.branchId);
      payload.dependentBranchId = Number(form.toBranchId);
      payload.sentQuantity = Number(form.quantity);
    } else {
      payload.dependentBranchId = Number(form.branchId);
      payload.receivedQuantity = Number(form.quantity);
    }
    try {
      await mutations.createTransfer.mutateAsync(payload);
      setForm({
        branchType: form.branchType,
        branchId: '',
        toBranchId: '',
        productId: '',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
      });
      setActionSuccess(t('transfers.createSuccess'));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleEditClick = (transfer) => {
    clearMessages();
    const opDateStr = transfer.operationalDate ? transfer.operationalDate.split('T')[0] : '';
    if (!canEditOperationalRecord(opDateStr, userRole)) {
      setActionError(t('transfers.editWindowExpired', { defaultValue: `Transfer records can only be edited within the allowed edit window` }));
      return;
    }
    setEditingTransfer(transfer);
    setEditQuantity(String(transfer.receivedQuantity || ''));
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTransfer) return;
    try {
      await mutations.updateReceived.mutateAsync({ id: editingTransfer.id, data: { receivedQuantity: Number(editQuantity) } });
      setActionSuccess(t('transfers.updateSuccess'));
      setIsEditModalOpen(false);
      setEditingTransfer(null);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const toggleGroupExpand = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const COL_COUNT = 7;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-8">
        <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">{t('transfers.title')}</h1>
      </div>

      {actionSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{actionSuccess}</div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{actionError}</div>
      )}

      <div className="bg-white dark:bg-[#12262A] rounded-[24px] p-6 mb-8 border border-[#E5E1D8] dark:border-[#1E3A3F]" style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}>
        <form onSubmit={handleCreateTransfer} className="space-y-5">
          <div className="flex flex-col md:grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.transferDate')}</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                min={minDateStr}
                max={maxDateStr}
                className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.branchType')}</label>
              <select
                value={form.branchType}
                onChange={(e) => setForm({ ...form, branchType: e.target.value, branchId: '' })}
                className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl outline-none text-sm dark:text-white"
                disabled={isLocked}
                required
              >
                {!isLocked && <option value="">{t('transfers.selectType')}</option>}
                {isLocked ? (
                  <option value={form.branchType}>{form.branchType}</option>
                ) : (
                  <>
                    <option value="SOURCE">{t('transfers.source')}</option>
                    <option value="DEPENDENT">{t('transfers.dependent')}</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.fromBranch')}</label>
              {form.branchType === 'SOURCE' ? (
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl outline-none text-sm dark:text-white"
                  disabled={isLocked}
                  required
                >
                  {!isLocked && <option value="">{t('transfers.selectSourceBranch')}</option>}
                  {sourceBranches.map(b => (
                    <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={resolvedSourceBranchName || t('transfers.autoResolved')}
                  disabled
                  className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl text-sm dark:text-white cursor-not-allowed opacity-70"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{form.branchType === 'SOURCE' ? t('transfers.toBranch') : t('transfers.branch')}</label>
              {form.branchType === 'SOURCE' ? (
                <select
                  value={form.toBranchId}
                  onChange={(e) => setForm({ ...form, toBranchId: e.target.value })}
                  className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl outline-none text-sm dark:text-white"
                  disabled={isLocked}
                  required
                >
                  {!isLocked && <option value="">{t('transfers.selectDestBranch')}</option>}
                  {dependentBranches.map(b => (
                    <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl outline-none text-sm dark:text-white"
                  disabled={isLocked}
                  required
                >
                  {!isLocked && form.branchType && <option value="">{t('transfers.selectBranch')}</option>}
                  {isLocked ? (
                    <option value={form.branchId}>
                      {getLocalizedName(branches.find(b => String(b.id) === String(form.branchId)), i18n.language) || '...'}
                    </option>
                  ) : (
                    filteredBranches.map(b => (
                      <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="w-full md:flex-1">
<label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.product')}</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm dark:text-white"
                required
              >
                <option value="">{t('transfers.selectProduct')}</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{getLocalizedName(p, i18n.language)}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-40">
<label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.quantity')}</label>
              <input
                type="number"
                step="any"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-40 px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm dark:text-white"
                placeholder="0"
                required
              />
            </div>
            <button
              type="submit"
              disabled={mutations.createTransfer.isPending}
              className="w-full md:w-auto px-6 py-3 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70"
            >
              {mutations.createTransfer.isPending ? t('transfers.saving') : t('transfers.recordTransfer')}
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#12262A] border border-[#E5E1D8] dark:border-[#1E3A3F] rounded-xl focus:ring-2 focus:ring-[#024A5B] focus:border-transparent outline-none text-sm dark:text-white"
            placeholder={t('transfers.searchProducts')}
          />
        </div>
        <select
          value={dependentBranchFilter}
          onChange={(e) => setDependentBranchFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#12262A] border border-[#E5E1D8] dark:border-[#1E3A3F] rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm dark:text-white"
        >
          <option value="">{t('transfers.allBranches')}</option>
          {dependentBranches.map(b => (
            <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#12262A] border border-[#E5E1D8] dark:border-[#1E3A3F] rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm dark:text-white"
        >
          <option value="">{t('transfers.allCategories')}</option>
          {categories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

      </div>

      <div className="bg-white dark:bg-[#12262A] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#1E3A3F]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#DFEDE2]/50 dark:bg-[#1E3A3F]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('transfers.product')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('transfers.date')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('transfers.branchFlow')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('transfers.entries')}</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('transfers.totalQty')}</th>
                <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('transfers.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#1E3A3F]">
              {isLoading ? (
                <tr>
                  <td colSpan={COL_COUNT}><TableSkeleton rows={8} columns={COL_COUNT} /></td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={COL_COUNT}><ApiErrorState error={fetchError} onRetry={refetch} /></td>
                </tr>
              ) : displayGroups.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT}><EmptyState type="transfers" message={t('transfers.noTransfers')} /></td>
                </tr>
              ) : (
                displayGroups.flatMap((group) => {
                  const isExpanded = !!expandedGroups[group.key];
                  return [
                    <tr
                      key={group.key}
                      onClick={() => toggleGroupExpand(group.key)}
                      className="cursor-pointer hover:bg-[#DFEDE2]/50 dark:hover:bg-[#1E3A3F]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#024A5B] dark:text-white">
                        {getLocalizedName(group.product, i18n.language)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {group.operationalDate ? formatDateDDMMYYYY(group.operationalDate.split('T')[0]) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {group.sourceBranch ? getLocalizedName(group.sourceBranch, i18n.language) : '-'} → {group.dependentBranch ? getLocalizedName(group.dependentBranch, i18n.language) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {group.entries.length} {t('transfers.entries')}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {Number(group.totalQuantity).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleGroupExpand(group.key); }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {isExpanded ? t('transfers.hide') : t('transfers.view')}
                        </button>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`${group.key}-detail`}>
                        <td colSpan={COL_COUNT} className="p-0">
                          <div className="bg-[#DFEDE2]/40 dark:bg-[#1E3A3F]/40 border-l-4 border-[#CAEAFD] dark:border-[#CAEAFD]/50 ml-6 mr-3 my-1 rounded-r-lg">
                            <table className="w-full">
                              <thead>
                                <tr className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                                  <th className="px-4 py-2 text-left">{t('transfers.from')}</th>
                                  <th className="px-4 py-2 text-left">{t('transfers.to')}</th>
                                  <th className="px-4 py-2 text-left">{t('transfers.qty')}</th>
                                  <th className="px-4 py-2 text-left">{t('transfers.sent')}</th>
                                  <th className="px-4 py-2 text-left">{t('transfers.user')}</th>
                                  <th className="px-4 py-2 text-right">{t('transfers.action')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.entries.map(entry => (
                                  <tr key={entry.id} className="hover:bg-[#DFEDE2]/60 dark:hover:bg-[#1E3A3F]/60 transition-colors">
                                    <td className="px-4 py-2 text-xs text-gray-500">{entry.sourceBranch ? getLocalizedName(entry.sourceBranch, i18n.language) : '-'}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500">{entry.dependentBranch ? getLocalizedName(entry.dependentBranch, i18n.language) : '-'}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{Number(entry.receivedQuantity)}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">
                                      {entry.sentQuantity !== null ? Number(entry.sentQuantity) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-500">
                                      {entry.creator?.name || entry.creator?.username || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {canEditOperationalRecord(entry.operationalDate ? entry.operationalDate.split('T')[0] : '', userRole) ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }}
                                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          {t('transfers.edit')}
                                        </button>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed" title={t('transfers.editWindowExpired', { defaultValue: 'Edit window expired' })}>
                                          <Edit2 className="w-3 h-3" />
                                          {t('transfers.edit')}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg hover:bg-[#DFEDE2] disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500">
            {t('transfers.pageOf', { current: currentPage, total: totalPages })}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg hover:bg-[#DFEDE2] disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('transfers.editTransfer')}>
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.product')}</label>
            <input
              type="text"
              value={getLocalizedName(editingTransfer?.product, i18n.language) || ''}
              disabled
              className="w-full px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl text-sm dark:text-white cursor-not-allowed opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.branchFlow')}</label>
            <input
              type="text"
              value={`${editingTransfer?.sourceBranch ? getLocalizedName(editingTransfer.sourceBranch, i18n.language) : '-'} → ${editingTransfer?.dependentBranch ? getLocalizedName(editingTransfer.dependentBranch, i18n.language) : '-'}`}
              disabled
              className="w-full px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl text-sm dark:text-white cursor-not-allowed opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.date')}</label>
            <input
              type="text"
              value={editingTransfer?.operationalDate ? formatDateDDMMYYYY(editingTransfer.operationalDate.split('T')[0]) : '-'}
              disabled
              className="w-full px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl text-sm dark:text-white cursor-not-allowed opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">{t('transfers.quantity')}</label>
            <input
              type="number"
              step="any"
              min="0"
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-6 py-3 border border-[#E5E1D8] dark:border-[#1E3A3F] rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1E3A3F] transition-colors"
            >
              {t('transfers.cancel')}
            </button>
            <button
              type="submit"
              disabled={mutations.updateReceived.isPending}
              className="flex-1 px-6 py-3 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70"
            >
              {mutations.updateReceived.isPending ? t('transfers.saving') : t('transfers.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
