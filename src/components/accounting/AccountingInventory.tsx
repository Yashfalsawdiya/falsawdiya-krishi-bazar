import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Search, Plus, Edit3, Trash2, 
  RefreshCw, DollarSign, Layers, X, CheckCircle2,
  Boxes, ChevronDown, ChevronUp, Percent, Tag, Share2,
  History, AlertTriangle, AlertCircle, ShieldCheck, Loader2, RotateCcw,
  Settings2, CalendarClock, ShieldAlert
} from 'lucide-react';
import { 
  AccountingProduct, 
  PackagingVariant, 
  PackagingType, 
  SizeUnit,
  StockBatch,
  StockManagementConfig,
  StockMovementLog
} from '../../types/accounting';
import { 
  fetchAccountingProducts, 
  saveAccountingProduct, 
  deleteAccountingProduct,
  fetchStockManagementConfig,
  saveStockManagementConfig,
  getCachedStockManagementConfig,
  recordProductStockMovementsBatch,
  resetAllProductStockToZero
} from '../../services/accountingService';
import { 
  normalizeToBaseUnit, 
  getProductVariants,
  formatBaseUnitDisplay
} from '../../utils/agriPackagingUtils';
import {
  calculateProductHealthSummary,
  calculateVariantStockSummary,
  formatBatchDateDisplay,
  formatBatchDateHindiDisplay,
  getBatchAlert,
  getBatchesForVariant,
  parseMfgOrExpiryInput,
  sanitizeBatchForFirestore,
  syncProductVariantsWithBatches,
} from '../../utils/batchInventoryUtils';
import { 
  ProductBasicInfoFields, 
  ACCOUNTING_PRODUCT_CATEGORIES 
} from './ProductBasicInfoFields';
import { StockExportModal } from './StockExportModal';
import { StockMovementHistoryModal } from './StockMovementHistoryModal';

interface FormBatchDraft {
  id: string;
  batchNumber: string;
  mfgInput: string;
  expiryInput: string;
  quantity: number;
  purchasePricePerPack: string;
  createdAt: number;
  initialPackQuantity?: number;
  status?: StockBatch['status'];
  dismissedWarnings?: string[];
  isExisting?: boolean;
}

