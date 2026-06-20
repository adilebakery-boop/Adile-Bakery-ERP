import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, Search, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';
import Modal from '../../components/Modal';
import { getUserRole, getUserBranchId, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { TableSkeleton } from '../../components/skeletons';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useTransfersQuery } from '../../features/transfers/hooks/queries/useTransfersQuery';
import { useTransferMutations } from '../../features/transfers/hooks/mutations/useTransferMutations';

const STATUS_BADGES = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Closed' },
};

export default function TransfersPage() {
  const { t, i18n } = useTranslation();
  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const canManageAll = isManagerOrAdmin();
  const isTransferOperator = userRole === 'TRANSFER_OPERATOR';

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDisputed, setFilterDisputed] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ productId: '', dependentBranchId: '', receivedQuantity: '', operationalDate: new Date().toISOString().split('T')[0] });
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningTransfer, setReturningTransfer] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const branchFilter = canManageAll || isTransferOperator ? {} : { dependentBranchId: userBranchId };
  const { data: transfersData, isLoading, isError, error: fetchError, refetch } = useTransfersQuery({
    ...branchFilter,
    status: filterStatus || undefined,
    isDisputed: filterDisputed || undefined,
    limit: 10000,
  });

  const { data: productsResult } = useProductsQuery({ isActive: true, limit: 100 });
  const products = productsResult?.data || [];

  const { data: branches = [] } = useActiveBranchesQuery();
  const dependentBranches = useMemo(() =>
    branches.filter(b => b.branchType === 'DEPENDENT'),
    [branches]
  );
  const sourceBranches = useMemo(() =>
    branches.filter(b => b.branchType === 'SOURCE' || !b.branchType),
    [branches]
  );

  const allTransfers = useMemo(() => {
    const list = transfersData || [];
    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(t => {
      const name = getLocalizedName(t.product, i18n.language) || t.product?.name || '';
      return name.toLowerCase().includes(q);
    });
  }, [transfersData, searchTerm, i18n.language]);

  const totalPages = Math.ceil(allTransfers.length / itemsPerPage);
  const displayTransfers = allTransfers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const mutations = useTransferMutations();

  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterDisputed, searchTerm]);
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearMessages = () => { setActionError(''); setActionSuccess(''); };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      await mutations.createTransfer.mutateAsync(addForm);
      setIsAddModalOpen(false);
      setAddForm({ productId: '', dependentBranchId: '', receivedQuantity: '', operationalDate: new Date().toISOString().split('T')[0] });
      setActionSuccess('Transfer created successfully');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!returningTransfer) return;
    if (Number(returnQuantity) > Number(returningTransfer.receivedQuantity) - Number(returningTransfer.returnedQuantity)) {
      setActionError('Return quantity exceeds available received quantity');
      return;
    }
    try {
      await mutations.returnProducts.mutateAsync({ id: returningTransfer.id, data: { returnedQuantity: Number(returnQuantity) } });
      setIsReturnModalOpen(false);
      setReturningTransfer(null);
      setReturnQuantity('');
      setActionSuccess('Return recorded successfully');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleResolve = async (transfer, field) => {
    clearMessages();
    const val = prompt(`Enter new ${field} quantity:`, transfer[field]);
    if (!val || isNaN(val)) return;
    try {
      await mutations.resolveDispute.mutateAsync({ id: transfer.id, data: { [field]: Number(val), isDisputed: false } });
      setActionSuccess('Dispute resolved');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleEditSent = async (transfer) => {
    clearMessages();
    const val = prompt('Enter sent quantity:', transfer.sentQuantity || '');
    if (!val || isNaN(val)) return;
    try {
      await mutations.updateSent.mutateAsync({ id: transfer.id, data: { sentQuantity: Number(val) } });
      setActionSuccess('Sent quantity updated');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const canEditSent = (transfer) => {
    if (canManageAll) return true;
    return String(userBranchId) === String(transfer.sourceBranchId);
  };

  const canEditReceived = (transfer) => {
    if (canManageAll) return true;
    return String(userBranchId) === String(transfer.dependentBranchId);
  };

  const canReturn = (transfer) => {
    if (transfer.status !== 'APPROVED') return false;
    if (canManageAll) return true;
    return String(userBranchId) === String(transfer.dependentBranchId);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-8">
        <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">Transfers</h1>
        <div className="flex flex-row flex-wrap gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Transfer
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{actionSuccess}</div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{actionError}</div>
      )}

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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-[#DFEDE2] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-sm"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={filterDisputed}
            onChange={(e) => setFilterDisputed(e.target.checked)}
            className="rounded"
          />
          Disputed only
        </label>
      </div>

      <div className="bg-white dark:bg-[#12262A] rounded-[24px] overflow-hidden border border-[#E5E1D8] dark:border-[#1E3A3F]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#DFEDE2]/50 dark:bg-[#1E3A3F]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">From</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">To</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Received</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Returned</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] dark:divide-[#1E3A3F]">
              {isLoading ? (
                <tr>
                  <td colSpan={9}><TableSkeleton rows={8} columns={9} /></td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9}><ApiErrorState error={fetchError} onRetry={refetch} /></td>
                </tr>
              ) : displayTransfers.length === 0 ? (
                <tr>
                  <td colSpan={9}><EmptyState type="transfers" message="No transfers found" /></td>
                </tr>
              ) : (
                displayTransfers.map((transfer) => {
                  const badge = STATUS_BADGES[transfer.status] || STATUS_BADGES.PENDING;
                  return (
                    <tr key={transfer.id} className="hover:bg-[#DFEDE2]/50 dark:hover:bg-[#1E3A3F]/50">
                      <td className="px-6 py-4 text-sm font-semibold text-[#024A5B] dark:text-white">
                        {getLocalizedName(transfer.product, i18n.language)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{transfer.sourceBranch?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{transfer.dependentBranch?.name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{Number(transfer.receivedQuantity)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {transfer.sentQuantity !== null ? Number(transfer.sentQuantity) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {Number(transfer.returnedQuantity) > 0 ? Number(transfer.returnedQuantity) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                          {transfer.isDisputed && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Disputed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {transfer.operationalDate ? formatOperationalDate(transfer.operationalDate.split('T')[0]) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {transfer.status === 'PENDING' && canEditSent(transfer) && (
                            <button
                              onClick={() => handleEditSent(transfer)}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                            >
                              Enter Sent
                            </button>
                          )}
                          {transfer.isDisputed && (canManageAll || isTransferOperator) && (
                            <>
                              <button
                                onClick={() => handleResolve(transfer, 'receivedQuantity')}
                                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
                              >
                                Fix Received
                              </button>
                              <button
                                onClick={() => handleResolve(transfer, 'sentQuantity')}
                                className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
                              >
                                Fix Sent
                              </button>
                            </>
                          )}
                          {canReturn(transfer) && (
                            <button
                              onClick={() => { setReturningTransfer(transfer); setReturnQuantity(''); setIsReturnModalOpen(true); }}
                              className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200 transition-colors"
                            >
                              Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Transfer">
        <form onSubmit={handleCreateTransfer} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Product</label>
            <select
              value={addForm.productId}
              onChange={(e) => setAddForm({ ...addForm, productId: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl outline-none text-sm"
              required
            >
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{getLocalizedName(p, i18n.language)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Dependent Branch</label>
            <select
              value={addForm.dependentBranchId}
              onChange={(e) => setAddForm({ ...addForm, dependentBranchId: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl outline-none text-sm"
              required
            >
              <option value="">Select branch</option>
              {dependentBranches.map(b => (
                <option key={b.id} value={b.id}>{getLocalizedName(b, i18n.language)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Received Quantity</label>
            <input
              type="number"
              step="any"
              min="0"
              value={addForm.receivedQuantity}
              onChange={(e) => setAddForm({ ...addForm, receivedQuantity: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Date</label>
            <input
              type="date"
              value={addForm.operationalDate}
              onChange={(e) => setAddForm({ ...addForm, operationalDate: e.target.value })}
              className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl outline-none text-sm"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsAddModalOpen(false)}
              className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#DFEDE2] transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={mutations.createTransfer.isPending}
              className="flex-1 px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70">
              {mutations.createTransfer.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Return Products">
        {returningTransfer && (
          <form onSubmit={handleReturn} className="space-y-5">
            <p className="text-sm text-gray-600">
              Product: <strong>{getLocalizedName(returningTransfer.product, i18n.language)}</strong><br />
              Received: <strong>{Number(returningTransfer.receivedQuantity)}</strong><br />
              Already returned: <strong>{Number(returningTransfer.returnedQuantity)}</strong><br />
              Available to return: <strong>{Number(returningTransfer.receivedQuantity) - Number(returningTransfer.returnedQuantity)}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Return Quantity</label>
              <input
                type="number"
                step="any"
                min="0"
                max={Number(returningTransfer.receivedQuantity) - Number(returningTransfer.returnedQuantity)}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#DFEDE2] border-0 rounded-xl outline-none text-sm"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsReturnModalOpen(false)}
                className="flex-1 px-6 py-3.5 border border-[#E5E1D8] text-gray-600 rounded-xl font-medium hover:bg-[#DFEDE2] transition-colors text-sm">
                Cancel
              </button>
              <button type="submit" disabled={mutations.returnProducts.isPending}
                className="flex-1 px-6 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm disabled:opacity-70">
                {mutations.returnProducts.isPending ? 'Processing...' : 'Return'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
