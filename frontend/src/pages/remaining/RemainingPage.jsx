import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2, CheckCircle, Clock, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { getUserRole, getUserBranchId, getOperationalDate, formatOperationalDate, isManagerOrAdmin } from '../../utils/authUtils';
import { getCategoriesForRole, CATEGORIES } from '../../utils/permissions';
import { getLocalizedName } from '../../utils/getLocalizedName';
import { ApiErrorState, EmptyState } from '../../components/ui';
import { useProductsQuery } from '../../features/products/hooks/queries/useProductsQuery';
import { useActiveBranchesQuery } from '../../features/branches/hooks/queries/useBranchesQuery';
import { useRemainingEntriesQuery } from '../../features/remaining/hooks/queries/useRemainingEntriesQuery';
import { useSaveRemainingMutation } from '../../features/remaining/hooks/mutations/useSaveRemainingMutation';
import { useFinalizeRemainingMutation } from '../../features/remaining/hooks/mutations/useFinalizeRemainingMutation';

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

  const userRole = getUserRole();
  const userBranchId = getUserBranchId();
  const allowedCategories = getCategoriesForRole(userRole);
  const operationalDate = getOperationalDate();
  const canManageAll = isManagerOrAdmin();
  const effectiveBranchId = canManageAll ? selectedBranchId : userBranchId;

  const { data: productsResult, isLoading: isLoadingProducts } = useProductsQuery({ isActive: true, limit: 100 });
  const products = (productsResult?.data || []).filter(p => allowedCategories.includes(p.category));

  const { data: branches = [] } = useActiveBranchesQuery();

  const {
    data: remainingsData,
    isLoading: isLoadingRemainings,
    isError: remainingsError,
    error: remainingsErrorObj,
    refetch: refetchRemainings,
  } = useRemainingEntriesQuery(effectiveBranchId, operationalDate);

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
        operationalDate,
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
        operationalDate,
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

  const grouped = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const hasUnsavedChanges = Object.values(existingRemainings).some(r => r._dirty === true);
  const hasUnfinalizedChanges = Object.values(existingRemainings).some(r => r._dirty === true || r.status === 'DRAFT');

  const isSaving = saveMutation.isPending || finalizeMutation.isPending;

  if (!effectiveBranchId) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('remaining.title')}</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{formatOperationalDate(operationalDate)}</p>
          </div>
        </div>
        {canManageAll && branches.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#D2B48C]" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Building2 className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-400 text-sm">{t('remaining.selectBranch')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-bold text-[#001F3F] dark:text-white">{t('remaining.title')}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{formatOperationalDate(operationalDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageAll && (
            <div className="flex items-center gap-2 bg-[#F9F7F2] dark:bg-[#0f0f1a] px-3 py-2 rounded-xl border border-[#E5E1D8] dark:border-[#2d2d4a]">
              <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <select
                value={selectedBranchId || ''}
                onChange={(e) => setSelectedBranchId(parseInt(e.target.value))}
                className="bg-transparent border-none outline-none text-sm font-medium text-[#001F3F] dark:text-white cursor-pointer"
              >
                <option value="">{t('common.selectBranch')}</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!canManageAll && (
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {t('remaining.branch')}: {userBranchId || 'N/A'}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {t('remaining.unsavedChanges')}
            </span>
          )}
          <button
            onClick={() => refetchRemainings()}
            className="p-2 hover:bg-[#F9F7F2] rounded-xl transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
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

      {isLoadingProducts || isLoadingRemainings ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#D2B48C]" />
        </div>
      ) : remainingsError ? (
        <ApiErrorState error={remainingsErrorObj} onRetry={() => refetchRemainings()} />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-[#F9F7F2] dark:bg-[#2d2d4a] rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-400 dark:text-gray-500 text-sm">{t('remaining.noProductsAvailable')}</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, prods]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold text-[#001F3F] dark:text-white mb-4">
              {t(CATEGORY_LABELS[category] || category)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {prods.map((p) => {
                const status = getStatus(p.id);
                return (
                  <div
                    key={p.id}
                    className={`relative bg-white dark:bg-[#1a1a2e] p-5 rounded-[24px] border transition-all ${
                      status === 'FINAL'
                        ? 'border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
                        : status === 'DRAFT'
                        ? 'border-amber-200 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-900/10'
                        : 'border-[#E5E1D8] dark:border-[#2d2d4a]'
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">{getProductName(p)}</p>
                    <input
                      type="number"
                      value={getValue(p.id)}
                      onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                      className="w-full px-4 py-4 bg-[#F9F7F2] dark:bg-[#0f0f1a] border-0 rounded-xl focus:ring-2 focus:ring-[#001F3F] outline-none text-3xl font-bold text-center text-[#001F3F] dark:text-white"
                      placeholder="0"
                      min="0"
                      step={p.unitType === 'piece' ? '1' : '0.01'}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a2e] border-t border-[#E5E1D8] dark:border-[#2d2d4a] p-4 lg:left-72 z-10">
        <div className="max-w-7xl mx-auto flex justify-end gap-3">
          {hasUnfinalizedChanges && (
            <button
              onClick={handleFinalize}
              disabled={isSaving}
              className="px-8 py-3.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {t('remaining.finalizeAll')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3.5 bg-[#D2B48C] text-white rounded-xl font-medium hover:bg-[#c1a278] transition-colors text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('remaining.saveRemaining')}
          </button>
        </div>
      </div>
    </div>
  );
}