export const AccountingInventory: React.FC = () => {
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilterMode, setStockFilterMode] = useState<
    'all' | 'low_out' | 'near_expiry' | 'expired'
  >('all');
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Master Stock Quantity Management Toggle State
  const [stockConfig, setStockConfig] = useState<StockManagementConfig>(() =>
    getCachedStockManagementConfig()
  );
  const [showToggleConfirmModal, setShowToggleConfirmModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<{
    defaultLowStockThreshold: number;
    expiryWarningDays: number;
    allowNegativeStock: boolean;
    autoOpenPackOnLooseSale: boolean;
    blockExpiredSale: boolean;
  }>({
    defaultLowStockThreshold: 10,
    expiryWarningDays: 122,
    allowNegativeStock: false,
    autoOpenPackOnLooseSale: true,
    blockExpiredSale: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [pendingToggleTarget, setPendingToggleTarget] = useState<boolean>(false);
  const [isUpdatingToggle, setIsUpdatingToggle] = useState(false);
  const [statusToast, setStatusToast] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AccountingProduct | null>(null);
  const [historyModalTarget, setHistoryModalTarget] = useState<{
    productId?: string;
    productName?: string;
  } | null>(null);
  
  // Product Form State
  const [formHindiName, setFormHindiName] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('pesticides');
  const [formProductType, setFormProductType] = useState<'liquid' | 'powder_granule' | 'other'>('liquid');
  const [formHsnCode, setFormHsnCode] = useState('');
  const [formDosePerTank, setFormDosePerTank] = useState<number | ''>('');
  const [formDoseUnit, setFormDoseUnit] = useState<'ml' | 'g'>('ml');
  const [formDosePerBigha, setFormDosePerBigha] = useState<number | ''>('');
  const [formDoseBighaUnit, setFormDoseBighaUnit] = useState<string>('kg');
  const [formDoseWarning, setFormDoseWarning] = useState('');

  // Variants & Inline Batch Drafts in Form
  const [formVariants, setFormVariants] = useState<PackagingVariant[]>([]);
  const [formVariantBatches, setFormVariantBatches] = useState<Record<string, FormBatchDraft[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [data, cfg] = await Promise.all([
        fetchAccountingProducts(),
        fetchStockManagementConfig(),
      ]);
      setProducts(data);
      setStockConfig(cfg);
    } catch (err) {
      console.error('Error loading products master:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const toggleProductExpand = (id: string) => {
    setExpandedProductIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const defaultLowThreshold = stockConfig.defaultLowStockThreshold ?? 10;
  const expiryWarningDays = stockConfig.expiryWarningDays ?? 122;

  // Resolved Variants + Batch Inventory Health for all products
  const enrichedProducts = useMemo(() => {
    return products.map(p => {
      const variants = getProductVariants(p);
      const health = calculateProductHealthSummary(p, defaultLowThreshold, expiryWarningDays);
      return {
        ...p,
        resolvedVariants: variants,
        health,
        totalPacks: health.saleablePacks,
        hasOutOfStock: health.hasOutOfStockVariant,
        hasLowStock: health.hasLowStockVariant,
      };
    });
  }, [products, defaultLowThreshold, expiryWarningDays]);

  const legacyNonZeroStockCount = useMemo(() => {
    return enrichedProducts.filter(
      p => p.totalPacks > 0 || (p.looseStock?.availableBaseQty || 0) > 0
    ).length;
  }, [enrichedProducts]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return enrichedProducts.filter(p => {
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      let matchesStockFilter = true;
      if (stockConfig.enabled) {
        if (stockFilterMode === 'low_out') {
          matchesStockFilter = p.hasLowStock || p.hasOutOfStock;
        } else if (stockFilterMode === 'near_expiry') {
          matchesStockFilter = p.health.nearExpiryBatchesCount > 0;
        } else if (stockFilterMode === 'expired') {
          matchesStockFilter = p.health.expiredBatchesCount > 0;
        }
      }
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        p.hindiName?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        (p.customId && p.customId.toLowerCase().includes(q)) ||
        (p.hsnCode && p.hsnCode.toLowerCase().includes(q)) ||
        (Array.isArray(p.batches) &&
          p.batches.some(b => (b.batchNumber || '').toLowerCase().includes(q)))
      );

      return matchesCat && matchesStockFilter && matchesSearch;
    });
  }, [enrichedProducts, categoryFilter, searchQuery, stockConfig.enabled, stockFilterMode]);

  // Summary Metrics: Total Products, Categories breakdown, Average Margin & Batch/Expiry Health
  const metrics = useMemo(() => {
    const totalItems = products.length;
    let pesticidesCount = 0;
    let fertilizersCount = 0;
    let seedsCount = 0;
    let otherCount = 0;
    let totalMarginPercentSum = 0;
    let variantCount = 0;
    let totalSealedPacks = 0;
    let lowOrOutVariantsCount = 0;
    let totalStockCostValue = 0;
    let totalActiveBatches = 0;
    let nearExpiryBatchesCount = 0;
    let expiredBatchesCount = 0;
    let expiredPacksCount = 0;

    enrichedProducts.forEach(p => {
      if (p.category === 'pesticides') pesticidesCount++;
      else if (p.category === 'fertilizers') fertilizersCount++;
      else if (p.category === 'seeds') seedsCount++;
      else otherCount++;

      p.resolvedVariants.forEach(v => {
        if (v.sellingPrice > 0 && v.costPrice > 0) {
          const margin = ((v.sellingPrice - v.costPrice) / v.sellingPrice) * 100;
          totalMarginPercentSum += Math.max(0, margin);
          variantCount++;
        }
      });

      totalSealedPacks += p.health.saleablePacks;
      totalStockCostValue += p.health.totalValuation;
      totalActiveBatches += p.health.activeBatchesCount;
      nearExpiryBatchesCount += p.health.nearExpiryBatchesCount;
      expiredBatchesCount += p.health.expiredBatchesCount;
      expiredPacksCount += p.health.expiredPacks;

      p.health.variantSummaries.forEach(vs => {
        if (vs.isLowStock || vs.isOutOfStock) {
          lowOrOutVariantsCount++;
        }
      });
    });

    const avgMarginPercent = variantCount > 0 ? Math.round(totalMarginPercentSum / variantCount) : 0;

    return { 
      totalItems, 
      pesticidesCount,
      fertilizersCount,
      seedsCount,
      otherCount,
      avgMarginPercent,
      totalSealedPacks,
      lowOrOutVariantsCount,
      totalStockCostValue: Math.round(totalStockCostValue),
      totalActiveBatches,
      nearExpiryBatchesCount,
      expiredBatchesCount,
      expiredPacksCount,
    };
  }, [products, enrichedProducts]);

  const openSettingsModal = () => {
    setSettingsDraft({
      defaultLowStockThreshold: stockConfig.defaultLowStockThreshold ?? 10,
      expiryWarningDays: stockConfig.expiryWarningDays ?? 122,
      allowNegativeStock: Boolean(stockConfig.allowNegativeStock),
      autoOpenPackOnLooseSale: stockConfig.autoOpenPackOnLooseSale ?? true,
      blockExpiredSale: stockConfig.blockExpiredSale ?? true,
    });
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const saved = await saveStockManagementConfig({
        defaultLowStockThreshold: Math.max(0, Number(settingsDraft.defaultLowStockThreshold) || 0),
        expiryWarningDays: Math.max(15, Number(settingsDraft.expiryWarningDays) || 122),
        allowNegativeStock: settingsDraft.allowNegativeStock,
        autoOpenPackOnLooseSale: settingsDraft.autoOpenPackOnLooseSale,
        blockExpiredSale: settingsDraft.blockExpiredSale,
      });
      setStockConfig(saved);
      setShowSettingsModal(false);
      setStatusToast({
        type: 'success',
        text: 'स्टॉक व एक्सपायरी अलर्ट सेटिंग्स सुरक्षित कर दी गई हैं।',
      });
    } catch (err: any) {
      setStatusToast({
        type: 'error',
        text: err?.message || 'सेटिंग्स सुरक्षित करने में त्रुटि हुई।',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestToggle = (nextEnabled: boolean) => {
    setPendingToggleTarget(nextEnabled);
    setShowToggleConfirmModal(true);
  };

  const handleConfirmToggle = async (resetLegacyToZero = false) => {
    setIsUpdatingToggle(true);
    setStatusToast(null);
    try {
      if (resetLegacyToZero && pendingToggleTarget) {
        await resetAllProductStockToZero();
      }
      const saved = await saveStockManagementConfig({ enabled: pendingToggleTarget });
      setStockConfig(saved);
      setShowToggleConfirmModal(false);
      await loadProducts();
      setStatusToast({
        type: 'success',
        text: pendingToggleTarget
          ? resetLegacyToZero
            ? 'सभी पुराना स्टॉक 0 रीसेट करके स्टॉक मात्रा प्रबंधन चालू (ON) कर दिया गया है।'
            : 'स्टॉक मात्रा प्रबंधन चालू (ON) कर दिया गया है। अब POS बिक्री पर स्टॉक अपने-आप घटेगा।'
          : 'स्टॉक मात्रा प्रबंधन बंद (OFF) कर दिया गया है। सभी उत्पाद असीमित स्टॉक मोड में हैं।',
      });
    } catch (err: unknown) {
      setStatusToast({
        type: 'error',
        text:
          err instanceof Error ? err.message : 'सेटिंग अपडेट करने में त्रुटि हुई।',
      });
    } finally {
      setIsUpdatingToggle(false);
    }
  };

  const createEmptyBatchDraft = (): FormBatchDraft => ({
    id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    batchNumber: '',
    mfgInput: '',
    expiryInput: '',
    quantity: 0,
    purchasePricePerPack: '',
    createdAt: Date.now(),
    isExisting: false,
  });

  // Initialize Edit Modal
  const openEditModal = (p: AccountingProduct) => {
    setFormError(null);
    setEditingProduct(p);
    setFormHindiName(p.hindiName);
    setFormName(p.name);
    setFormCategory(p.category || 'pesticides');
    setFormHsnCode(p.hsnCode || '');

    const isLiquid = p.unit === 'Ltr' || p.unit === 'Ml' || p.productType === 'liquid';
    const isPowder = p.unit === 'Kg' || p.unit === 'Gram' || p.productType === 'powder_granule';
    setFormProductType(isLiquid ? 'liquid' : isPowder ? 'powder_granule' : 'other');

    if (p.standardDoseInfo) {
      setFormDosePerTank(p.standardDoseInfo.verifiedDosePer20LTank || '');
      setFormDoseUnit(p.standardDoseInfo.doseUnit || (isLiquid ? 'ml' : 'g'));
      setFormDosePerBigha(p.standardDoseInfo.verifiedDosePerBigha || '');
      setFormDoseBighaUnit(
        p.standardDoseInfo.doseBighaUnit ||
        (isLiquid ? 'ml' : (p.category === 'fertilizers' ? 'kg' : 'g'))
      );
      setFormDoseWarning(p.standardDoseInfo.warningNote || '');
    } else {
      setFormDosePerTank('');
      setFormDoseUnit(isLiquid ? 'ml' : 'g');
      setFormDosePerBigha('');
      setFormDoseBighaUnit(isLiquid ? 'ml' : (p.category === 'fertilizers' ? 'kg' : 'g'));
      setFormDoseWarning('');
    }

    const variants = getProductVariants(p);
    setFormVariants(variants.map(v => ({ ...v })));

    const initialBatchesMap: Record<string, FormBatchDraft[]> = {};
    variants.forEach(v => {
      const vBatches = getBatchesForVariant(p, v, variants).filter(
        b => b.status !== 'expired_written_off' && (b.remainingPackQuantity || 0) > 0
      );
      const summary = calculateVariantStockSummary(p, v, defaultLowThreshold, expiryWarningDays);
      const drafts: FormBatchDraft[] = vBatches.map(b => ({
        id: b.id,
        batchNumber: b.batchNumber || '',
        mfgInput: b.mfgDisplay || (b.manufacturingDate ? formatBatchDateDisplay(b.manufacturingDate) : ''),
        expiryInput: b.expiryDisplay || (b.expiryDate ? formatBatchDateDisplay(b.expiryDate) : ''),
        quantity: Math.max(0, Number(b.remainingPackQuantity) || 0),
        purchasePricePerPack:
          b.purchasePricePerPack !== undefined &&
          b.purchasePricePerPack !== null &&
          Number(b.purchasePricePerPack) !== Number(v.costPrice)
            ? String(b.purchasePricePerPack)
            : '',
        createdAt: b.createdAt || Date.now(),
        initialPackQuantity: b.initialPackQuantity,
        status: b.status,
        dismissedWarnings: b.dismissedWarnings,
        isExisting: true,
      }));

      if (summary.unbatchedPacks > 0) {
        drafts.push({
          ...createEmptyBatchDraft(),
          quantity: summary.unbatchedPacks,
        });
      }

      if (drafts.length === 0) {
        drafts.push(createEmptyBatchDraft());
      }
      initialBatchesMap[v.id] = drafts;
    });
    setFormVariantBatches(initialBatchesMap);
    setShowProductModal(true);
  };

  // Initialize Add Modal
  const openAddModal = () => {
    setFormError(null);
    setEditingProduct(null);
    setFormHindiName('');
    setFormName('');
    setFormCategory('pesticides');
    setFormProductType('liquid');
    setFormHsnCode('');
    setFormDosePerTank('');
    setFormDoseUnit('ml');
    setFormDosePerBigha('');
    setFormDoseBighaUnit('ml');
    setFormDoseWarning('');

    const initId = `var_init_${Date.now()}`;
    setFormVariants([
      {
        id: initId,
        sizeValue: 1,
        sizeUnit: 'Ltr',
        packagingType: 'Bottle',
        label: '1 Ltr Bottle',
        baseQuantity: 1000,
        costPrice: 0,
        sellingPrice: 0,
        currentStockPacks: 0,
        allowLooseSale: true,
      }
    ]);
    setFormVariantBatches({
      [initId]: [createEmptyBatchDraft()],
    });
    setShowProductModal(true);
  };

  // Add Packaging Variant to Form
  const addVariantToForm = (presetSize?: { val: number; unit: SizeUnit; type: PackagingType }) => {
    const sizeVal = presetSize ? presetSize.val : 500;
    const sizeUnit: SizeUnit = presetSize ? presetSize.unit : (formProductType === 'liquid' ? 'ml' : 'g');
    const packType: PackagingType = presetSize ? presetSize.type : (formProductType === 'liquid' ? 'Bottle' : 'Packet');
    const baseQty = normalizeToBaseUnit(sizeVal, sizeUnit);
    const newId = `var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const newVar: PackagingVariant = {
      id: newId,
      sizeValue: sizeVal,
      sizeUnit: sizeUnit,
      packagingType: packType,
      label: `${sizeVal} ${sizeUnit} ${packType}`,
      baseQuantity: baseQty,
      costPrice: 0,
      sellingPrice: 0,
      currentStockPacks: 0,
      allowLooseSale: true,
    };
    setFormVariants(prev => [...prev, newVar]);
    setFormVariantBatches(prev => ({
      ...prev,
      [newId]: [createEmptyBatchDraft()],
    }));
  };

  const updateFormVariant = (index: number, field: keyof PackagingVariant, value: any) => {
    setFormVariants(prev => {
      const copy = [...prev];
      const updated = { ...copy[index], [field]: value };
      if (field === 'sizeValue' || field === 'sizeUnit' || field === 'packagingType') {
        const sVal = Number(updated.sizeValue) || 0;
        const sUnit = updated.sizeUnit || 'ml';
        updated.baseQuantity = normalizeToBaseUnit(sVal, sUnit);
        updated.label = `${sVal} ${sUnit} ${updated.packagingType || ''}`.trim();
      }
      copy[index] = updated;
      return copy;
    });
  };

  const removeFormVariant = (index: number) => {
    if (formVariants.length <= 1) {
      setFormError('कम से कम एक पैकेजिंग वेरिएंट होना अनिवार्य है।');
      return;
    }
    const targetVar = formVariants[index];
    setFormVariants(prev => prev.filter((_, i) => i !== index));
    if (targetVar?.id) {
      setFormVariantBatches(prev => {
        const next = { ...prev };
        delete next[targetVar.id];
        return next;
      });
    }
  };

  const updateFormBatch = (
    variantId: string,
    batchIdx: number,
    field: keyof FormBatchDraft,
    value: string | number
  ) => {
    setFormVariantBatches(prev => {
      const list = prev[variantId] ? [...prev[variantId]] : [createEmptyBatchDraft()];
      const existing = list[batchIdx] || createEmptyBatchDraft();
      list[batchIdx] = { ...existing, [field]: value };
      return { ...prev, [variantId]: list };
    });
  };

  const addFormBatchRow = (variantId: string) => {
    setFormVariantBatches(prev => {
      const list = prev[variantId] ? [...prev[variantId]] : [];
      return { ...prev, [variantId]: [...list, createEmptyBatchDraft()] };
    });
  };

  const removeFormBatchRow = (variantId: string, batchIdx: number) => {
    setFormVariantBatches(prev => {
      const list = prev[variantId] ? [...prev[variantId]] : [];
      const filtered = list.filter((_, i) => i !== batchIdx);
      return {
        ...prev,
        [variantId]: filtered.length > 0 ? filtered : [createEmptyBatchDraft()],
      };
    });
  };

  // Handle Save Product (With Inline Stock, Batch, Mfg & Expiry when Toggle = ON)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formHindiName.trim()) {
      setFormError('कृपया उत्पाद का हिंदी नाम दर्ज करें।');
      return;
    }
    if (formVariants.length === 0) {
      setFormError('कृपया कम से कम एक पैकेजिंग वेरिएंट जोड़ें।');
      return;
    }

    try {
      const firstVar = formVariants[0];
      const avgCost = formVariants.reduce((sum, v) => sum + (Number(v.costPrice) || 0), 0) / formVariants.length;
      const primarySelling = firstVar.sellingPrice || 0;

      const doseInfo = (
        (formDosePerTank !== '' && Number(formDosePerTank) > 0) ||
        (formDosePerBigha !== '' && Number(formDosePerBigha) > 0) ||
        formDoseWarning.trim()
      ) ? {
        verifiedDosePer20LTank: (formDosePerTank !== '' && Number(formDosePerTank) > 0) ? Number(formDosePerTank) : undefined,
        doseUnit: formDoseUnit,
        verifiedDosePerBigha: (formDosePerBigha !== '' && Number(formDosePerBigha) > 0) ? Number(formDosePerBigha) : undefined,
        doseBighaUnit: formDoseBighaUnit,
        warningNote: formDoseWarning.trim() || undefined,
      } : undefined;

      const existingVariantsMap = new Map<string, PackagingVariant>(
        (editingProduct?.packagingVariants || []).map(ev => [ev.id, ev])
      );

      const now = Date.now();
      const todayStr = new Date(now).toISOString().split('T')[0];

      // When Stock Management is OFF: preserve existing variants' stock/batches completely untouched
      if (!stockConfig.enabled) {
        const preservedVariants: PackagingVariant[] = formVariants.map(v => {
          const existingVar = existingVariantsMap.get(v.id);
          return {
            ...v,
            costPrice: Number(v.costPrice) || 0,
            sellingPrice: Number(v.sellingPrice) || 0,
            currentStockPacks: existingVar?.currentStockPacks ?? (Number(v.currentStockPacks) || 0),
            unbatchedPacks: existingVar?.unbatchedPacks,
            minStockAlertPacks: existingVar?.minStockAlertPacks,
          };
        });

        const totalPacksStock = preservedVariants.reduce(
          (sum, v) => sum + (v.currentStockPacks || 0),
          0
        );

        await saveAccountingProduct({
          hindiName: formHindiName.trim(),
          name: formName.trim() || formHindiName.trim(),
          category: formCategory,
          productType: formProductType,
          unit: firstVar.sizeUnit === 'Ltr' || firstVar.sizeUnit === 'ml' ? 'Bottle' : (firstVar.sizeUnit === 'kg' ? 'Bag' : 'Packet'),
          currentStock: totalPacksStock,
          minStockAlert: editingProduct?.minStockAlert ?? defaultLowThreshold,
          costPrice: Math.round(avgCost * 100) / 100,
          defaultSellingPrice: primarySelling,
          hsnCode: formHsnCode.trim(),
          packagingVariants: preservedVariants,
          hasMultipleVariants: preservedVariants.length > 1,
          standardDoseInfo: doseInfo,
          ...(editingProduct?.batches ? { batches: editingProduct.batches } : {}),
        }, editingProduct?.id);

        await loadProducts();
        setShowProductModal(false);
        setEditingProduct(null);
        return;
      }

      // Stock Management is ON -> Validate inline batches and build authoritative batch array
      const nextBatches: StockBatch[] = [];
      const editedBatchIds = new Set<string>();
      const movEntries: Array<Omit<StockMovementLog, 'id' | 'timestamp' | 'date'>> = [];
      const prevBatchMap = new Map<string, StockBatch>(
        (editingProduct?.batches || []).map(b => [b.id, b])
      );

      for (const v of formVariants) {
        const drafts = formVariantBatches[v.id] || [];
        const variantLabel = v.label || `${v.sizeValue} ${v.sizeUnit}`;

        for (const draft of drafts) {
          const qty = Math.max(0, Math.floor(Number(draft.quantity) || 0));
          const hasAnyInput =
            qty > 0 ||
            draft.batchNumber.trim() !== '' ||
            draft.mfgInput.trim() !== '' ||
            draft.expiryInput.trim() !== '' ||
            draft.purchasePricePerPack.trim() !== '';

          if (!hasAnyInput && !draft.isExisting) {
            continue;
          }

          const parsedMfg = parseMfgOrExpiryInput(draft.mfgInput, 'mfg');
          if (!parsedMfg.valid) {
            setFormError(`${variantLabel}: निर्माण तिथि - ${parsedMfg.error}`);
            return;
          }

          const parsedExp = parseMfgOrExpiryInput(draft.expiryInput, 'expiry');
          if (!parsedExp.valid) {
            setFormError(`${variantLabel}: एक्सपायरी तिथि - ${parsedExp.error}`);
            return;
          }

          if (parsedMfg.isoDate && parsedExp.isoDate && parsedExp.isoDate < parsedMfg.isoDate) {
            setFormError(`${variantLabel}: एक्सपायरी तिथि, निर्माण तिथि से पहले नहीं हो सकती।`);
            return;
          }

          let costVal: number | undefined;
          if (draft.purchasePricePerPack.trim() !== '') {
            const c = Number(draft.purchasePricePerPack);
            if (!Number.isFinite(c) || c < 0) {
              setFormError(`${variantLabel}: कृपया बैच की मान्य खरीद दर दर्ज करें।`);
              return;
            }
            costVal = c;
          } else if ((Number(v.costPrice) || 0) > 0) {
            costVal = Number(v.costPrice);
          }

          const prevBatch = prevBatchMap.get(draft.id);
          editedBatchIds.add(draft.id);

          const batchRecord = sanitizeBatchForFirestore({
            id: draft.id,
            productId: editingProduct?.id || '',
            variantId: v.id,
            batchNumber: draft.batchNumber.trim() || undefined,
            manufacturingDate: parsedMfg.isoDate,
            mfgDisplay: parsedMfg.display,
            expiryDate: parsedExp.isoDate,
            expiryDisplay: parsedExp.display,
            purchasePricePerPack: costVal,
            initialPackQuantity: Math.max(draft.initialPackQuantity || 0, prevBatch?.initialPackQuantity || 0, qty),
            remainingPackQuantity: qty,
            status: qty > 0 ? 'active' : 'exhausted',
            purchaseDate: prevBatch?.purchaseDate || todayStr,
            createdAt: prevBatch?.createdAt || draft.createdAt || now,
            updatedAt: now,
          });
          nextBatches.push(batchRecord);

          const prevQty = prevBatch?.remainingPackQuantity || 0;
          const diff = qty - prevQty;
          if (diff !== 0) {
            movEntries.push({
              productId: editingProduct?.id || '',
              productName: formHindiName.trim(),
              variantId: v.id,
              variantLabel,
              batchId: batchRecord.id,
              batchNumber: batchRecord.batchNumber,
              expiryDate: batchRecord.expiryDate,
              purchaseCostPerPack: batchRecord.purchasePricePerPack ?? (Number(v.costPrice) || 0),
              type: prevBatch ? 'weighing_adjustment' : 'opening',
              quantityChangePacks: diff,
              balancePacksAfter: qty,
              reason: prevBatch
                ? `उत्पाद कार्ड से बैच ${batchRecord.batchNumber || '(बिना नं.)'} अपडेट`
                : `बैच ${batchRecord.batchNumber || '(बिना नं.)'} ओपनिंग स्टॉक दर्ज`,
            });
          }
        }
      }

      // Preserve historical exhausted / expired_written_off batches whose IDs weren't in active form drafts
      const activeVariantIds = new Set(formVariants.map(v => v.id));
      for (const oldBatch of editingProduct?.batches || []) {
        if (editedBatchIds.has(oldBatch.id)) continue;
        if (!activeVariantIds.has(oldBatch.variantId)) continue;
        if (oldBatch.status === 'expired_written_off' || (oldBatch.remainingPackQuantity || 0) <= 0) {
          nextBatches.push(oldBatch);
        }
      }

      const sanitizedBaseVariants: PackagingVariant[] = formVariants.map(v => ({
        ...v,
        costPrice: Number(v.costPrice) || 0,
        sellingPrice: Number(v.sellingPrice) || 0,
        unbatchedPacks: undefined,
        minStockAlertPacks:
          v.minStockAlertPacks !== undefined
            ? Math.max(0, Number(v.minStockAlertPacks) || 0)
            : undefined,
      }));

      // Since active variants in form are now represented directly by nextBatches, clear legacy unbatchedPacks on them
      const unbatchedZeroOverride: Record<string, number> = {};
      sanitizedBaseVariants.forEach(v => {
        unbatchedZeroOverride[v.id] = 0;
      });

      const dummyProd = {
        ...(editingProduct || ({} as AccountingProduct)),
        costPrice: Math.round(avgCost * 100) / 100,
      };
      const synced = syncProductVariantsWithBatches(
        dummyProd,
        sanitizedBaseVariants,
        nextBatches,
        expiryWarningDays,
        unbatchedZeroOverride
      );

      const minAlertAvg =
        synced.updatedVariants[0]?.minStockAlertPacks ??
        editingProduct?.minStockAlert ??
        defaultLowThreshold;

      const savedId = await saveAccountingProduct({
        hindiName: formHindiName.trim(),
        name: formName.trim() || formHindiName.trim(),
        category: formCategory,
        productType: formProductType,
        unit: firstVar.sizeUnit === 'Ltr' || firstVar.sizeUnit === 'ml' ? 'Bottle' : (firstVar.sizeUnit === 'kg' ? 'Bag' : 'Packet'),
        currentStock: synced.totalSaleablePacks,
        minStockAlert: minAlertAvg,
        costPrice: Math.round(avgCost * 100) / 100,
        defaultSellingPrice: primarySelling,
        hsnCode: formHsnCode.trim(),
        packagingVariants: synced.updatedVariants,
        batches: synced.cleanedBatches,
        hasMultipleVariants: synced.updatedVariants.length > 1,
        standardDoseInfo: doseInfo,
      }, editingProduct?.id);

      if (movEntries.length > 0) {
        await recordProductStockMovementsBatch(
          movEntries.map(m => ({ ...m, productId: savedId }))
        );
      }

      await loadProducts();
      setShowProductModal(false);
      setEditingProduct(null);
      setStatusToast({
        type: 'success',
        text: editingProduct
          ? 'उत्पाद, स्टॉक व बैच विवरण सुरक्षित कर दिए गए हैं।'
          : 'नया उत्पाद, स्टॉक व बैच विवरण जोड़ दिए गए हैं।',
      });
    } catch (err: any) {
      setFormError('उत्पाद सुरक्षित करने में त्रुटि: ' + (err.message || err));
    }
  };

  const handleDelete = async (productId: string, name: string) => {
    if (!window.confirm(`क्या आप वाकई "${name}" को हटाना चाहते हैं?`)) return;
    try {
      await deleteAccountingProduct(productId);
      await loadProducts();
    } catch (err: any) {
      alert('डिलीट करने में त्रुटि: ' + (err.message || err));
    }
  };

  return (
    <div className="space-y-4">
      {/* TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">स्टॉक (उत्पाद एवं मूल्य सूची)</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              मास्टर डेटा व मूल्य निर्धारण
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            उत्पादों की खरीद दर (Cost Price), बिक्री दर (Selling Price) और पैकेजिंग साइज मास्टर प्रबंधन
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="रिफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>एक्सपोर्ट / शेयर</span>
          </button>
          
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#23461e] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ नया उत्पाद जोड़ें</span>
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {statusToast && (
        <div
          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
            statusToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusToast.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusToast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span>{statusToast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MASTER STOCK QUANTITY MANAGEMENT TOGGLE BAR */}
      <div
        className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          stockConfig.enabled
            ? 'bg-emerald-50/70 border-emerald-300'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              stockConfig.enabled
                ? 'bg-[#2D5A27] text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-gray-900">
                स्टॉक मात्रा प्रबंधन (Stock Quantity Management):
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  stockConfig.enabled
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-gray-200 text-gray-700 border-gray-300'
                }`}
              >
                {stockConfig.enabled ? 'चालू (ON)' : 'बंद (OFF - Unlimited)'}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
              {stockConfig.enabled
                ? 'पैक-वाइज़ व खुली मात्रा ट्रैक हो रही है। POS बिक्री पर स्टॉक अपने-आप घटेगा और 0 होने पर बिक्री रुकेगी।'
                : 'अभी सभी उत्पाद असीमित स्टॉक मोड में हैं। POS बिलिंग पर कोई मात्रा प्रतिबंध नहीं है और Stock PDF में मात्रा नहीं दिखेगी।'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {stockConfig.enabled && (
            <>
              <button
                type="button"
                onClick={() => setHistoryModalTarget({})}
                className="px-3 py-2 rounded-xl text-xs font-extrabold bg-white text-gray-800 border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#2D5A27]" />
                <span>स्टॉक हिस्ट्री</span>
              </button>

              <button
                type="button"
                onClick={openSettingsModal}
                className="px-3 py-2 rounded-xl text-xs font-extrabold bg-white text-gray-800 border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="स्टॉक अलर्ट सीमा व नियम सेट करें"
              >
                <Settings2 className="w-3.5 h-3.5 text-[#2D5A27]" />
                <span>अलर्ट नियम</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => handleRequestToggle(!stockConfig.enabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border shadow-2xs transition-all cursor-pointer ${
              stockConfig.enabled
                ? 'bg-[#2D5A27] hover:bg-[#1f411b] text-white border-[#2D5A27]'
                : 'bg-white hover:bg-emerald-50 text-gray-800 border-gray-300'
            }`}
          >
            <span
              className={`w-7 h-4 rounded-full p-0.5 flex items-center transition-all ${
                stockConfig.enabled
                  ? 'bg-emerald-300 justify-end'
                  : 'bg-gray-300 justify-start'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
            </span>
            <span>{stockConfig.enabled ? 'ON (बंद करें)' : 'OFF (चालू करें)'}</span>
          </button>
        </div>
      </div>

      {/* STOCK & BATCH HEALTH SUMMARY STRIP + SEGMENTED FILTER BAR (ONLY WHEN TOGGLE = ON) */}
      {stockConfig.enabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Saleable Stock & Active Batches */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-slate-500 leading-snug">
                  बिक्री योग्य स्टॉक व बैच
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#2D5A27] border border-emerald-100 flex items-center justify-center shrink-0">
                  <Boxes className="w-4.5 h-4.5" />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {metrics.totalSealedPacks.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-bold text-slate-500">पैक</span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium tabular-nums">
                <span>सक्रिय बैच: <strong className="text-emerald-700 font-bold">{metrics.totalActiveBatches}</strong></span>
                <span className="text-emerald-700 font-semibold">बिक्री हेतु उपलब्ध</span>
              </div>
            </div>

            {/* Card 2: Low / Out of Stock (Interactive Filter) */}
            <button
              type="button"
              onClick={() => setStockFilterMode(prev => prev === 'low_out' ? 'all' : 'low_out')}
              className={`group text-left rounded-2xl border p-4 transition-colors duration-150 cursor-pointer focus:outline-none flex flex-col justify-between ${
                stockFilterMode === 'low_out'
                  ? 'bg-amber-50/80 border-amber-400'
                  : 'bg-white border-slate-200/90 hover:bg-amber-50/60 hover:border-amber-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <span className={`text-xs font-bold leading-snug transition-colors ${
                  stockFilterMode === 'low_out' ? 'text-amber-900' : 'text-slate-500 group-hover:text-amber-900'
                }`}>
                  कम / खत्म स्टॉक (सीमा ≤{defaultLowThreshold})
                </span>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                  metrics.lowOrOutVariantsCount > 0
                    ? 'bg-amber-50 text-amber-600 border-amber-200/80 group-hover:bg-amber-100/80 group-hover:border-amber-300'
                    : 'bg-slate-50 text-slate-400 border-slate-200/70 group-hover:bg-amber-100/70 group-hover:text-amber-600 group-hover:border-amber-300'
                }`}>
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-1.5 tabular-nums">
                <span className={`text-2xl font-extrabold tracking-tight ${
                  metrics.lowOrOutVariantsCount > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}>
                  {metrics.lowOrOutVariantsCount}
                </span>
                <span className="text-xs font-bold text-slate-500">वेरिएंट</span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 group-hover:border-amber-200/60 w-full flex items-center justify-between text-[11px] font-medium transition-colors">
                <span className="text-slate-500">न्यूनतम स्टॉक अलर्ट</span>
                <span className="text-amber-700 font-bold">
                  {stockFilterMode === 'low_out' ? 'फ़िल्टर सक्रिय' : 'फ़िल्टर करें →'}
                </span>
              </div>
            </button>

            {/* Card 3: Expiry Alert 4 Months (Interactive Filter) */}
            <button
              type="button"
              onClick={() =>
                setStockFilterMode(prev =>
                  prev === 'near_expiry'
                    ? metrics.expiredBatchesCount > 0 ? 'expired' : 'all'
                    : prev === 'expired'
                    ? 'all'
                    : metrics.expiredBatchesCount > 0
                    ? 'expired'
                    : 'near_expiry'
                )
              }
              className={`group text-left rounded-2xl border p-4 transition-colors duration-150 cursor-pointer focus:outline-none flex flex-col justify-between ${
                stockFilterMode === 'expired' || stockFilterMode === 'near_expiry'
                  ? 'bg-rose-50/80 border-rose-400'
                  : 'bg-white border-slate-200/90 hover:bg-rose-50/60 hover:border-rose-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <span className={`text-xs font-bold leading-snug transition-colors ${
                  stockFilterMode === 'expired' || stockFilterMode === 'near_expiry'
                    ? 'text-rose-900'
                    : 'text-slate-500 group-hover:text-rose-900'
                }`}>
                  एक्सपायरी अलर्ट (4 माह)
                </span>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                  metrics.expiredBatchesCount > 0 || metrics.nearExpiryBatchesCount > 0
                    ? 'bg-rose-50 text-rose-600 border-rose-200/80 group-hover:bg-rose-100/80 group-hover:border-rose-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-rose-100/70 group-hover:text-rose-600 group-hover:border-rose-300'
                }`}>
                  <CalendarClock className="w-4.5 h-4.5" />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2 tabular-nums">
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-extrabold tracking-tight ${
                    metrics.nearExpiryBatchesCount > 0 ? 'text-orange-600' : 'text-slate-900'
                  }`}>
                    {metrics.nearExpiryBatchesCount}
                  </span>
                  <span className="text-xs font-bold text-slate-500">निकट</span>
                </div>
                <span className="text-slate-300 font-bold">·</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-extrabold tracking-tight ${
                    metrics.expiredBatchesCount > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}>
                    {metrics.expiredBatchesCount}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Exp</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 group-hover:border-rose-200/60 w-full flex items-center justify-between text-[11px] font-medium transition-colors">
                <span className={metrics.expiredPacksCount > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-semibold'}>
                  {metrics.expiredPacksCount > 0
                    ? `${metrics.expiredPacksCount} पैक बिक्री हेतु बंद`
                    : 'सभी बैच सुरक्षित'}
                </span>
                <span className="text-rose-700 font-bold">
                  {stockFilterMode === 'expired' || stockFilterMode === 'near_expiry' ? 'फ़िल्टर सक्रिय' : 'जांचें →'}
                </span>
              </div>
            </button>

            {/* Card 4: Total Stock Valuation (Batch Cost) */}
            <div className="group bg-white rounded-2xl border border-slate-200/90 p-4 hover:bg-teal-50/60 hover:border-teal-300 transition-colors duration-150 flex flex-col">
              <div className="flex items-start justify-between gap-3 w-full">
                <span className="text-xs font-bold text-slate-500 group-hover:text-teal-800 leading-snug transition-colors">
                  कुल स्टॉक लागत
                </span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/70 group-hover:bg-teal-100/80 group-hover:border-teal-300 flex items-center justify-center shrink-0 transition-colors">
                  <DollarSign className="w-4.5 h-4.5" />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  ₹{metrics.totalStockCostValue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Modern Segmented Filter Toolbar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setStockFilterMode('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                stockFilterMode === 'all'
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <span>सभी उत्पाद</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                stockFilterMode === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilterMode(prev => prev === 'low_out' ? 'all' : 'low_out')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                stockFilterMode === 'low_out'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-amber-50/70 hover:text-amber-900'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${stockFilterMode === 'low_out' ? 'text-white' : 'text-amber-600'}`} />
              <span>कम / खत्म स्टॉक</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                stockFilterMode === 'low_out' ? 'bg-white/20 text-white' : 'bg-amber-100/80 text-amber-800'
              }`}>
                {metrics.lowOrOutVariantsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilterMode(prev => prev === 'near_expiry' ? 'all' : 'near_expiry')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                stockFilterMode === 'near_expiry'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-orange-50/70 hover:text-orange-900'
              }`}
            >
              <CalendarClock className={`w-3.5 h-3.5 ${stockFilterMode === 'near_expiry' ? 'text-white' : 'text-orange-600'}`} />
              <span>4 माह में एक्सपायरी</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                stockFilterMode === 'near_expiry' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-800'
              }`}>
                {metrics.nearExpiryBatchesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilterMode(prev => prev === 'expired' ? 'all' : 'expired')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                stockFilterMode === 'expired'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-rose-50/70 hover:text-rose-900'
              }`}
            >
              <AlertCircle className={`w-3.5 h-3.5 ${stockFilterMode === 'expired' ? 'text-white' : 'text-rose-600'}`} />
              <span>एक्सपायर्ड बैच</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                stockFilterMode === 'expired' ? 'bg-white/20 text-white' : 'bg-rose-100/80 text-rose-800'
              }`}>
                {metrics.expiredBatchesCount}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div 
          onClick={() => setCategoryFilter('all')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'all' ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">कुल उत्पाद</span>
            <Boxes className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.totalItems}</p>
          <span className="text-[10px] text-gray-400">सभी पंजीकृत आइटम</span>
        </div>

        <div 
          onClick={() => setCategoryFilter('pesticides')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'pesticides' ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">कीटनाशक</span>
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.pesticidesCount}</p>
          <span className="text-[10px] text-gray-400">स्प्रे व तकनीकी दवाइयां</span>
        </div>

        <div 
          onClick={() => setCategoryFilter('fertilizers')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'fertilizers' ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">उर्वरक / खाद</span>
            <Tag className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.fertilizersCount}</p>
          <span className="text-[10px] text-gray-400">NPK, यूरिया, सूक्ष्म पोषक</span>
        </div>

        <div 
          onClick={() => setCategoryFilter('seeds')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'seeds' ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">उन्नत बीज</span>
            <Tag className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.seedsCount}</p>
          <span className="text-[10px] text-gray-400">फसल व सब्जी बीज</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">अन्य उत्पाद</span>
            <Tag className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-xl font-black text-gray-900 mt-1">{metrics.otherCount}</p>
          <span className="text-[10px] text-gray-400">उपकरण, स्प्रेयर आदि</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">औसत लाभ मार्जिन</span>
            <Percent className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <p className="text-xl font-black text-emerald-700 mt-1">{metrics.avgMarginPercent}%</p>
          <span className="text-[10px] text-gray-400">बिक्री दर के आधार पर</span>
        </div>
      </div>

      {/* FILTER CONTROLS & SEARCH */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="उत्पाद का नाम, तकनीकी नाम, HSN खोजें..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
          >
            <option value="all">सभी श्रेणियां (All Categories)</option>
            {ACCOUNTING_PRODUCT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nameHindi}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PRODUCTS MASTER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">उत्पाद व टेक्निकल विवरण</th>
                <th className="py-3.5 px-3">पैकेजिंग साइज (Pack Sizes)</th>
                {stockConfig.enabled && (
                  <th className="py-3.5 px-3">उपलब्ध स्टॉक (Remaining Stock)</th>
                )}
                <th className="py-3.5 px-3">खरीद दर (Cost Price)</th>
                <th className="py-3.5 px-3">बिक्री दर (Selling Price)</th>
                <th className="py-3.5 px-3">लाभ / मार्जिन</th>
                <th className="py-3.5 px-4 text-right">त्वरित एक्शन</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={stockConfig.enabled ? 7 : 6} className="py-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    कोई उत्पाद नहीं मिला। नया उत्पाद जोड़ने के लिए ऊपर <strong>"+ नया उत्पाद जोड़ें"</strong> दबाएं।
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isExpanded = expandedProductIds[p.id];
                  const firstVar = p.resolvedVariants[0];
                  const primaryCost = firstVar?.costPrice || p.costPrice || 0;
                  const primarySelling = firstVar?.sellingPrice || p.defaultSellingPrice || 0;
                  const primaryMargin = primarySelling - primaryCost;
                  const marginPercent = primarySelling > 0 ? Math.round((primaryMargin / primarySelling) * 100) : 0;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        {/* Column 1: Product Name & Category */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start gap-2">
                            {p.resolvedVariants.length > 1 && (
                              <button
                                onClick={() => toggleProductExpand(p.id)}
                                className="mt-0.5 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                title="सभी साइज विस्तार से देखें"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <div>
                              <div className="font-extrabold text-gray-900 text-sm">{p.hindiName}</div>
                              {p.name && p.name !== p.hindiName && (
                                <div className="text-[11px] text-gray-500">{p.name}</div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold rounded text-[10px]">
                                  {p.category}
                                </span>
                                {p.productType && (
                                  <span className="text-[10px] text-gray-500">
                                    · {p.productType === 'liquid' ? 'तरल (Liquid)' : 'पाउडर / दानेदार'}
                                  </span>
                                )}
                                {p.hsnCode && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    · HSN: {p.hsnCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Packaging Sizes */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {p.resolvedVariants.map((v, i) => (
                              <span
                                key={v.id || i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-gray-50 text-gray-800 border border-gray-200 font-semibold"
                              >
                                {v.label || `${v.sizeValue} ${v.sizeUnit}`}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Optional Column: Available Stock & Batches per Pack Size (ONLY WHEN TOGGLE = ON) */}
                        {stockConfig.enabled && (
                          <td className="py-3.5 px-3 align-top">
                            <div className="space-y-1">
                              {p.health.variantSummaries.map((vs, i) => {
                                const firstActiveBatch = vs.batches.find(
                                  b => b.status !== 'expired_written_off' && b.remainingPackQuantity > 0
                                );
                                return (
                                  <div
                                    key={vs.variantId || i}
                                    className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-200/80 space-y-0.5"
                                  >
                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                      <span className="text-gray-700 font-semibold truncate max-w-[110px]">
                                        {vs.variantLabel}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {vs.expiredBatchesCount > 0 && (
                                          <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-extrabold">
                                            {vs.batchedExpiredPacks} Exp
                                          </span>
                                        )}
                                        {vs.nearExpiryBatchesCount > 0 && vs.expiredBatchesCount === 0 && (
                                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold">
                                            निकट Exp
                                          </span>
                                        )}
                                        <span
                                          className={`font-black ${
                                            vs.isOutOfStock
                                              ? 'text-red-600'
                                              : vs.isLowStock
                                              ? 'text-amber-700'
                                              : 'text-emerald-700'
                                          }`}
                                        >
                                          {vs.isOutOfStock ? '0 (खत्म)' : `${vs.saleablePacks} शेष`}
                                        </span>
                                      </div>
                                    </div>
                                    {firstActiveBatch && (firstActiveBatch.batchNumber || firstActiveBatch.expiryDate) && (
                                      <div className="text-[9.5px] text-gray-500 font-medium truncate">
                                        {firstActiveBatch.batchNumber ? `बैच: ${firstActiveBatch.batchNumber}` : ''}
                                        {firstActiveBatch.batchNumber && firstActiveBatch.expiryDate ? ' · ' : ''}
                                        {firstActiveBatch.expiryDate
                                          ? `Exp: ${formatBatchDateHindiDisplay(firstActiveBatch.expiryDate, firstActiveBatch.expiryDisplay)}`
                                          : ''}
                                        {vs.activeBatchesCount > 1 ? ` (+${vs.activeBatchesCount - 1})` : ''}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {p.looseStock && p.looseStock.availableBaseQty > 0 && (
                                <div className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg inline-block">
                                  खुला: {formatBaseUnitDisplay(p.looseStock.availableBaseQty, p.looseStock.baseUnit)}
                                  {p.looseStock.lastOpenedBatchNumber && ` · ${p.looseStock.lastOpenedBatchNumber}`}
                                </div>
                              )}
                              {p.health.missingWarningsCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(p)}
                                  className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 cursor-pointer hover:bg-amber-100"
                                >
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>{p.health.missingWarningsCount} अधूरा बैच विवरण</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Column 3: Cost Price */}
                        <td className="py-3.5 px-3 align-top">
                          {p.resolvedVariants.length === 1 ? (
                            <span className="font-bold text-gray-900 text-xs">
                              ₹{primaryCost}
                            </span>
                          ) : (
                            <div className="text-xs">
                              <span className="font-bold text-gray-900">₹{primaryCost}</span>
                              <span className="text-[10px] text-gray-400 block font-normal">
                                ({p.resolvedVariants.length} साइज उपलब्ध)
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Column 4: Selling Price */}
                        <td className="py-3.5 px-3 align-top">
                          {p.resolvedVariants.length === 1 ? (
                            <span className="font-bold text-emerald-800 text-xs">
                              ₹{primarySelling}
                            </span>
                          ) : (
                            <div className="text-xs">
                              <span className="font-bold text-emerald-800">₹{primarySelling}</span>
                              <span className="text-[10px] text-gray-400 block font-normal">
                                ({firstVar?.label || 'प्राइमरी'})
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Column 5: Margin / Profit */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="text-xs">
                            <span className={`font-bold ${primaryMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              ₹{primaryMargin} ({marginPercent}%)
                            </span>
                            <span className="text-[10px] text-gray-400 block">प्रति नग लाभ</span>
                          </div>
                        </td>

                        {/* Column 6: Action Buttons */}
                        <td className="py-3.5 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            {stockConfig.enabled && (
                              <button
                                onClick={() =>
                                  setHistoryModalTarget({
                                    productId: p.id,
                                    productName: p.hindiName || p.name,
                                  })
                                }
                                className="p-1.5 text-gray-500 hover:text-[#2D5A27] hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                                title="इस उत्पाद की स्टॉक हिस्ट्री देखें"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-transparent hover:border-gray-200 transition-colors cursor-pointer"
                              title="मूल्य व उत्पाद संपादित करें"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(p.id, p.hindiName)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="हटाएं"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED ACCORDION: DETAIL PER VARIANT & DOSE INFO */}
                      {isExpanded && (
                        <tr className="bg-gray-50/60">
                          <td colSpan={stockConfig.enabled ? 7 : 6} className="p-3 pl-12">
                            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                                  सभी पैकेजिंग साइज व मूल्य विवरण (Rate Card)
                                </span>
                                {p.standardDoseInfo && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {p.standardDoseInfo.verifiedDosePer20LTank && (
                                      <span className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                                        पंप डोज़: <strong>{p.standardDoseInfo.verifiedDosePer20LTank} {p.standardDoseInfo.doseUnit || 'ml'}</strong> / 20L
                                      </span>
                                    )}
                                    {p.standardDoseInfo.verifiedDosePerBigha && (
                                      <span className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                                        प्रति बीघा: <strong>{p.standardDoseInfo.verifiedDosePerBigha} {p.standardDoseInfo.doseBighaUnit || 'kg'}</strong> / बीघा
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                {p.resolvedVariants.map(v => {
                                  const cost = v.costPrice || 0;
                                  const selling = v.sellingPrice || 0;
                                  const diff = selling - cost;
                                  const mPct = selling > 0 ? Math.round((diff / selling) * 100) : 0;
                                  const vs = calculateVariantStockSummary(p, v, defaultLowThreshold, expiryWarningDays);
                                  return (
                                    <div key={v.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                                      <div className="font-extrabold text-gray-900 flex items-center justify-between gap-1">
                                        <span>{v.label}</span>
                                        {stockConfig.enabled && vs.activeBatchesCount > 0 && (
                                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-extrabold">
                                            {vs.activeBatchesCount} बैच
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-1.5 space-y-1 text-[11px] text-gray-600">
                                        <div className="flex justify-between">
                                          <span>खरीद दर (Cost):</span>
                                          <strong className="text-gray-800">₹{cost}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>बिक्री दर (Selling):</span>
                                          <strong className="text-emerald-800">₹{selling}</strong>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-gray-200 text-emerald-700 font-bold">
                                          <span>मुनाफा (Margin):</span>
                                          <span>₹{diff} ({mPct}%)</span>
                                        </div>
                                        {stockConfig.enabled && (
                                          <div className="flex justify-between pt-1 border-t border-gray-200 font-bold">
                                            <span>बिक्री योग्य स्टॉक:</span>
                                            <span className={vs.isOutOfStock ? 'text-red-600' : vs.isLowStock ? 'text-amber-700' : 'text-emerald-800'}>
                                              {vs.saleablePacks} पैक
                                              {vs.batchedExpiredPacks > 0 && ` (+${vs.batchedExpiredPacks} Exp)`}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT PRODUCT & MULTI-PACKAGING SIZES */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">
                  {editingProduct ? 'उत्पाद व मूल्य सूची संपादित करें' : 'नया उत्पाद जोड़ें'}
                </h3>
                <p className="text-xs text-gray-500">
                  {stockConfig.enabled
                    ? 'उत्पाद की खरीद दर, बिक्री दर, स्टॉक मात्रा, बैच नंबर व निर्माण/एक्सपायरी तिथि दर्ज करें'
                    : 'उत्पाद की खरीद दर (Cost Price) और बिक्री दर (Selling Price) दर्ज करें'}
                </p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* SECTION A: BASIC INFO */}
              <ProductBasicInfoFields
                values={{
                  hindiName: formHindiName,
                  name: formName,
                  category: formCategory,
                  productType: formProductType,
                }}
                onChange={updated => {
                  if (updated.hindiName !== undefined) setFormHindiName(updated.hindiName);
                  if (updated.name !== undefined) setFormName(updated.name);
                  if (updated.category !== undefined) {
                    setFormCategory(updated.category);
                    if (formProductType !== 'liquid') {
                      if (updated.category === 'fertilizers') {
                        setFormDoseBighaUnit('kg');
                      } else {
                        setFormDoseBighaUnit('g');
                      }
                    }
                  }
                  if (updated.productType !== undefined) {
                    setFormProductType(updated.productType);
                    setFormDoseUnit(updated.productType === 'liquid' ? 'ml' : 'g');
                    if (updated.productType === 'liquid') {
                      setFormDoseBighaUnit('ml');
                    } else if (formCategory === 'fertilizers') {
                      setFormDoseBighaUnit('kg');
                    } else {
                      setFormDoseBighaUnit('g');
                    }
                  }
                }}
                existingProducts={products}
                currentProductId={editingProduct?.id}
                onSelectExistingProduct={p => openEditModal(p)}
                accentColor="emerald"
              />

              {/* HSN CODE (OPTIONAL) */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">HSN कोड (वैकल्पिक)</label>
                <input
                  type="text"
                  placeholder="उदा. 3808"
                  value={formHsnCode}
                  onChange={e => setFormHsnCode(e.target.value)}
                  className="w-full sm:w-1/2 p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs"
                />
              </div>

              {/* SECTION B: PACKAGING SIZES & PRICING (NO QUANTITY/INVENTORY FIELDS) */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-extrabold text-gray-900 text-xs block">पैकेजिंग साइज व मूल्य दरें (Pack Sizes & Rates)</span>
                    <span className="text-[11px] text-gray-500">प्रत्येक साइज की खरीद दर और बिक्री दर तय करें</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Quick Preset Buttons */}
                    {formProductType === 'liquid' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 100, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 100ml
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 250, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 250ml
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 500, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 500ml
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 1, unit: 'Ltr', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 1L
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 100, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 100g
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 250, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 250g
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 500, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 500g
                        </button>
                        <button
                          type="button"
                          onClick={() => addVariantToForm({ val: 1, unit: 'kg', type: 'Bag' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                        >
                          + 1kg
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => addVariantToForm()}
                      className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ नई साइज</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {formVariants.map((v, idx) => {
                    const cost = Number(v.costPrice) || 0;
                    const selling = Number(v.sellingPrice) || 0;
                    const marginVal = selling - cost;
                    const marginPct = selling > 0 ? Math.round((marginVal / selling) * 100) : 0;
                    const variantDrafts = formVariantBatches[v.id] || [createEmptyBatchDraft()];
                    const totalDraftQty = variantDrafts.reduce(
                      (s, d) => s + Math.max(0, Math.floor(Number(d.quantity) || 0)),
                      0
                    );

                    return (
                      <div key={v.id || idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">साइज व पैकेजिंग प्रकार</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="any"
                              required
                              value={v.sizeValue}
                              onChange={e => updateFormVariant(idx, 'sizeValue', Number(e.target.value))}
                              className="w-16 p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-center"
                            />
                            <select
                              value={v.sizeUnit}
                              onChange={e => updateFormVariant(idx, 'sizeUnit', e.target.value)}
                              className="p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-[11px]"
                            >
                              <option value="ml">ml</option>
                              <option value="Ltr">Ltr</option>
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="Piece">नग</option>
                            </select>
                            <select
                              value={v.packagingType}
                              onChange={e => updateFormVariant(idx, 'packagingType', e.target.value)}
                              className="p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-[11px] flex-1"
                            >
                              <option value="Bottle">बोतल</option>
                              <option value="Pouch">पाउच</option>
                              <option value="Packet">पैकेट</option>
                              <option value="Bag">कट्टा/बैग</option>
                              <option value="Can">केन</option>
                              <option value="Bucket">बाल्टी</option>
                              <option value="Box">बॉक्स</option>
                              <option value="Other">अन्य</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">खरीद दर (Cost) ₹</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={v.costPrice}
                            onChange={e => updateFormVariant(idx, 'costPrice', Number(e.target.value))}
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-900"
                            placeholder="0"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-gray-500 block mb-0.5">बिक्री दर (Sale) ₹</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={v.sellingPrice}
                            onChange={e => updateFormVariant(idx, 'sellingPrice', Number(e.target.value))}
                            className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-emerald-800"
                            placeholder="0"
                          />
                        </div>

                        <div className="sm:col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => removeFormVariant(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                            title="इस साइज को हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* INLINE STOCK QTY, LOW STOCK ALERT, BATCH NO., MFG & EXPIRY (HIDDEN WHEN TOGGLE = OFF) */}
                        {stockConfig.enabled && (
                          <div className="sm:col-span-12 space-y-2.5 pt-2 border-t border-emerald-200/70 bg-emerald-50/50 p-2.5 rounded-xl">
                            {variantDrafts.length <= 1 ? (() => {
                              const single = variantDrafts[0] || createEmptyBatchDraft();
                              const parsedExpPreview = single.expiryInput.trim()
                                ? parseMfgOrExpiryInput(single.expiryInput, 'expiry')
                                : null;
                              const expBadge =
                                parsedExpPreview?.valid && parsedExpPreview.isoDate
                                  ? getBatchAlert(
                                      {
                                        id: single.id,
                                        productId: '',
                                        variantId: v.id,
                                        expiryDate: parsedExpPreview.isoDate,
                                        initialPackQuantity: single.quantity,
                                        remainingPackQuantity: single.quantity,
                                        createdAt: single.createdAt,
                                      },
                                      expiryWarningDays
                                    )
                                  : null;

                              return (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-extrabold text-emerald-900 block mb-0.5">
                                        उपलब्ध स्टॉक मात्रा (Opening / Stock Qty)
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={single.quantity}
                                        onChange={e =>
                                          updateFormBatch(
                                            v.id,
                                            0,
                                            'quantity',
                                            Math.max(0, Math.floor(Number(e.target.value) || 0))
                                          )
                                        }
                                        className="w-full p-1.5 bg-white border border-emerald-300 rounded-lg font-black text-emerald-900 text-xs"
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                                        कम स्टॉक चेतावनी सीमा (डिफ़ॉल्ट: {defaultLowThreshold})
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={v.minStockAlertPacks ?? ''}
                                        onChange={e =>
                                          updateFormVariant(
                                            idx,
                                            'minStockAlertPacks',
                                            e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0)
                                          )
                                        }
                                        className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-xs"
                                        placeholder={`डिफ़ॉल्ट ${defaultLowThreshold}`}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                                        बैच नंबर (Batch No.)
                                      </label>
                                      <input
                                        type="text"
                                        value={single.batchNumber}
                                        onChange={e => updateFormBatch(v.id, 0, 'batchNumber', e.target.value)}
                                        placeholder="उदा. RKT-101 (वैकल्पिक)"
                                        className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                                        निर्माण तिथि (Mfg Date)
                                      </label>
                                      <input
                                        type="text"
                                        value={single.mfgInput}
                                        onChange={e => updateFormBatch(v.id, 0, 'mfgInput', e.target.value)}
                                        placeholder="06/2026 (वैकल्पिक)"
                                        className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                                        एक्सपायरी तिथि (Expiry Date)
                                      </label>
                                      <input
                                        type="text"
                                        value={single.expiryInput}
                                        onChange={e => updateFormBatch(v.id, 0, 'expiryInput', e.target.value)}
                                        placeholder="06/2028 (वैकल्पिक)"
                                        className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-xs"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {expBadge && expBadge.status !== 'no_date' ? (
                                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${expBadge.badgeClass}`}>
                                          {expBadge.labelHindi}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-gray-500">
                                          दिनांक फॉर्मेट: MM/YYYY (जैसे 06/2028) या DD/MM/YYYY · सभी बैच फ़ील्ड वैकल्पिक
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => addFormBatchRow(v.id)}
                                      className="text-[10px] font-extrabold text-[#2D5A27] hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>एक और बैच जोड़ें</span>
                                    </button>
                                  </div>
                                </>
                              );
                            })() : (
                              <>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] font-black text-emerald-950">
                                      कुल स्टॉक: {totalDraftQty} पैक ({variantDrafts.length} बैच)
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-bold text-gray-600">कम स्टॉक सीमा:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={v.minStockAlertPacks ?? ''}
                                        onChange={e =>
                                          updateFormVariant(
                                            idx,
                                            'minStockAlertPacks',
                                            e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0)
                                          )
                                        }
                                        className="w-16 p-1 bg-white border border-gray-200 rounded-lg font-bold text-gray-800 text-[11px] text-center"
                                        placeholder={`${defaultLowThreshold}`}
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => addFormBatchRow(v.id)}
                                    className="px-2 py-1 bg-[#2D5A27] text-white rounded-lg text-[10px] font-extrabold hover:bg-[#1f411b] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>नया बैच जोड़ें</span>
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  {variantDrafts.map((batchDraft, bIdx) => {
                                    const parsedExpPreview = batchDraft.expiryInput.trim()
                                      ? parseMfgOrExpiryInput(batchDraft.expiryInput, 'expiry')
                                      : null;
                                    const expBadge =
                                      parsedExpPreview?.valid && parsedExpPreview.isoDate
                                        ? getBatchAlert(
                                            {
                                              id: batchDraft.id,
                                              productId: '',
                                              variantId: v.id,
                                              expiryDate: parsedExpPreview.isoDate,
                                              initialPackQuantity: batchDraft.quantity,
                                              remainingPackQuantity: batchDraft.quantity,
                                              createdAt: batchDraft.createdAt,
                                            },
                                            expiryWarningDays
                                          )
                                        : null;

                                    return (
                                      <div
                                        key={batchDraft.id}
                                        className="p-2 bg-white rounded-xl border border-emerald-200/80 grid grid-cols-2 sm:grid-cols-12 gap-1.5 items-end"
                                      >
                                        <div className="sm:col-span-2">
                                          <label className="text-[9.5px] font-extrabold text-emerald-900 block mb-0.5">
                                            मात्रा (Qty)
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={batchDraft.quantity}
                                            onChange={e =>
                                              updateFormBatch(
                                                v.id,
                                                bIdx,
                                                'quantity',
                                                Math.max(0, Math.floor(Number(e.target.value) || 0))
                                              )
                                            }
                                            className="w-full p-1.5 bg-emerald-50/40 border border-emerald-300 rounded-lg font-black text-emerald-950 text-xs"
                                          />
                                        </div>
                                        <div className="sm:col-span-3">
                                          <label className="text-[9.5px] font-bold text-gray-600 block mb-0.5">
                                            बैच नं. (Batch No.)
                                          </label>
                                          <input
                                            type="text"
                                            value={batchDraft.batchNumber}
                                            onChange={e => updateFormBatch(v.id, bIdx, 'batchNumber', e.target.value)}
                                            placeholder="RKT-101"
                                            className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs"
                                          />
                                        </div>
                                        <div className="sm:col-span-2">
                                          <label className="text-[9.5px] font-bold text-gray-600 block mb-0.5">
                                            Mfg तिथि
                                          </label>
                                          <input
                                            type="text"
                                            value={batchDraft.mfgInput}
                                            onChange={e => updateFormBatch(v.id, bIdx, 'mfgInput', e.target.value)}
                                            placeholder="06/2026"
                                            className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs"
                                          />
                                        </div>
                                        <div className="sm:col-span-2">
                                          <label className="text-[9.5px] font-bold text-gray-600 block mb-0.5">
                                            Expiry तिथि
                                          </label>
                                          <input
                                            type="text"
                                            value={batchDraft.expiryInput}
                                            onChange={e => updateFormBatch(v.id, bIdx, 'expiryInput', e.target.value)}
                                            placeholder="06/2028"
                                            className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs"
                                          />
                                        </div>
                                        <div className="sm:col-span-2">
                                          <label className="text-[9.5px] font-bold text-gray-600 block mb-0.5">
                                            खरीद दर ₹
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={batchDraft.purchasePricePerPack}
                                            onChange={e => updateFormBatch(v.id, bIdx, 'purchasePricePerPack', e.target.value)}
                                            placeholder={`₹${v.costPrice || 0}`}
                                            className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold text-xs"
                                          />
                                        </div>
                                        <div className="sm:col-span-1 flex items-center justify-end">
                                          <button
                                            type="button"
                                            onClick={() => removeFormBatchRow(v.id, bIdx)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                                            title="यह बैच पंक्ति हटाएं"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        {expBadge && expBadge.status !== 'no_date' && (
                                          <div className="col-span-2 sm:col-span-12 pt-0.5">
                                            <span className={`px-2 py-0.5 rounded border text-[9.5px] font-bold ${expBadge.badgeClass}`}>
                                              {expBadge.labelHindi}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Live margin pill */}
                        <div className="sm:col-span-12 flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/60">
                          <span className="text-gray-500">
                            {v.label}
                          </span>
                          <span className={`font-bold ${marginVal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            मुनाफा: ₹{marginVal} ({marginPct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION C: DOSE ASSISTANT CONFIGURATION (OPTIONAL FOR POS ADVICE) */}
              <div className="border-t border-gray-200 pt-3">
                <span className="font-extrabold text-gray-900 text-xs block mb-1">
                  प्रमाणित डोज़ सहायक (Dose Recommendation for POS)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                      20L पंप डोज़ ({formDoseUnit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder={formProductType === 'liquid' ? 'उदा. 40' : 'उदा. 25'}
                      value={formDosePerTank}
                      onChange={e => setFormDosePerTank(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                      प्रति बीघा डोज़ ({formDoseBighaUnit === 'kg' ? 'किलो' : formDoseBighaUnit === 'g' ? 'ग्राम' : formDoseBighaUnit === 'ml' ? 'ml' : 'लीटर'})
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        placeholder={
                          formDoseBighaUnit === 'kg'
                            ? 'उदा. 20 (किलो/बीघा)'
                            : formDoseBighaUnit === 'g'
                            ? 'उदा. 500 (ग्राम/बीघा)'
                            : formDoseBighaUnit === 'Ltr'
                            ? 'उदा. 1 (लीटर/बीघा)'
                            : 'उदा. 250 (ml/बीघा)'
                        }
                        value={formDosePerBigha}
                        onChange={e => setFormDosePerBigha(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                      />
                      <select
                        value={formDoseBighaUnit}
                        onChange={e => setFormDoseBighaUnit(e.target.value)}
                        className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 shrink-0 cursor-pointer"
                      >
                        {formProductType === 'liquid' ? (
                          <>
                            <option value="ml">ml / बीघा</option>
                            <option value="Ltr">लीटर / बीघा</option>
                          </>
                        ) : (
                          <>
                            <option value="kg">किलो / बीघा</option>
                            <option value="g">ग्राम / बीघा</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                      सुझाव निर्देश (वैकल्पिक)
                    </label>
                    <input
                      type="text"
                      placeholder="उदा. शाम के समय स्प्रे करें"
                      value={formDoseWarning}
                      onChange={e => setFormDoseWarning(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#2D5A27] text-white rounded-xl font-extrabold text-sm shadow-sm hover:bg-[#23461e] active:scale-95 transition-all mt-3"
              >
                उत्पाद व मूल्य सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK / RATE LIST EXPORT & SHARE */}
      {showExportModal && (
        <StockExportModal
          products={products}
          initialCategory={categoryFilter}
          stockManagementEnabled={stockConfig.enabled}
          stockConfig={stockConfig}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* MODAL: STOCK MOVEMENT AUDIT HISTORY */}
      {historyModalTarget && (
        <StockMovementHistoryModal
          productId={historyModalTarget.productId}
          productName={historyModalTarget.productName}
          onClose={() => setHistoryModalTarget(null)}
        />
      )}

      {/* MODAL: STOCK & EXPIRY ALERT SETTINGS */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Settings2 className="w-4.5 h-4.5 text-[#2D5A27]" />
                  <span>स्टॉक व एक्सपायरी अलर्ट नियम</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  कम स्टॉक सीमा, 4-माह एक्सपायरी अलर्ट और POS बिक्री नियम तय करें
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-gray-700 block mb-1">
                  डिफ़ॉल्ट कम स्टॉक अलर्ट सीमा (Default Low Stock Threshold):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={settingsDraft.defaultLowStockThreshold}
                  onChange={e =>
                    setSettingsDraft(prev => ({
                      ...prev,
                      defaultLowStockThreshold: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-sm focus:ring-2 focus:ring-[#2D5A27] focus:outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">
                  यदि किसी पैक साइज का बिक्री योग्य स्टॉक इस संख्या से कम या बराबर होगा तो अलर्ट दिखेगा (डिफ़ॉल्ट: 10)।
                </p>
              </div>

              <div>
                <label className="font-extrabold text-gray-700 block mb-1">
                  एक्सपायरी अग्रिम चेतावनी अवधि (दिनों में — डिफ़ॉल्ट 122 दिन = 4 माह):
                </label>
                <input
                  type="number"
                  min="15"
                  step="1"
                  required
                  value={settingsDraft.expiryWarningDays}
                  onChange={e =>
                    setSettingsDraft(prev => ({
                      ...prev,
                      expiryWarningDays: Math.max(15, Number(e.target.value) || 122),
                    }))
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-sm focus:ring-2 focus:ring-[#2D5A27] focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.blockExpiredSale}
                  onChange={e =>
                    setSettingsDraft(prev => ({ ...prev, blockExpiredSale: e.target.checked }))
                  }
                  className="mt-0.5 rounded text-[#2D5A27]"
                />
                <div>
                  <span className="font-extrabold text-gray-900 block">एक्सपायर्ड बैच बिक्री रोकें (अनुशंसित)</span>
                  <span className="text-[10px] text-gray-500">तिथि पार हो चुके बैच POS बिलिंग से अपने-आप ब्लॉक रहेंगे।</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.autoOpenPackOnLooseSale}
                  onChange={e =>
                    setSettingsDraft(prev => ({ ...prev, autoOpenPackOnLooseSale: e.target.checked }))
                  }
                  className="mt-0.5 rounded text-[#2D5A27]"
                />
                <div>
                  <span className="font-extrabold text-gray-900 block">खुली बिक्री पर सीलबंद पैक स्वचालित खोलें (FEFO)</span>
                  <span className="text-[10px] text-gray-500">खुला स्टॉक कम होने पर सबसे पहले एक्सपायर होने वाला वैध बैच खुलेगा।</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.allowNegativeStock}
                  onChange={e =>
                    setSettingsDraft(prev => ({ ...prev, allowNegativeStock: e.target.checked }))
                  }
                  className="mt-0.5 rounded text-[#2D5A27]"
                />
                <div>
                  <span className="font-extrabold text-gray-900 block">स्टॉक 0 होने के बाद भी बिलिंग की अनुमति (Negative Stock)</span>
                  <span className="text-[10px] text-gray-500">सामान्यतः बंद रखें; चालू करने पर स्टॉक खत्म होने पर भी बिल बन सकेगा।</span>
                </div>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 py-2.5 bg-[#2D5A27] hover:bg-[#1f411b] text-white rounded-xl font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>सुरक्षित करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM MASTER TOGGLE ON/OFF */}
      {showToggleConfirmModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    pendingToggleTarget
                      ? 'bg-emerald-100 text-[#2D5A27]'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {pendingToggleTarget
                      ? 'स्टॉक मात्रा प्रबंधन चालू (ON) करें?'
                      : 'स्टॉक मात्रा प्रबंधन बंद (OFF) करें?'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {pendingToggleTarget
                      ? 'POS बिलिंग और Stock PDF अब पैक-वाइज़ मात्रा ट्रैक करेंगे'
                      : 'सभी उत्पाद असीमित स्टॉक मोड में लौट जाएंगे'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUpdatingToggle}
                onClick={() => setShowToggleConfirmModal(false)}
                className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingToggleTarget ? (
              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                  <div className="font-extrabold">चालू होने पर यह बदलाव लागू होंगे:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>हर पैकेजिंग साइज की मात्रा दर्ज व एडजस्ट कर सकेंगे।</li>
                    <li>POS बिक्री के बाद पैक/खुला स्टॉक अपने-आप घटेगा।</li>
                    <li>0 स्टॉक वाले पैक पर POS बिलिंग रुक जाएगी (Out of Stock)।</li>
                    <li>Admin Stock PDF में प्रत्येक पैक का उपलब्ध स्टॉक दिखेगा।</li>
                  </ul>
                </div>

                {legacyNonZeroStockCount > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                    <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>पुराना स्टॉक डेटा मिला ({legacyNonZeroStockCount} उत्पाद)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      डेटाबेस में {legacyNonZeroStockCount} उत्पादों पर पहले से पुरानी स्टॉक संख्या दर्ज है। क्या आप इसे रखकर चालू करना चाहते हैं या सभी को 0 से रीसेट करके ताज़ा ओपनिंग स्टॉक भरना चाहते हैं?
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isUpdatingToggle}
                    onClick={() => handleConfirmToggle(false)}
                    className="w-full py-2.5 px-4 bg-[#2D5A27] hover:bg-[#1f411b] text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingToggle ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {legacyNonZeroStockCount > 0
                        ? 'मौजूदा स्टॉक रखकर चालू (ON) करें'
                        : 'हाँ, स्टॉक प्रबंधन चालू (ON) करें'}
                    </span>
                  </button>

                  {legacyNonZeroStockCount > 0 && (
                    <button
                      type="button"
                      disabled={isUpdatingToggle}
                      onClick={() => handleConfirmToggle(true)}
                      className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>सभी पुराना स्टॉक 0 रीसेट करके चालू करें</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                  <div className="font-extrabold">बंद (OFF) करने पर:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>सभी उत्पाद असीमित स्टॉक की तरह काम करेंगे।</li>
                    <li>POS बिलिंग में कोई स्टॉक कटौती या रोक नहीं लगेगी।</li>
                    <li>Stock PDF में कोई भी स्टॉक मात्रा नहीं दिखेगी।</li>
                    <li>आपकी पहले से दर्ज स्टॉक संख्या सुरक्षित रहेगी (नष्ट नहीं होगी)।</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingToggle}
                    onClick={() => setShowToggleConfirmModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingToggle}
                    onClick={() => handleConfirmToggle(false)}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingToggle ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>हाँ, OFF करें</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingInventory;
