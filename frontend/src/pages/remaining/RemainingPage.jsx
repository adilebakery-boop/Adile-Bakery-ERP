import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Save, Loader2, CheckCircle, Clock, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { getUser, getUserRole, getUserBranchId, getOperationalDate, formatOperationalDate, isManagerOrAdmin, canEditOperationalRecord } from '../../utils/authUtils';
import { getCategoriesForRole, CATEGORIES } from '../../utils/permissions';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import CloseReopenBar from '../../components/CloseReopenBar';
import { useClosureStatus } from '../../hooks/useClosureStatus';
import { useRemainingEntriesQuery } from '../../features/remaining/hooks/queries/useRemainingEntriesQuery';
import { useSaveRemainingMutation } from '../../features/remaining/hooks/mutations/useSaveRemainingMutation';
import { useFinalizeRemainingMutation } from '../../features/remaining/hooks/mutations/useFinalizeRemainingMutation';
import { reportService } from '../../services/reportService';

const CATEGORY_LABELS = {
  [CATEGORIES.BREAD_AND_SWEET_BREADS]: 'productCategories.BREAD_AND_SWEET_BREADS',
  [CATEGORIES.CREAM_CAKES]: 'productCategories.CREAM_CAKES',
  [CATEGORIES.SOFT_CAKES]: 'productCategories.SOFT_CAKES',
  [CATEGORIES.DRY_CAKES]: 'productCategories.DRY_CAKES',
  [CATEGORIES.COOKIES]: 'productCategories.COOKIES',
  [CATEGORIES.FETIRE_AND_SNACKS]: 'productCategories.FETIRE_AND_SNACKS',
  [CATEGORIES.DRINKS_AND_RETAIL_ITEMS]: 'productCategories.DRINKS_AND_RETAIL_ITEMS',
};

