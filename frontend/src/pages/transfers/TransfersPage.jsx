import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { getUserRole, getUserBranchId, getBranchType, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { TableSkeleton } from '../../components/skeletons';
import Modal from '../../components/Modal';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useTransfersQuery } from '../../features/transfers/hooks/queries/useTransfersQuery';
import { useTransferMutations } from '../../features/transfers/hooks/mutations/useTransferMutations';

const FEATURE_TRANSFERS = import.meta.env.VITE_FEATURE_TRANSFERS === 'true';

export default function TransfersPage() {
  const { t, i18n } = useTranslation();
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

  const isAdmin = userRole === 'ADMIN';
  const isLocked = !isAdmin;

  const [form, setForm] = useState({
    branchType: '',
    branchId: '',
    productId: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: 10000,
  });

  const { data: productsResult } = useProductsQuery({ isActive: true, limit: 100 });
  const products = productsResult?.data || [];

  const { data: branches = [] } = useActiveBranchesQuery();
  const filteredBranches = useMemo(() => {
    if (!form.branchType) return [];
    if (form.branchType === 'SOURCE') {
      return branches.filter(b => b.branchType === 'SOURCE' || !b.branchType);
    }
    if (form.branchType === 'DEPENDENT') {
      return branches.filter(b => b.branchType === 'DEPENDENT');
    }
    return [];
  }, [branches, form.branchType]);

  const allTransfers = useMemo(() => {
    const list = transfersData || [];
    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(t => {
      const name = getLocalizedName(t.product, i18n.language) || t.product?.name || '';
      return name.toLowerCase().includes(q);
    });
  }, [transfersData, searchTerm, i18n.language]);

  const groupedTransfers = useMemo(() => {
    const groups = {};
    for (const t of allTransfers) {
      const dateKey = t.operationalDate ? t.operationalDate.split('T')[0] : '';
      const key = `${t.productId}-${dateKey}-${t.sourceBranchId}-${t.dependentBranchId}`;
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
      groups[key].totalQuantity += Number(t.receivedQuantity);
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

  useEffect(() => { setCurrentPage(1); }, [searchTerm, startDate, endDate]);
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
    try {
      await mutations.createTransfer.mutateAsync({
        productId: Number(form.productId),
        dependentBranchId: Number(form.branchId),
        receivedQuantity: Number(form.quantity),
        operationalDate: form.date,
      });
      setForm({
        branchType: isAdmin ? '' : form.branchType,
        branchId: isAdmin ? '' : form.branchId,
        productId: '',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
      });
      setActionSuccess('Transfer created successfully');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleEditClick = (transfer) => {
    clearMessages();
    setEditingTransfer(transfer);
    setEditQuantity(String(transfer.receivedQuantity || ''));
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTransfer) return;
    try {
      await mutations.updateReceived.mutateAsync({ id: editingTransfer.id, data: { receivedQuantity: Number(editQuantity) } });
      setActionSuccess('Transfer updated');
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
        <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">Transfers</h1>
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
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Transfer Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Branch Type</label>
              <select
                value={form.branchType}
                onChange={(e) => setForm({ ...form, branchType: e.target.value, branchId: '' })}
                className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl outline-none text-sm dark:text-white"
                disabled={isLocked}
                required
              >
                {!isLocked && <option value="">Select type</option>}
                {isLocked ? (
                  <option value={form.branchType}>{form.branchType}</option>
                ) : (
                  <>
                    <option value="SOURCE">SOURCE</option>
                    <option value="DEPENDENT">DEPENDENT</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Branch</label>
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl outline-none text-sm dark:text-white"
                disabled={isLocked}
                required
              >
                {!isLocked && form.branchType && <option value="">Select branch</option>}
                {isLocked ? (
                  <option value={form.branchId}>
                    {branches.find(b => String(b.id) === String(form.branchId))?.name || '...'}
                  </option>
                ) : (
                  filteredBranches.map(b => (
                    <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Product</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full px-4 py-3.5 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm dark:text-white"
                required
              >
                <option value="">Select product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{getLocalizedName(p, i18n.language)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Quantity</label>
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
              className="px-6 py-3 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70"
            >
              {mutations.createTransfer.isPending ? 'Saving...' : 'Record Transfer'}
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
            className="w-full pl-10 pr-4 py-3 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
            placeholder="Search products..."
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-4 py-3 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
          title="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-4 py-3 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
          title="End date"
        />
      </div>

      <div className="bg-white dark:bg-[#12262A] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#1E3A3F]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#DFEDE2]/50 dark:bg-[#1E3A3F]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Branch Flow</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Entries</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                  <td colSpan={COL_COUNT}><EmptyState type="transfers" message="No transfers found" /></td>
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
                        {group.operationalDate ? formatOperationalDate(group.operationalDate.split('T')[0]) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {group.sourceBranch?.name || '-'} → {group.dependentBranch?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {group.entries.length} Entries
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {Number(group.totalQuantity).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleGroupExpand(group.key); }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {isExpanded ? 'Hide' : 'View'}
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
                                  <th className="px-4 py-2 text-left">From</th>
                                  <th className="px-4 py-2 text-left">To</th>
                                  <th className="px-4 py-2 text-left">Qty</th>
                                  <th className="px-4 py-2 text-left">Sent</th>
                                  <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.entries.map(entry => (
                                  <tr key={entry.id} className="hover:bg-[#DFEDE2]/60 dark:hover:bg-[#1E3A3F]/60 transition-colors">
                                    <td className="px-4 py-2 text-xs text-gray-500">{entry.sourceBranch?.name || '-'}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500">{entry.dependentBranch?.name || '-'}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{Number(entry.receivedQuantity)}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">
                                      {entry.sentQuantity !== null ? Number(entry.sentQuantity) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        Edit
                                      </button>
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
            Page {currentPage} of {totalPages}
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

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Transfer">
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Product</label>
            <input
              type="text"
              value={getLocalizedName(editingTransfer?.product, i18n.language) || ''}
              disabled
              className="w-full px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl text-sm dark:text-white cursor-not-allowed opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Branch Flow</label>
            <input
              type="text"
              value={`${editingTransfer?.sourceBranch?.name || '-'} → ${editingTransfer?.dependentBranch?.name || '-'}`}
              disabled
              className="w-full px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl text-sm dark:text-white cursor-not-allowed opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Date</label>
            <input
              type="text"
              value={editingTransfer?.operationalDate ? formatOperationalDate(editingTransfer.operationalDate.split('T')[0]) : '-'}
              disabled
              className="w-full px-4 py-3 bg-[#DFEDE2] dark:bg-[#1E3A3F] border-0 rounded-xl text-sm dark:text-white cursor-not-allowed opacity-70"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-500 mb-2">Quantity</label>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutations.updateReceived.isPending}
              className="flex-1 px-6 py-3 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70"
            >
              {mutations.updateReceived.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