export default function RemainingPage() {
  const { t, i18n } = useTranslation();
  const getProductName = (product) => {
    const lang = i18n.language || localStorage.getItem('language') || 'en';
    return getLocalizedName(product, lang);
  };
  const [existingRemainings, setExistingRemainings] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [showAllProducts, setShowAllProducts] = useState(false);

  const user = getUser();
  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const allowedCategories = getCategoriesForRole(userRole);
  const todayAddis = getOperationalDate();
  const [selectedDate, setSelectedDate] = useState(todayAddis);
  const addisFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const [ty, tm, td] = todayAddis.split('-');
  const todayLocal = new Date(Date.UTC(parseInt(ty), parseInt(tm) - 1, parseInt(td)));
  const availableDates = [todayAddis];
  const dateLabels = { [todayAddis]: `${t('remaining.today')}` };
  for (let i = 1; i <= 2; i++) {
    const d = new Date(todayLocal);
    d.setUTCDate(d.getUTCDate() - i);
    const ds = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    availableDates.push(ds);
    dateLabels[ds] = formatOperationalDate(ds);
  }

  const canManageAll = isManagerOrAdmin();
  const effectiveBranchId = canManageAll ? selectedBranchId : userBranchId;
  const { data: closureStatus } = useClosureStatus(effectiveBranchId, selectedDate);
  const isClosed = closureStatus === 'CLOSED';

  const { data: productsResult, isLoading: isLoadingProducts } = useProductsQuery({ isActive: true, limit: 100 });
  const products = (productsResult?.data || []).filter(p => allowedCategories.includes(p.category));

  const { data: branches = [] } = useActiveBranchesQuery();

  const {
    data: remainingsData,
    isLoading: isLoadingRemainings,
    isError: remainingsError,
    error: remainingsErrorObj,
    refetch: refetchRemainings,
  } = useRemainingEntriesQuery(effectiveBranchId, selectedDate);

  const { data: flowData, isLoading: isLoadingFlow } = useQuery({
    queryKey: ['inventory-flow', effectiveBranchId, selectedDate],
    queryFn: async () => {
      if (!effectiveBranchId) return { products: [] };
      const result = await reportService.getInventoryFlowReport({
        branchId: effectiveBranchId,
        operationalDate: selectedDate,
      });
      if (!result.success) throw new Error(result.message || 'Failed to load inventory flow');
      return result.data || {};
    },
    enabled: !!effectiveBranchId && !!selectedDate,
    staleTime: 30 * 1000,
  });

  const flowProductsMap = useMemo(() => {
    const map = {};
    (flowData?.products || []).forEach(p => {
      map[p.product?.id] = p;
    });
    return map;
  }, [flowData]);

  useEffect(() => {
    if (!remainingsData) return;

    const map = {};
    remainingsData.forEach(r => {
      map[r.productId] = {
        ...r,
        remainingQuantity: r.quantity,
      };
    });
    setExistingRemainings(map);
  }, [remainingsData]);

  useEffect(() => {
    if (canManageAll && branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, canManageAll, selectedBranchId]);

  const hasActivity = useCallback((productId) => {
    const existing = existingRemainings[productId];
    if (existing !== undefined && Number(existing.remainingQuantity) > 0) return true;
    const flow = flowProductsMap[productId];
    if (!flow) return false;
    return (flow.openingStock || 0) > 0 ||
           (flow.dayProduction || 0) > 0 ||
           (flow.nightProduction || 0) > 0 ||
           (flow.receivedTransfer || 0) > 0 ||
           (flow.sentTransfer || 0) > 0;
  }, [existingRemainings, flowProductsMap]);

  const displayProducts = useMemo(() => {
    return showAllProducts
      ? products
      : products.filter(p => hasActivity(p.id));
  }, [showAllProducts, products, hasActivity]);

  const saveMutation = useSaveRemainingMutation();
  const finalizeMutation = useFinalizeRemainingMutation();

  const getProductUnitType = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.unitType || 'kg';
  };

  const handleQuantityChange = (productId, value) => {
    const unitType = getProductUnitType(productId);
    if (unitType === 'piece' && value !== '') {
      const qty = parseFloat(value);
      if (!Number.isInteger(qty)) {
        return;
      }
    }
    const existing = existingRemainings[productId];
    setExistingRemainings(prev => ({
      ...prev,
      [productId]: {
        ...existing,
        id: existing?.id || null,
        productId,
        remainingQuantity: value === '' ? null : parseFloat(value),
        status: 'DRAFT',
        _dirty: true,
      },
    }));
  };

  const getValue = (productId) => {
    const r = existingRemainings[productId];
    return r?.remainingQuantity ?? '';
  };

  const getStatus = (productId) => {
    const r = existingRemainings[productId];
    return r?.status || null;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    for (const r of Object.values(existingRemainings)) {
      if (r.remainingQuantity !== null && r.remainingQuantity !== undefined) {
        const unitType = getProductUnitType(r.productId);
        if (unitType === 'piece') {
          const qty = parseFloat(r.remainingQuantity);
          if (!Number.isInteger(qty)) {
            const product = products.find(p => p.id === r.productId);
            setError(`Quantity for "${product?.name}" must be a whole number (no decimals)`);
            return;
          }
        }
      }
    }

    const items = Object.values(existingRemainings)
      .filter(r => r.remainingQuantity !== null && r.remainingQuantity !== undefined)
      .map(r => ({
        productId: r.productId,
        remainingQuantity: r.remainingQuantity,
        status: r._dirty ? 'DRAFT' : r.status,
      }));

    if (items.length === 0) {
      setError(t('remaining.enterAtLeastOne'));
      return;
    }

    if (!effectiveBranchId) {
      setError('Please select a branch');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        branchId: effectiveBranchId,
        operationalDate: selectedDate,
        items,
      });
      setSuccess(t('remaining.remainingSaved'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || t('common.saveFailed'));
    }
  };

  const handleFinalize = async () => {
    setError('');
    setSuccess('');

    const activeProductIds = new Set(products.map(p => p.id));

    const items = Object.values(existingRemainings)
      .filter(r => r.remainingQuantity !== null && r.remainingQuantity !== undefined && activeProductIds.has(r.productId))
      .map(r => ({
        productId: r.productId,
        remainingQuantity: r.remainingQuantity,
      }));

    const skippedCount = Object.values(existingRemainings).filter(
      r => r.remainingQuantity !== null && r.remainingQuantity !== undefined && !activeProductIds.has(r.productId)
    ).length;

    if (items.length === 0) {
      setError(skippedCount > 0 ? t('remaining.allSkippedInactive') : t('remaining.enterAtLeastOneBeforeFinalize'));
      return;
    }

    if (!effectiveBranchId) {
      setError('Please select a branch');
      return;
    }

    try {
      await finalizeMutation.mutateAsync({
        branchId: effectiveBranchId,
        operationalDate: selectedDate,
        items,
      });
      // Optimistically update local state to FINAL before cache refetch completes.
      // This eliminates the gap where the Finalize button still shows after
      // the server confirms finalization but before the query refetches.
      setExistingRemainings(prev => {
        const updated = {};
        for (const [key, val] of Object.entries(prev)) {
          updated[key] = { ...val, status: 'FINAL', _dirty: false };
        }
        return updated;
      });
      const msg = skippedCount > 0
        ? `${t('remaining.allFinalized')} (${skippedCount} ${t('remaining.skippedInactive')})`
        : t('remaining.allFinalized');
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || t('common.saveFailed'));
    }
  };

  const grouped = useMemo(() => {
    return displayProducts.reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});
  }, [displayProducts]);

  const hasUnsavedChanges = Object.values(existingRemainings).some(r => r._dirty === true);
  const hasUnfinalizedChanges = Object.values(existingRemainings).some(r => r._dirty === true || r.status === 'DRAFT');

  const isSaving = saveMutation.isPending || finalizeMutation.isPending;

  if (!effectiveBranchId) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">{t('remaining.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{formatOperationalDate(selectedDate)}</p>
          </div>
        </div>
        {canManageAll && branches.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#024A5B]" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Building2 className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-gray-500 text-sm">{t('remaining.selectBranch')}</p>
          </div>
        )}
      </div>
    );
  }

  const isEditable = canEditOperationalRecord(selectedDate, userRole) && !isClosed;

  const branchSelect = canManageAll ? (
    <select
      value={selectedBranchId || ''}
      onChange={(e) => setSelectedBranchId(parseInt(e.target.value))}
      className="flex-1 px-4 py-3 bg-white dark:bg-[#12262A] border border-[#E5E1D8] dark:border-[#1E3A3F] rounded-xl focus:ring-2 focus:ring-[#024A5B] focus:border-transparent outline-none text-sm dark:text-white"
    >
      <option value="">{t('common.selectBranch')}</option>
      {branches.map(branch => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  ) : (
    <span className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-1">
      <Building2 className="w-4 h-4 shrink-0" />
      {t('remaining.branch')}: {user?.branch ? getLocalizedName(user.branch, i18n.language) : userBranchId || 'N/A'}
    </span>
  );

  const dateSelect = (
    <select
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      className="flex-1 px-4 py-3 bg-white dark:bg-[#12262A] border border-[#E5E1D8] dark:border-[#1E3A3F] rounded-xl focus:ring-2 focus:ring-[#024A5B] focus:border-transparent outline-none text-sm dark:text-white"
    >
      {availableDates.map(d => (
        <option key={d} value={d}>{dateLabels[d]}</option>
      ))}
    </select>
  );

  const unsavedBadge = hasUnsavedChanges && (
    <span className="text-sm text-amber-500 flex items-center gap-1">
      <AlertCircle className="w-4 h-4" />
      {t('remaining.unsavedChanges')}
    </span>
  );

  const refreshButton = (
    <button
      onClick={() => refetchRemainings()}
      className="p-2 hover:bg-[#DFEDE2] rounded-xl transition-colors"
      title={t('common.refresh')}
    >
      <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-500" />
    </button>
  );

  const toggleSwitch = (
    <label className="flex items-center cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={showAllProducts}
        aria-label={t('ui.showAllProducts')}
        onClick={() => setShowAllProducts(v => !v)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showAllProducts ? 'bg-[#4CB094]' : 'bg-gray-300 dark:bg-[#1E3A3F]'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllProducts ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </label>
  );

  return (
    <div className="pb-28">
      {/*
        Mobile layout (default, hidden on lg+):
          Row 1: Title
          Row 2: Branch + date dropdowns
          Row 3: "18 Jun 2026" (left) + toggle + refresh (right)
        Desktop layout (lg+):
          Single row: Title + date (left) | filters + actions (right)
      */}
      <div className="lg:hidden mb-8">
        <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">{t('remaining.title')}</h1>
        <div className="flex gap-3 mt-4">
          {branchSelect}
          {dateSelect}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500 dark:text-gray-500">{formatOperationalDate(selectedDate)}</span>
          <div className="flex items-center gap-2">
            {unsavedBadge}
            {toggleSwitch}
            {refreshButton}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#024A5B] dark:text-white">{t('remaining.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{formatOperationalDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          {branchSelect}
          {dateSelect}
          {unsavedBadge}
          {toggleSwitch}
          {refreshButton}
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <CloseReopenBar
        branchId={effectiveBranchId}
        operationalDate={selectedDate}
      />

      {isLoadingProducts || isLoadingRemainings || isLoadingFlow ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#024A5B]" />
        </div>
      ) : remainingsError ? (
        <ApiErrorState error={remainingsErrorObj} onRetry={() => refetchRemainings()} />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-[#DFEDE2] dark:bg-[#1E3A3F] rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-gray-500 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-500 text-sm">{t('remaining.noProductsAvailable')}</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, prods]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-[#024A5B] dark:text-white mb-4">
              {t(CATEGORY_LABELS[category] || category)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {prods.map((p) => {
                const status = getStatus(p.id);
                return (
                  <div
                    key={p.id}
                    className={`relative bg-white dark:bg-[#12262A] p-5 rounded-[24px] border transition-all ${
                      status === 'FINAL'
                        ? 'border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
                        : status === 'DRAFT'
                        ? 'border-amber-200 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-900/10'
                        : 'border-[#E5E1D8] dark:border-[#1E3A3F]'
                    }`}
                    style={{ boxShadow: '0 4px 20px -2px rgba(0, 31, 63, 0.05)' }}
                  >
                    {status && (
                      <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        status === 'FINAL' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400'
                      }`}>
                        {status === 'FINAL' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {status}
                      </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-3 font-medium">{getProductName(p)}</p>
                    <input
                      type="number"
                      value={getValue(p.id)}
                      onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                      className="w-full px-4 py-4 bg-[#DFEDE2] dark:bg-[#1a1410] border-0 rounded-xl focus:ring-2 focus:ring-[#024A5B] outline-none text-3xl font-bold text-center text-[#024A5B] dark:text-white"
                      placeholder="0"
                      min="0"
                      step={p.unitType === 'piece' ? '1' : '0.01'}
                      disabled={!isEditable || isSaving}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#12262A] border-t border-[#E5E1D8] dark:border-[#1E3A3F] p-4 lg:left-72 z-10">
        <div className="max-w-7xl mx-auto flex justify-end gap-3">
          {hasUnfinalizedChanges && isEditable && (
            <button
              onClick={handleFinalize}
              disabled={isSaving}
              className="px-8 py-3.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {t('remaining.finalizeAll')}
            </button>
          )}
          {isEditable && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3.5 bg-[#4CB094] text-[#002830] rounded-xl font-medium hover:bg-[#236B56] transition-colors text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('remaining.saveRemaining')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
