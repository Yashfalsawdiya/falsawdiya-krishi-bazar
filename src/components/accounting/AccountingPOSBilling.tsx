import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShoppingBag, Plus, Trash2, Search, UserCheck, AlertCircle, 
  CheckCircle2, Printer, Percent, ArrowRight, RefreshCw, 
  Phone, MapPin, IndianRupee, CreditCard, Wallet, UserPlus, X, FileText,
  ChevronDown, User, Smartphone, BookOpen, Scale, Banknote, Download,
  Droplet, Layers, Check, Sparkles, Calendar, Receipt, RotateCcw, AlertTriangle, Sprout
} from 'lucide-react';
import { 
  AccountingProduct, 
  AccountingCustomer, 
  AccountingSale,
  PackagingVariant 
} from '../../types/accounting';
import { 
  fetchAccountingProducts, 
  fetchAccountingCustomers, 
  createOfflineSale, 
  saveAccountingCustomer, 
  calculateBargainingAllocation,
  getNextPOSInvoiceNoPreview,
  fetchAccountingSaleById,
  resetTestAccountingData
} from '../../services/accountingService';
import { 
  getProductVariants, 
  normalizeToBaseUnit, 
  formatBaseUnitDisplay,
  formatPackEquivalent,
  getLooseRateOptions,
  calculateLooseMetrics,
  formatSaleItemInvoiceTitle,
  formatPackagingVariantString,
  detectProductPhysicalCategory
} from '../../utils/agriPackagingUtils';
import { PrintableSalesInvoice } from './PrintableSalesInvoice';
import { downloadSalesInvoicePDF } from '../../utils/salesInvoicePdfGenerator';
import { POSMonthlyHistory } from './POSMonthlyHistory';

interface Props {
  onSaleCreated?: (saleId: string) => void;
  onSaleComplete?: () => void;
  onOpenCustomerKhata?: (customerId: string) => void;
}

export const AccountingPOSBilling: React.FC<Props> = ({ onSaleCreated, onSaleComplete, onOpenCustomerKhata }) => {
  const [products, setProducts] = useState<AccountingProduct[]>([]);
  const [customers, setCustomers] = useState<AccountingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cart / Bill State
  interface CartItem {
    cartItemId: string; // unique item id
    productId: string;
    name: string;
    hindiName: string;
    unit: string;
    quantity: number; // For pack: pack count (1, 2, 3...). For loose: 1 line item
    costPrice: number; // Cost per 1 pack (₹350), or calculated loose cost (₹140)
    originalSellingPrice: number; // Selling price per 1 pack (₹400), or calculated loose price (₹160)
    currentStock: number;
    saleType?: 'pack' | 'loose';

    // Variant & Packaging Details
    variantId?: string;
    variantLabel?: string;
    variantName?: string;
    packagingType?: string; // "Bottle", "Packet", "Bag", "Pouch", etc.
    packSizeValue?: number; // 500
    packSizeUnit?: string; // "ml", "Ltr", "g", "kg"
    packSize?: number;
    packUnit?: string;
    packBaseQty?: number; // 500 (in base ml or g)
    packCount?: number; // 1, 2, 3...

    // Full pack standard pricing for loose proportional calculations
    fullPackCostPrice?: number;
    fullPackSellingPrice?: number;

    // Loose specific fields
    isLooseEditing?: boolean;
    looseQuantity?: number; // e.g. 50 (grams/ml)
    looseUnit?: string; // "ml" or "g"
    looseBaseQty?: number; // 50
    costPerBaseUnit?: number; // e.g. ₹2.80/g
    sellingPricePerBaseUnit?: number; // e.g. ₹3.00/g
    looseRateAmount?: number; // e.g. 30 (in ₹30 / 10 g)
    looseRateUnit?: string; // e.g. '10 g'
    looseRateDenominator?: number; // e.g. 10
    openedPackFromVariantId?: string;
    openedPackBaseQty?: number;
    openedPackDeducted?: boolean;

    batchNumber?: string;
    expiryDate?: string;
  }

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  
  // Loose & Spray/Bigha Dose Modal State
  const [looseModalProduct, setLooseModalProduct] = useState<AccountingProduct | null>(null);
  const [looseSelectedVariant, setLooseSelectedVariant] = useState<PackagingVariant | null>(null);
  const [looseMode, setLooseMode] = useState<'direct' | 'pump' | 'bigha'>('direct');
  const [looseDirectQty, setLooseDirectQty] = useState<string>('50');
  const [looseDirectUnit, setLooseDirectUnit] = useState<string>('g');
  const [looseTankSize, setLooseTankSize] = useState<string>('15');
  const [loosePumpCount, setLoosePumpCount] = useState<string>('3');
  const [looseDosePerPump, setLooseDosePerPump] = useState<string>('35');
  const [looseBighaCount, setLooseBighaCount] = useState<string>('5');
  const [looseDosePerBigha, setLooseDosePerBigha] = useState<string>('5');
  const [looseBighaUnit, setLooseBighaUnit] = useState<string>('kg');
  const [looseCustomPrice, setLooseCustomPrice] = useState<string>('');
  const [looseModalRateUnit, setLooseModalRateUnit] = useState<string>('10 g');
  const [looseModalRateMultiplier, setLooseModalRateMultiplier] = useState<number>(10);
  const [looseModalCostPerBase, setLooseModalCostPerBase] = useState<number>(0);
  
  // Quick Add Customer modal
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustVillage, setNewCustVillage] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState(10000);

  // Product Search / Selector
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Bargaining / Negotiation Input
  const [customFinalTotalInput, setCustomFinalTotalInput] = useState<string>('');
  const [isFinalAmountManuallyEdited, setIsFinalAmountManuallyEdited] = useState<boolean>(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'udhari' | 'split'>('cash');
  const [cashPaidInput, setCashPaidInput] = useState<string>('');
  const [onlinePaidInput, setOnlinePaidInput] = useState<string>('');
  const [billNote, setBillNote] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Success / Print Modal
  const [completedSale, setCompletedSale] = useState<AccountingSale | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'billing' | 'history'>('billing');

  // Professional Bill Numbering & Reset Modal
  const [nextBillNumberPreview, setNextBillNumberPreview] = useState<string>('FKB-0001');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const refreshBillPreview = async () => {
    try {
      const preview = await getNextPOSInvoiceNoPreview();
      setNextBillNumberPreview(preview);
    } catch (err) {
      console.warn('Could not load next bill preview:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, custs] = await Promise.all([
        fetchAccountingProducts(),
        fetchAccountingCustomers(),
      ]);
      setProducts(prods);
      setCustomers(custs);
      await refreshBillPreview();
    } catch (err) {
      console.error('Error loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    refreshBillPreview();
  }, []);

  const handleResetTestData = async () => {
    setIsResetting(true);
    try {
      const result = await resetTestAccountingData();
      await loadData();
      await refreshBillPreview();
      setShowResetConfirmModal(false);
      setResetSuccessMessage(`सफलतापूर्वक रीसेट किया गया! कुल ${result.deletedSalesCount} टेस्ट बिक्री बिल हटा दिए गए। अगला बिल #FKB-0001 से शुरू होगा।`);
      if (onSaleComplete) {
        onSaleComplete();
      }
    } catch (err: any) {
      alert('डेटा रीसेट करने में त्रुटि: ' + (err.message || err));
    } finally {
      setIsResetting(false);
    }
  };

  // Filtered Products for Quick Add
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = productSearchQuery.toLowerCase().trim();
      if (!q) return matchesCat;
      return matchesCat && (
        p.hindiName.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.customId && p.customId.toLowerCase().includes(q))
      );
    });
  }, [products, selectedCategory, productSearchQuery]);

  // Selected Customer Object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered Customers for Search
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return customers.slice(0, 10);
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q) || 
      (c.village && c.village.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [customers, customerSearchQuery]);

  // Add Item to Cart (Pack / Packaging Variant - SELECTED PACKAGING = DEFAULT SALE UNIT)
  const addItemToCart = (p: AccountingProduct, variant?: PackagingVariant) => {
    const variants = getProductVariants(p);
    const chosenVariant = variant || (variants.length === 1 ? variants[0] : null);

    const variantId = chosenVariant ? chosenVariant.id : undefined;
    // CRITICAL: Ensure unique cartItemId per variant so different pack sizes are NEVER merged!
    const variantKey = variantId || (chosenVariant ? `${chosenVariant.sizeValue}${chosenVariant.sizeUnit}_${chosenVariant.packagingType}` : 'base');
    const cartItemId = `${p.id}_${variantKey}_pack`;

    setCartItems(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === cartItemId 
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                packCount: (item.packCount || item.quantity) + 1,
              }
            : item
        );
      }

      // Detect packaging details
      const packagingType = chosenVariant?.packagingType || (p.unit === 'Ltr' || p.unit === 'Ml' ? 'Bottle' : (p.unit === 'Kg' ? 'Bag' : p.unit || 'Pack'));
      const packSizeValue = chosenVariant?.sizeValue || (p.unit === 'Ltr' || p.unit === 'Kg' ? 1 : undefined);
      const packSizeUnit = chosenVariant?.sizeUnit || p.unit;
      
      let packBaseQty = chosenVariant?.baseQuantity;
      if (!packBaseQty && packSizeValue && packSizeUnit) {
        packBaseQty = normalizeToBaseUnit(packSizeValue, packSizeUnit);
      }

      const variantLabel = formatPackagingVariantString({
        sizeValue: packSizeValue,
        sizeUnit: packSizeUnit,
        packagingType: packagingType,
        variantLabel: chosenVariant?.label,
      }) || (chosenVariant ? (chosenVariant.label || `${chosenVariant.sizeValue} ${chosenVariant.sizeUnit} (${packagingType})`) : `${p.name} (${packagingType})`);

      // Purchase Cost & Selling Price per PACK (NOT per ml or per gram!)
      const costPrice = chosenVariant ? (chosenVariant.costPrice || p.costPrice || 0) : (p.costPrice || 0);
      const originalSellingPrice = chosenVariant ? (chosenVariant.sellingPrice || p.defaultSellingPrice || p.costPrice || 0) : (p.defaultSellingPrice || p.costPrice || 0);
      const currentStock = chosenVariant ? (chosenVariant.currentStockPacks ?? p.currentStock ?? 0) : (p.currentStock || 0);

      // Packaging unit (e.g. "Bottle", "Packet", "Bag")
      const displayUnit = packagingType;

      const firstBatch = p.batches && p.batches.length > 0 ? p.batches[0] : undefined;

      return [
        ...prev,
        {
          cartItemId,
          productId: p.id,
          name: p.name,
          hindiName: p.hindiName,
          unit: displayUnit,
          quantity: 1, // 1 complete pack / 1 Bottle
          packCount: 1,
          costPrice, // e.g. ₹350 per 500 ml Bottle
          originalSellingPrice, // e.g. ₹400 per 500 ml Bottle
          fullPackCostPrice: costPrice,
          fullPackSellingPrice: originalSellingPrice,
          currentStock,
          variantId,
          variantLabel,
          variantName: variantLabel,
          packagingType,
          packSizeValue,
          packSizeUnit,
          packSize: packSizeValue,
          packUnit: packSizeUnit,
          packBaseQty,
          batchNumber: firstBatch?.batchNumber,
          expiryDate: firstBatch?.expiryDate,
          saleType: 'pack',
        },
      ];
    });
  };

  // Switch a pack item in cart to loose sale with proportional pricing
  const switchToLooseSale = (cartItemId: string, targetLooseQty?: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;

      const isLiquid = item.packSizeUnit === 'ml' || item.packSizeUnit === 'Ltr' || item.unit === 'Bottle' || item.unit === 'Ml' || item.unit === 'Ltr';
      const baseUnit: 'g' | 'ml' = isLiquid ? 'ml' : 'g';

      let packBase = item.packBaseQty;
      if (!packBase || packBase <= 0) {
        packBase = normalizeToBaseUnit(item.packSizeValue || 1, item.packSizeUnit || (isLiquid ? 'Ltr' : 'kg'));
      }
      if (!packBase || packBase <= 0) {
        packBase = 250; // fallback
      }

      // Proportional cost per base unit (e.g. ₹700 / 250 g = ₹2.80/g)
      const fullCost = item.fullPackCostPrice || item.costPrice || 0;
      const costPerBaseUnit = packBase > 0 ? Number((fullCost / packBase).toFixed(4)) : 0;

      // Selling rate setup: default derived from pack selling price
      const fullPrice = item.fullPackSellingPrice || item.originalSellingPrice || fullCost;
      const defaultPricePerBase = packBase > 0 ? Number((fullPrice / packBase).toFixed(4)) : Number((costPerBaseUnit * 1.15).toFixed(4));

      // Default rate unit: 10 g for powder, 10 ml for liquid
      const defaultRateUnit = baseUnit === 'g' ? '10 g' : '10 ml';
      const defaultMultiplier = 10;
      const defaultRateAmount = Math.round(defaultPricePerBase * defaultMultiplier * 100) / 100;
      const effectivePricePerBase = defaultMultiplier > 0 ? (defaultRateAmount / defaultMultiplier) : defaultPricePerBase;

      // Desired loose quantity (e.g. 50 g for 250g pack, or targetLooseQty)
      let looseQty = targetLooseQty;
      if (!looseQty || looseQty <= 0) {
        if (packBase >= 500) {
          looseQty = 100;
        } else if (packBase >= 200) {
          looseQty = 50;
        } else {
          looseQty = Math.max(10, Math.round(packBase / 2));
        }
      }

      return {
        ...item,
        saleType: 'loose',
        isLooseEditing: true,
        unit: baseUnit,
        quantity: looseQty, // actual loose quantity (e.g. 50)
        costPrice: costPerBaseUnit, // cost per base unit (e.g. 2.80)
        originalSellingPrice: effectivePricePerBase, // selling price per base unit (e.g. 3.00)
        looseQuantity: looseQty,
        looseUnit: baseUnit,
        looseBaseQty: looseQty,
        costPerBaseUnit,
        sellingPricePerBaseUnit: effectivePricePerBase,
        looseRateAmount: defaultRateAmount, // e.g. 30
        looseRateUnit: defaultRateUnit, // e.g. '10 g'
        looseRateDenominator: defaultMultiplier, // e.g. 10
        openedPackFromVariantId: item.variantId,
        openedPackBaseQty: packBase,
      };
    }));
  };

  // Update loose quantity for an item in loose mode
  const updateLooseQty = (cartItemId: string, newLooseQty: number) => {
    if (newLooseQty <= 0) return;
    setCartItems(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;

      const isLargeUnit = item.looseUnit === 'kg' || item.looseUnit === 'L' || item.looseUnit === 'Ltr' || item.looseUnit === 'लीटर' || item.looseUnit === 'किलो';
      const unitMultiplier = isLargeUnit ? 1000 : 1;
      const looseBaseQty = newLooseQty * unitMultiplier;

      const costPerBase = item.costPerBaseUnit || 0;
      const pricePerBase = item.sellingPricePerBaseUnit || 0;

      const effectiveCost = Math.round(costPerBase * unitMultiplier * 10000) / 10000;
      const effectivePrice = Math.round(pricePerBase * unitMultiplier * 100) / 100;

      return {
        ...item,
        quantity: newLooseQty,
        looseQuantity: newLooseQty,
        looseBaseQty,
        costPrice: effectiveCost,
        originalSellingPrice: effectivePrice,
      };
    }));
  };

  // Update loose rate amount (e.g. changing 30 in ₹30 / 10 g or 28 in ₹28 / 1 kg)
  const updateLooseRateAmount = (cartItemId: string, newRateAmount: number) => {
    const rateAmt = Math.max(0, newRateAmount);
    setCartItems(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;

      const mult = item.looseRateDenominator || 1;
      const pricePerBase = mult > 0 ? (rateAmt / mult) : rateAmt;

      const isLargeUnit = item.looseUnit === 'kg' || item.looseUnit === 'L' || item.looseUnit === 'Ltr' || item.looseUnit === 'लीटर' || item.looseUnit === 'किलो';
      const unitMultiplier = isLargeUnit ? 1000 : 1;
      const effectivePrice = Math.round(pricePerBase * unitMultiplier * 100) / 100;

      return {
        ...item,
        looseRateAmount: rateAmt,
        sellingPricePerBaseUnit: pricePerBase,
        originalSellingPrice: effectivePrice,
      };
    }));
  };

  // Update loose rate unit (e.g. switching from / 10 g to / 100 g or / 1 kg)
  const updateLooseRateUnit = (cartItemId: string, newUnitLabel: string) => {
    setCartItems(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;

      const isLiquid = item.looseUnit === 'ml' || item.looseUnit === 'L' || item.looseUnit === 'Ltr' || item.unit === 'ml' || item.unit === 'Ltr';
      const options = getLooseRateOptions(isLiquid ? 'ml' : 'g');
      const chosenOpt = options.find(o => o.label === newUnitLabel) || options[0];

      // Current selling price per base unit
      const currentPricePerBase = item.sellingPricePerBaseUnit || 0;

      // Automatically convert rate amount to the new unit
      const newRateAmount = Math.round(currentPricePerBase * chosenOpt.multiplier * 100) / 100;
      const newPricePerBase = chosenOpt.multiplier > 0 ? (newRateAmount / chosenOpt.multiplier) : currentPricePerBase;

      const isLargeUnit = item.looseUnit === 'kg' || item.looseUnit === 'L' || item.looseUnit === 'Ltr';
      const unitMultiplier = isLargeUnit ? 1000 : 1;
      const effectivePrice = Math.round(newPricePerBase * unitMultiplier * 100) / 100;

      return {
        ...item,
        looseRateUnit: chosenOpt.label,
        looseRateDenominator: chosenOpt.multiplier,
        looseRateAmount: newRateAmount,
        sellingPricePerBaseUnit: newPricePerBase,
        originalSellingPrice: effectivePrice,
      };
    }));
  };

  // Direct line total setter (e.g. customer wants ₹150 worth of medicine)
  const updateLooseLineTotal = (cartItemId: string, totalAmount: number) => {
    const total = Math.max(0, totalAmount);
    setCartItems(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;

      const qty = item.looseQuantity || item.quantity || 1;
      const isLargeUnit = item.looseUnit === 'kg' || item.looseUnit === 'L' || item.looseUnit === 'Ltr';
      const unitMultiplier = isLargeUnit ? 1000 : 1;
      const baseQty = qty * unitMultiplier;

      const pricePerBase = baseQty > 0 ? (total / baseQty) : 0;
      const mult = item.looseRateDenominator || 1;
      const rateAmt = Math.round(pricePerBase * mult * 100) / 100;
      const effectivePrice = Math.round(pricePerBase * unitMultiplier * 100) / 100;

      return {
        ...item,
        looseRateAmount: rateAmt,
        sellingPricePerBaseUnit: pricePerBase,
        originalSellingPrice: effectivePrice,
      };
    }));
  };

  // Revert loose item back to full sealed pack
  const revertToPackSale = (cartItemId: string) => {
    setCartItems(prev => prev.map(item => {
      if (item.cartItemId !== cartItemId) return item;

      return {
        ...item,
        saleType: 'pack',
        isLooseEditing: false,
        unit: item.packagingType || 'Pack',
        quantity: 1,
        packCount: 1,
        costPrice: item.fullPackCostPrice || item.costPrice,
        originalSellingPrice: item.fullPackSellingPrice || item.originalSellingPrice,
        looseQuantity: undefined,
        looseUnit: undefined,
        looseBaseQty: undefined,
        looseRateAmount: undefined,
        looseRateUnit: undefined,
        looseRateDenominator: undefined,
        costPerBaseUnit: undefined,
        sellingPricePerBaseUnit: undefined,
        openedPackFromVariantId: undefined,
        openedPackBaseQty: undefined,
      };
    }));
  };

  // Select which packaging variant to open/cost from
  const handleSelectPackVariant = (variant: PackagingVariant) => {
    setLooseSelectedVariant(variant);
    if (!looseModalProduct) return;
    const catInfo = detectProductPhysicalCategory(looseModalProduct);

    let packBase = variant.baseQuantity;
    if (!packBase || packBase <= 0) {
      if (variant.sizeValue && variant.sizeUnit) {
        packBase = normalizeToBaseUnit(variant.sizeValue, variant.sizeUnit);
      } else {
        packBase = normalizeToBaseUnit(1, looseModalProduct.unit || catInfo.baseUnit);
      }
    }
    if (!packBase || packBase <= 0) packBase = catInfo.baseUnit === 'ml' ? 500 : 1000;

    const fullCost = variant.costPrice || looseModalProduct.costPrice || 0;
    const costPerBase = packBase > 0 ? Number((fullCost / packBase).toFixed(6)) : (looseModalProduct.looseStock?.costPerBaseUnit || 0);
    setLooseModalCostPerBase(costPerBase);

    // Update selling rate matching variant proportional price
    const fullSelling = variant.sellingPrice || looseModalProduct.defaultSellingPrice || (fullCost * 1.15);
    const sellingPerBase = packBase > 0 ? Number((fullSelling / packBase).toFixed(6)) : Number((costPerBase * 1.15).toFixed(6));
    const newRateAmt = Math.round(sellingPerBase * looseModalRateMultiplier * 100) / 100;
    setLooseCustomPrice(String(newRateAmt));
  };

  // Switch rate unit without altering underlying per-base rate
  const handleModalRateUnitChange = (newUnitLabel: string) => {
    if (!looseModalProduct) return;
    const catInfo = detectProductPhysicalCategory(looseModalProduct);
    const opts = getLooseRateOptions(catInfo.baseUnit);
    const newOpt = opts.find(o => o.label === newUnitLabel) || opts[0];

    const currentPricePerBase = looseModalRateMultiplier > 0
      ? (Number(looseCustomPrice) || 0) / looseModalRateMultiplier
      : (Number(looseCustomPrice) || 0);

    const convertedRateAmt = Math.round(currentPricePerBase * newOpt.multiplier * 100) / 100;
    setLooseModalRateUnit(newOpt.label);
    setLooseModalRateMultiplier(newOpt.multiplier);
    setLooseCustomPrice(String(convertedRateAmt));
  };

  // Open Loose / Spray Dose Modal
  const openLooseDoseModal = (p: AccountingProduct) => {
    setLooseModalProduct(p);
    const catInfo = detectProductPhysicalCategory(p);
    const variants = getProductVariants(p);
    const firstVariant = variants.length > 0 ? variants[0] : null;
    setLooseSelectedVariant(firstVariant);

    let packBase = firstVariant?.baseQuantity;
    if (!packBase || packBase <= 0) {
      if (firstVariant?.sizeValue && firstVariant?.sizeUnit) {
        packBase = normalizeToBaseUnit(firstVariant.sizeValue, firstVariant.sizeUnit);
      } else {
        packBase = normalizeToBaseUnit(1, p.unit || catInfo.baseUnit);
      }
    }
    if (!packBase || packBase <= 0) packBase = catInfo.baseUnit === 'ml' ? 500 : 1000;

    const fullCost = firstVariant?.costPrice || p.costPrice || 0;
    const costPerBase = packBase > 0 ? Number((fullCost / packBase).toFixed(6)) : (p.looseStock?.costPerBaseUnit || 0);
    setLooseModalCostPerBase(costPerBase);

    const fullSelling = firstVariant?.sellingPrice || p.defaultSellingPrice || (fullCost * 1.15);
    const sellingPerBase = packBase > 0 ? Number((fullSelling / packBase).toFixed(6)) : (p.looseStock?.sellingPricePerBaseUnit || Number((costPerBase * 1.15).toFixed(6)));

    const defaultUnit = catInfo.defaultUnit;
    setLooseDirectUnit(defaultUnit);
    setLooseBighaUnit(catInfo.physicalType === 'liquid' ? (defaultUnit === 'L' ? 'L' : 'ml') : (defaultUnit === 'kg' ? 'kg' : 'g'));

    if (defaultUnit === 'kg') {
      setLooseDirectQty('25');
    } else if (defaultUnit === 'L') {
      setLooseDirectQty('1');
    } else if (defaultUnit === 'ml') {
      setLooseDirectQty('100');
    } else {
      setLooseDirectQty('50');
    }

    setLooseMode('direct');

    // Tank & Pump settings
    setLooseTankSize('15');
    setLoosePumpCount('3');
    const defaultPumpDose = p.standardDoseInfo?.verifiedDosePer20LTank || (catInfo.physicalType === 'liquid' ? 35 : 25);
    setLooseDosePerPump(String(defaultPumpDose));

    // Bigha settings
    setLooseBighaCount('5');
    if (p.standardDoseInfo?.verifiedDosePerBigha) {
      setLooseDosePerBigha(String(p.standardDoseInfo.verifiedDosePerBigha));
      if (p.standardDoseInfo.doseBighaUnit) {
        setLooseBighaUnit(p.standardDoseInfo.doseBighaUnit === 'Ltr' ? 'L' : p.standardDoseInfo.doseBighaUnit);
      }
    } else {
      const defaultBighaDose = catInfo.physicalType === 'liquid' ? '250' : (defaultUnit === 'kg' ? '5' : '500');
      setLooseDosePerBigha(defaultBighaDose);
    }

    // Rate Options
    const rateOptions = getLooseRateOptions(catInfo.baseUnit);
    let defaultRateOpt = rateOptions[0];
    if (defaultUnit === 'kg') {
      defaultRateOpt = rateOptions.find(o => o.label === '1 kg') || rateOptions[0];
    } else if (defaultUnit === 'L') {
      defaultRateOpt = rateOptions.find(o => o.label === '1 L') || rateOptions[0];
    } else if (catInfo.baseUnit === 'ml') {
      defaultRateOpt = rateOptions.find(o => o.label === '100 ml' || o.label === '10 ml') || rateOptions[0];
    } else {
      defaultRateOpt = rateOptions.find(o => o.label === '10 g' || o.label === '100 g') || rateOptions[0];
    }

    setLooseModalRateUnit(defaultRateOpt.label);
    setLooseModalRateMultiplier(defaultRateOpt.multiplier);
    const defaultRateAmt = Math.round(sellingPerBase * defaultRateOpt.multiplier * 100) / 100;
    setLooseCustomPrice(String(defaultRateAmt));
  };

  // Confirm and Add Loose Item to Cart
  const handleConfirmLooseSale = () => {
    if (!looseModalProduct) return;
    const p = looseModalProduct;
    const catInfo = detectProductPhysicalCategory(p);

    let displayQty = 0;
    let displayUnit = '';
    let requestedBaseQty = 0;
    let label = '';

    if (looseMode === 'pump') {
      const pumps = Number(loosePumpCount) || 1;
      const dose = Number(looseDosePerPump) || (catInfo.physicalType === 'liquid' ? 35 : 25);
      const baseDoseQty = pumps * dose;
      requestedBaseQty = baseDoseQty;

      if (catInfo.physicalType === 'liquid') {
        if (baseDoseQty >= 1000 && baseDoseQty % 1000 === 0) {
          displayQty = baseDoseQty / 1000;
          displayUnit = 'L';
        } else {
          displayQty = baseDoseQty;
          displayUnit = 'ml';
        }
      } else {
        if (baseDoseQty >= 1000 && baseDoseQty % 1000 === 0) {
          displayQty = baseDoseQty / 1000;
          displayUnit = 'kg';
        } else {
          displayQty = baseDoseQty;
          displayUnit = 'g';
        }
      }
      label = `डोज: ${pumps} पंप (${displayQty} ${displayUnit})`;
    } else if (looseMode === 'bigha') {
      const bighas = Number(looseBighaCount) || 1;
      const dose = Number(looseDosePerBigha) || 1;
      const totalInBighaUnit = Math.round(bighas * dose * 100) / 100;
      displayQty = totalInBighaUnit;
      displayUnit = looseBighaUnit;

      const isLargeUnit = displayUnit === 'kg' || displayUnit === 'L' || displayUnit === 'Ltr';
      requestedBaseQty = isLargeUnit ? totalInBighaUnit * 1000 : totalInBighaUnit;
      label = `डोज: ${bighas} बीघा (${displayQty} ${displayUnit})`;
    } else {
      displayQty = Number(looseDirectQty) || 0;
      displayUnit = looseDirectUnit;
      const isLargeUnit = displayUnit === 'kg' || displayUnit === 'L' || displayUnit === 'Ltr';
      requestedBaseQty = isLargeUnit ? displayQty * 1000 : displayQty;
      label = `खुला बिक्री (${displayQty} ${displayUnit})`;
    }

    if (requestedBaseQty <= 0) {
      alert('कृपया मान्य मात्रा दर्ज करें।');
      return;
    }

    const rateAmt = Number(looseCustomPrice) || 0;
    const multiplier = looseModalRateMultiplier || 1;
    const sellingPricePerBaseUnit = multiplier > 0 ? (rateAmt / multiplier) : rateAmt;
    const costPerBaseUnit = looseModalCostPerBase || 0;

    const isLarge = displayUnit === 'kg' || displayUnit === 'L' || displayUnit === 'Ltr';
    const displayMultiplier = isLarge ? 1000 : 1;

    const effectiveSellingPrice = Math.round(sellingPricePerBaseUnit * displayMultiplier * 100) / 100;
    const effectiveCostPrice = Math.round(costPerBaseUnit * displayMultiplier * 10000) / 10000;

    const cartItemId = `${p.id}_loose_${Date.now()}`;
    const selectedVariant = looseSelectedVariant;
    const openedPackVariant = selectedVariant || (p.packagingVariants && p.packagingVariants[0]);

    setCartItems(prev => [
      ...prev,
      {
        cartItemId,
        productId: p.id,
        name: p.name,
        hindiName: p.hindiName,
        unit: displayUnit,
        quantity: displayQty,
        costPrice: effectiveCostPrice,
        originalSellingPrice: effectiveSellingPrice,
        costPerBaseUnit,
        sellingPricePerBaseUnit,
        looseQuantity: displayQty,
        looseUnit: displayUnit,
        looseBaseQty: requestedBaseQty,
        looseRateAmount: rateAmt,
        looseRateUnit: looseModalRateUnit,
        looseRateDenominator: multiplier,
        currentStock: p.looseStock?.availableBaseQty || 0,
        saleType: 'loose' as const,
        variantId: openedPackVariant?.id,
        variantLabel: label,
        openedPackFromVariantId: openedPackVariant?.id,
        packSizeValue: openedPackVariant?.sizeValue,
        packSizeUnit: openedPackVariant?.sizeUnit,
        packagingType: openedPackVariant?.packagingType,
        fullPackCostPrice: openedPackVariant ? (openedPackVariant.costPrice || p.costPrice) : p.costPrice,
        fullPackSellingPrice: openedPackVariant ? (openedPackVariant.sellingPrice || p.defaultSellingPrice) : p.defaultSellingPrice,
      }
    ]);

    setLooseModalProduct(null);
  };

  const updateItemQty = (cartItemId: string, qty: number) => {
    if (qty <= 0) {
      removeItemFromCart(cartItemId);
      return;
    }
    setCartItems(prev => prev.map(it => it.cartItemId === cartItemId ? { ...it, quantity: qty, packCount: it.saleType !== 'loose' ? qty : undefined } : it));
  };

  const updateItemPrice = (cartItemId: string, price: number) => {
    setCartItems(prev => prev.map(it => it.cartItemId === cartItemId ? { ...it, originalSellingPrice: Math.max(0, price) } : it));
  };

  const removeItemFromCart = (cartItemId: string) => {
    setCartItems(prev => prev.filter(it => it.cartItemId !== cartItemId));
  };

  // Base Calculation without bargaining (Total MRP)
  const subtotalBeforeBargain = useMemo(() => {
    return Math.round(cartItems.reduce((acc, it) => acc + (it.quantity * it.originalSellingPrice), 0) * 100) / 100;
  }, [cartItems]);

  // Keep customFinalTotalInput synced with Total MRP when in automatic mode (no manual edit)
  useEffect(() => {
    if (cartItems.length === 0) {
      setIsFinalAmountManuallyEdited(false);
      setCustomFinalTotalInput('');
      return;
    }

    // If Admin has NOT manually edited the final amount, maintain LIVE SYNC with Total MRP
    if (!isFinalAmountManuallyEdited) {
      setCustomFinalTotalInput(subtotalBeforeBargain > 0 ? String(subtotalBeforeBargain) : '');
    }
  }, [cartItems.length, subtotalBeforeBargain, isFinalAmountManuallyEdited]);

  // Reset to live MRP sync handler
  const handleResetFinalAmountToMRP = () => {
    setIsFinalAmountManuallyEdited(false);
    setCustomFinalTotalInput(subtotalBeforeBargain > 0 ? String(subtotalBeforeBargain) : '');
  };

  const handleFinalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIsFinalAmountManuallyEdited(true);
    setCustomFinalTotalInput(val);
  };

  const handleFinalAmountBlur = () => {
    // If Admin clears the field or leaves it empty/zero, revert to live MRP sync
    if (!customFinalTotalInput || customFinalTotalInput.trim() === '' || Number(customFinalTotalInput) === 0) {
      setIsFinalAmountManuallyEdited(false);
      setCustomFinalTotalInput(subtotalBeforeBargain > 0 ? String(subtotalBeforeBargain) : '');
    } else if (Number(customFinalTotalInput) === subtotalBeforeBargain) {
      // If Admin typed the exact MRP, revert to live auto-sync mode
      setIsFinalAmountManuallyEdited(false);
    }
  };

  const negotiatedTotalNumber = useMemo(() => {
    if (cartItems.length === 0 || subtotalBeforeBargain <= 0) {
      return 0;
    }
    // If not manually edited, always strictly live-sync with Total MRP
    if (!isFinalAmountManuallyEdited) {
      return subtotalBeforeBargain;
    }
    if (!customFinalTotalInput || customFinalTotalInput.trim() === '') {
      return subtotalBeforeBargain;
    }
    const val = Number(customFinalTotalInput);
    return (isNaN(val) || val <= 0) ? subtotalBeforeBargain : val;
  }, [cartItems.length, subtotalBeforeBargain, isFinalAmountManuallyEdited, customFinalTotalInput]);

  // Proportional Allocation Calculations
  const allocation = useMemo(() => {
    return calculateBargainingAllocation(cartItems, negotiatedTotalNumber);
  }, [cartItems, negotiatedTotalNumber]);

  // Auto calculate Split amounts
  const calculatedFinalTotal = allocation.finalTotal;

  useEffect(() => {
    if (paymentMode === 'cash') {
      setCashPaidInput(String(calculatedFinalTotal));
      setOnlinePaidInput('0');
    } else if (paymentMode === 'online') {
      setCashPaidInput('0');
      setOnlinePaidInput(String(calculatedFinalTotal));
    } else if (paymentMode === 'udhari') {
      setCashPaidInput('0');
      setOnlinePaidInput('0');
    }
  }, [paymentMode, calculatedFinalTotal]);

  const cashPaidVal = Number(cashPaidInput) || 0;
  const onlinePaidVal = Number(onlinePaidInput) || 0;
  const totalPaidNow = cashPaidVal + onlinePaidVal;
  const udhariRemaining = Math.max(0, calculatedFinalTotal - totalPaidNow);

  // Quick Add Customer Handler
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('कृपया ग्राहक का नाम दर्ज करें।');
      return;
    }
    try {
      const newId = await saveAccountingCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        village: newCustVillage.trim(),
        totalPurchases: 0,
        totalPaid: 0,
        currentOutstanding: 0,
        creditLimit: Number(newCustCreditLimit) || 10000,
        status: 'good',
      });
      const updatedCusts = await fetchAccountingCustomers();
      setCustomers(updatedCusts);
      setSelectedCustomerId(newId);
      setShowQuickCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustVillage('');
    } catch (err: any) {
      alert('ग्राहक जोड़ने में त्रुटि: ' + err.message);
    }
  };

  // Submit Sale Handler
  const handleCreateSale = async () => {
    if (cartItems.length === 0) {
      alert('कृपया बिल में कम से कम एक उत्पाद जोड़ें।');
      return;
    }

    if (udhariRemaining > 0 && !selectedCustomerId) {
      alert('उधारी बिल के लिए कृपया ग्राहक का चयन करें या नया ग्राहक जोड़ें।');
      return;
    }

    // Check Credit Limit
    if (selectedCustomer && udhariRemaining > 0) {
      const projectedOutstanding = selectedCustomer.currentOutstanding + udhariRemaining;
      if (projectedOutstanding > selectedCustomer.creditLimit) {
        const proceed = window.confirm(
          `चेतावनी: ग्राहक की उधारी सीमा (Credit Limit: ₹${selectedCustomer.creditLimit}) पार हो रही है!\n\nवर्तमान उधारी: ₹${selectedCustomer.currentOutstanding}\nनया बिल उधारी: ₹${udhariRemaining}\nकुल अनुमानित: ₹${projectedOutstanding}\n\nक्या आप फिर भी यह उधारी बिल काटना चाहते हैं?`
        );
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);
    try {
      const salePayload: Omit<AccountingSale, 'id' | 'createdAt'> = {
        invoiceNo: '', // Automatically assigned as sequential FKB-XXXX by atomic transaction
        date: invoiceDate,
        timestamp: Date.now(),
        customerId: selectedCustomerId || null,
        customerName: selectedCustomer ? selectedCustomer.name : 'नकद ग्राहक (Retail Cash Customer)',
        customerPhone: selectedCustomer?.phone || '',
        customerVillage: selectedCustomer?.village || '',
        items: allocation.allocatedItems.map(it => {
          const matchingCartItem = cartItems.find(c => c.cartItemId === (it as any).cartItemId);
          const isPack = (matchingCartItem?.saleType || it.saleType) !== 'loose';
          return {
            ...it,
            saleType: matchingCartItem?.saleType || it.saleType || 'pack',
            variantId: matchingCartItem?.variantId || it.variantId,
            variantLabel: matchingCartItem?.variantLabel || it.variantLabel,
            variantName: matchingCartItem?.variantName || matchingCartItem?.variantLabel || it.variantLabel,
            packagingType: matchingCartItem?.packagingType || it.packagingType,
            packSizeValue: matchingCartItem?.packSizeValue || it.packSizeValue,
            packSizeUnit: matchingCartItem?.packSizeUnit || it.packSizeUnit,
            packSize: matchingCartItem?.packSizeValue || it.packSizeValue,
            packUnit: matchingCartItem?.packSizeUnit || it.packSizeUnit,
            packCount: isPack ? it.quantity : undefined,
            equivalentQuantityDisplay: (isPack && matchingCartItem?.packSizeValue)
              ? formatPackEquivalent(matchingCartItem.quantity, matchingCartItem.packSizeValue, matchingCartItem.packSizeUnit)
              : undefined,
            openedPackFromVariantId: matchingCartItem?.openedPackFromVariantId,
            openedPackBaseQty: matchingCartItem?.openedPackBaseQty,
            looseQuantity: matchingCartItem?.looseQuantity || it.looseQuantity,
            looseUnit: matchingCartItem?.looseUnit || it.looseUnit,
            looseBaseQty: matchingCartItem?.looseBaseQty || it.looseBaseQty,
            looseRateAmount: matchingCartItem?.looseRateAmount || it.looseRateAmount,
            looseRateUnit: matchingCartItem?.looseRateUnit || it.looseRateUnit,
            looseRateDenominator: matchingCartItem?.looseRateDenominator || it.looseRateDenominator,
            costPerBaseUnit: matchingCartItem?.costPerBaseUnit || it.costPerBaseUnit,
            sellingPricePerBaseUnit: matchingCartItem?.sellingPricePerBaseUnit || it.sellingPricePerBaseUnit,
          };
        }),
        subtotal: allocation.subtotal,
        bargainingDiscount: allocation.bargainingDiscount,
        finalTotal: allocation.finalTotal,
        totalCOGS: allocation.totalCOGS,
        grossProfit: allocation.grossProfit,
        grossMarginPercent: allocation.grossMarginPercent,
        paymentMode,
        cashPaid: cashPaidVal,
        onlinePaid: onlinePaidVal,
        udhariAmount: udhariRemaining,
        note: billNote.trim(),
      };

      const saleId = await createOfflineSale(salePayload);
      const savedSale = await fetchAccountingSaleById(saleId);

      setCompletedSale(
        savedSale || {
          ...salePayload,
          id: saleId,
          invoiceNo: nextBillNumberPreview,
          createdAt: Date.now(),
        }
      );

      // Immediately refresh next bill preview for the next customer
      refreshBillPreview();

      // Reset Form
      setCartItems([]);
      setSelectedCustomerId('');
      setCustomerSearchQuery('');
      setCustomFinalTotalInput('');
      setIsFinalAmountManuallyEdited(false);
      setBillNote('');
      
      // Refresh inventory & customers in background
      loadData();
      if (onSaleCreated) onSaleCreated(saleId);
      if (onSaleComplete) onSaleComplete();
    } catch (err: any) {
      alert('बिल सेव करने में त्रुटि: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!completedSale) return;
    setIsPrinting(true);
    document.body.classList.add('has-active-print');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('has-active-print');
        setIsPrinting(false);
      }, 600);
    }, 150);
  };

  const handleDownloadPdf = async () => {
    if (!completedSale) return;
    setIsDownloadingPdf(true);
    try {
      const res = await downloadSalesInvoicePDF(
        completedSale,
        selectedCustomer?.currentOutstanding || 0
      );
      if (!res.success && res.error) {
        alert('PDF जनरेट करने में त्रुटि: ' + res.error);
      }
    } catch (err: any) {
      alert('PDF डाउनलोड करने में त्रुटि: ' + err.message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#2D5A27] text-white rounded-xl flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">ऑफलाइन बिक्री काउंटर (Offline POS Billing)</h2>
            <p className="text-xs text-gray-500">त्वरित मल्टी-आइटम बिलिंग, स्वचालित स्टॉक कटौती एवं मोलभाव मार्जिन गणना</p>
          </div>
        </div>

        {/* Tab Selector & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Next Bill Number Preview Badge */}
          <div 
            id="pos-next-bill-badge"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold shadow-2xs"
            title="स्वचालित अनुक्रमिक बिल नंबर प्रणाली"
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>अगला बिल: <strong className="font-mono text-emerald-950 tracking-wide font-black">#{nextBillNumberPreview}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 w-full sm:w-auto">
            <button
              id="pos-tab-new-bill"
              onClick={() => setActiveTab('billing')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'billing'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>नया बिल बनाएं</span>
              {cartItems.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px]">
                  {cartItems.length}
                </span>
              )}
            </button>

            <button
              id="pos-tab-monthly-history"
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>नकद बिल इतिहास (Monthly History)</span>
            </button>
          </div>

          {activeTab === 'billing' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-emerald-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                title="डेटा रिफ्रेश करें"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                id="pos-reset-test-data-btn"
                onClick={() => setShowResetConfirmModal(true)}
                className="px-3 py-2 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
                title="टेस्टिंग डेटा रीसेट करें"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>टेस्ट डेटा रीसेट</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {resetSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{resetSuccessMessage}</span>
          </div>
          <button onClick={() => setResetSuccessMessage(null)} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'history' ? (
        <POSMonthlyHistory
          onBackToBilling={() => setActiveTab('billing')}
          onSaleDeleted={loadData}
        />
      ) : (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Product Catalog & Quick Add (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                उत्पाद चुनें (Select Products)
              </h3>
              <span className="text-xs text-gray-400 font-medium">
                {filteredProducts.length} उत्पाद उपलब्ध
              </span>
            </div>

            {/* Product Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="दवाई, बीज, खाद का नाम खोजें..."
                value={productSearchQuery}
                onChange={e => setProductSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {[
                { id: 'all', label: 'सभी' },
                { id: 'fertilizers', label: 'खाद' },
                { id: 'pesticides', label: 'कीटनाशक' },
                { id: 'seeds', label: 'बीज' },
                { id: 'fungicides', label: 'फफूंदनाशी' },
                { id: 'herbicides', label: 'खरपतवार' },
                { id: 'medicines', label: 'टॉनिक' },
                { id: 'implements', label: 'उपकरण' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Products List Scrollable */}
            <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
                  कोई उत्पाद नहीं मिला। कृपया इन्वेंट्री टैब में जाकर उत्पाद जोड़ें।
                </div>
              ) : (
                filteredProducts.map(prod => {
                  const variants = getProductVariants(prod);
                  const hasMultipleVariants = variants.length > 1;
                  const catInfo = detectProductPhysicalCategory(prod);
                  const isLiquidOrPowder = prod.unit === 'Ltr' || prod.unit === 'Ml' || prod.unit === 'Kg' || prod.unit === 'Gram' || prod.productType === 'liquid' || prod.productType === 'powder_granule' || prod.category === 'pesticides' || prod.category === 'fungicides' || prod.category === 'herbicides' || prod.category === 'medicines' || prod.category === 'fertilizers' || prod.category === 'seeds';
                  const allowLoose = prod.looseStock?.isAllowedForLooseSale ?? (isLiquidOrPowder || catInfo.physicalType === 'liquid' || catInfo.physicalType === 'solid' || catInfo.physicalType === 'seed');

                  const prodCartCount = cartItems
                    .filter(it => it.productId === prod.id)
                    .reduce((sum, it) => sum + it.quantity, 0);

                  return (
                    <div
                      key={prod.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        prodCartCount > 0
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                              {prod.hindiName || prod.name}
                            </h4>
                            {prodCartCount > 0 && (
                              <span className="bg-[#2D5A27] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                {prodCartCount} बिल में
                              </span>
                            )}
                          </div>
                          {prod.hindiName && prod.name && prod.hindiName !== prod.name && (
                            <p className="text-[10px] text-gray-400 truncate">{prod.name}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-extrabold text-emerald-800">
                              ₹{prod.defaultSellingPrice} /{prod.unit}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              (लागत: ₹{prod.costPrice})
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 block mb-1">
                            {prod.category}
                          </span>

                          {!hasMultipleVariants && (
                            <button
                              type="button"
                              onClick={() => addItemToCart(prod, variants[0])}
                              className="text-xs bg-[#2D5A27] text-white px-2.5 py-1 rounded-xl hover:bg-[#23461e] active:scale-95 transition-all font-bold flex items-center gap-1 ml-auto"
                            >
                              <Plus className="w-3.5 h-3.5" /> जोड़ें
                            </button>
                          )}
                        </div>
                      </div>

                      {/* PACKAGING VARIANTS CHIPS */}
                      {hasMultipleVariants && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100">
                          <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-emerald-700" />
                            पैकिंग विकल्प (Variants):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {variants.map(v => {
                              const vInCart = cartItems.find(it => it.cartItemId === `${prod.id}_${v.id}_pack`);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => addItemToCart(prod, v)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                                    vInCart
                                      ? 'bg-[#2D5A27] text-white border-[#2D5A27]'
                                      : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  <span>{v.label || `${v.sizeValue} ${v.sizeUnit}`}</span>
                                  <span className="font-extrabold">₹{v.sellingPrice || prod.defaultSellingPrice}</span>
                                  {vInCart && (
                                    <span className="bg-white/20 text-white px-1 rounded text-[9px]">
                                      ×{vInCart.quantity}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* LOOSE SALE / DOSE QUICK BUTTON */}
                      {allowLoose && (
                        <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => openLooseDoseModal(prod)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors inline-block"
                          >
                            <span>खुला बिक्री (Loose Sale)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Cart, Bargaining & Billing (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
            {/* Customer Selector Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  ग्राहक (Customer)
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + नया ग्राहक जोड़ें
                </button>
              </div>

              {/* Customer Search & Select */}
              <div className="relative" ref={customerDropdownRef}>
                <div 
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl cursor-pointer flex items-center justify-between text-xs sm:text-sm"
                >
                  {selectedCustomer ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-gray-900">{selectedCustomer.name}</span>
                      {selectedCustomer.phone && <span className="text-gray-500">({selectedCustomer.phone})</span>}
                      {selectedCustomer.village && <span className="text-gray-400">· {selectedCustomer.village}</span>}
                    </div>
                  ) : (
                    <span className="text-gray-400 font-medium">नकद ग्राहक (Retail Cash Customer) - क्लिक करके खाता चुनें</span>
                  )}
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    बदलें <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2 max-h-60 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="नाम या मोबाइल नंबर से खोजें..."
                      value={customerSearchQuery}
                      onChange={e => setCustomerSearchQuery(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    <div
                      onClick={() => {
                        setSelectedCustomerId('');
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="p-2 rounded-xl text-xs hover:bg-gray-50 cursor-pointer font-bold text-gray-600 border-b border-gray-100 flex items-center gap-1.5"
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span>बिना खाते के नकद ग्राहक (Retail Walk-in)</span>
                    </div>

                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="p-2.5 rounded-xl text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{c.name}</p>
                          <p className="text-[11px] text-gray-500">{c.phone} {c.village ? `· ${c.village}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${c.currentOutstanding > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            उधारी: ₹{c.currentOutstanding}
                          </p>
                          <p className="text-[10px] text-gray-400">लिमिट: ₹{c.creditLimit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Customer Outstanding Card */}
              {selectedCustomer && (
                <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                  selectedCustomer.currentOutstanding > selectedCustomer.creditLimit
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : selectedCustomer.currentOutstanding > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div>
                    <span className="font-bold">पिछली उधारी: ₹{selectedCustomer.currentOutstanding}</span>
                    <span className="text-[11px] ml-2 text-gray-600">
                      (लिमिट: ₹{selectedCustomer.creditLimit})
                    </span>
                  </div>
                  {onOpenCustomerKhata && (
                    <button
                      type="button"
                      onClick={() => onOpenCustomerKhata(selectedCustomer.id)}
                      className="underline font-bold text-xs"
                    >
                      खाता देखें →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center justify-between">
                <span>बिल की वस्तुएं ({cartItems.length} उत्पाद)</span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCartItems([]);
                      setIsFinalAmountManuallyEdited(false);
                      setCustomFinalTotalInput('');
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                  >
                    पूरी लिस्ट खाली करें
                  </button>
                )}
              </h3>

              {cartItems.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-gray-300" />
                  <span>बाईं तरफ से उत्पाद पर क्लिक करके बिल में जोड़ें</span>
                </div>
              ) : (
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {cartItems.map((item, idx) => {
                      const allocItem = allocation.allocatedItems[idx];
                      const lineTotal = item.quantity * item.originalSellingPrice;
                      const isLoose = item.saleType === 'loose';
                      const isPack = !isLoose;

                      // Equivalent quantity calculation for packs (e.g. 500 ml or 1.5 L)
                      const equivalentQtyStr = (isPack && item.packSizeValue)
                        ? formatPackEquivalent(item.quantity, item.packSizeValue, item.packSizeUnit)
                        : '';

                      // Packaging display label (e.g. "500 ml Bottle")
                      const packDisplayLabel = item.variantLabel || `${item.packSizeValue || ''} ${item.packSizeUnit || ''} ${item.packagingType || item.unit}`;

                      return (
                        <div
                          key={item.cartItemId}
                          className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-2.5 text-xs shadow-xs hover:border-gray-300 transition-colors"
                        >
                          {/* Top Header: Title, Variant Badge, Stock/Cost Info, Delete */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-gray-900 text-sm">
                                  {item.hindiName || item.name}
                                </h4>
                                
                                {/* Packaging Variant Badge */}
                                {isPack && (
                                  <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    {packDisplayLabel}
                                  </span>
                                )}

                                {/* Loose Badge */}
                                {isLoose && (
                                  <span className="text-[11px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                    खुला बिक्री ({item.looseQuantity || item.quantity} {item.looseUnit || item.unit})
                                  </span>
                                )}

                                {item.batchNumber && (
                                  <span className="text-[9px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                    बैच: {item.batchNumber}
                                  </span>
                                )}
                              </div>

                              {/* Pricing & Cost Transparency Display */}
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 flex-wrap">
                                {isPack ? (
                                  <>
                                    <span className="font-medium text-gray-600">
                                      लागत: <strong className="text-gray-800">₹{item.costPrice}</strong> / {packDisplayLabel}
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-gray-500">
                                      दर: ₹{item.originalSellingPrice} / {item.unit}
                                    </span>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-blue-700">
                                      खुली बिक्री: लागत <strong>₹{allocItem?.totalCost ?? Math.round((item.looseQuantity || item.quantity) * (item.costPrice || 0))}</strong>
                                      <span className="text-gray-500 font-normal"> (@ ₹{(item.costPrice || 0).toFixed(2)}/{item.looseUnit || 'g'})</span>
                                    </span>
                                    {item.packSizeValue && (
                                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                        ({item.packSizeValue} {item.packSizeUnit} पैक @ ₹{item.fullPackCostPrice || ''})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItemFromCart(item.cartItemId)}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="बिल से हटाएं"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Main Row: Quantity Controls, Rate, Line Total */}
                          <div className="grid grid-cols-12 gap-2.5 items-center pt-1 border-t border-gray-100">
                            {/* Quantity (मात्रा) */}
                            <div className="col-span-5">
                              <label className="text-[10px] font-bold text-gray-500 block mb-0.5">मात्रा (Qty):</label>
                              {isPack ? (
                                <div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateItemQty(item.cartItemId, Math.max(1, item.quantity - 1))}
                                      className="w-7 h-7 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-lg font-bold flex items-center justify-center text-sm transition-transform"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={item.quantity}
                                      onChange={e => updateItemQty(item.cartItemId, Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-12 h-7 p-1 text-center font-bold text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateItemQty(item.cartItemId, item.quantity + 1)}
                                      className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 rounded-lg font-bold flex items-center justify-center text-sm transition-transform"
                                    >
                                      +
                                    </button>
                                    <span className="text-xs font-semibold text-gray-700 ml-0.5">
                                      {item.unit}
                                    </span>
                                  </div>
                                  {/* Equivalent Quantity Display (e.g. 500 ml or 3 Bottles x 500 ml = 1.5 L) */}
                                  {equivalentQtyStr && (
                                    <div className="text-[10px] font-bold text-emerald-700 mt-1">
                                      {item.quantity === 1 
                                        ? `(${equivalentQtyStr})` 
                                        : `${item.quantity} ${item.unit} = ${equivalentQtyStr}`}
                                    </div>
                                  )}
                                </div>
                              ) : (() => {
                                  const isLargeUnit = item.looseUnit === 'kg' || item.looseUnit === 'L' || item.looseUnit === 'Ltr' || item.looseUnit === 'लीटर' || item.looseUnit === 'किलो';
                                  const stepVal = isLargeUnit ? 1 : 10;
                                  const quickPills = isLargeUnit ? [1, 2, 5, 10, 25] : [25, 50, 100, 250, 500];
                                  const currentVal = item.looseQuantity || item.quantity;
                                  return (
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => updateLooseQty(item.cartItemId, Math.max(isLargeUnit ? 0.5 : 1, currentVal - stepVal))}
                                          className="w-6 h-7 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-800 rounded font-bold flex items-center justify-center text-xs"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          min={isLargeUnit ? '0.1' : '1'}
                                          step={isLargeUnit ? '0.5' : '1'}
                                          value={currentVal}
                                          onChange={e => updateLooseQty(item.cartItemId, Math.max(isLargeUnit ? 0.1 : 1, Number(e.target.value) || 1))}
                                          className="w-16 h-7 p-1 text-center font-bold text-gray-900 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => updateLooseQty(item.cartItemId, currentVal + stepVal)}
                                          className="w-6 h-7 bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-800 rounded font-bold flex items-center justify-center text-xs"
                                        >
                                          +
                                        </button>
                                        <span className="text-xs font-bold text-blue-900 ml-0.5">{item.looseUnit || 'g'}</span>
                                      </div>
                                      {/* Quick Dose Pills */}
                                      <div className="flex gap-1 mt-1">
                                        {quickPills.map(val => (
                                          <button
                                            key={val}
                                            type="button"
                                            onClick={() => updateLooseQty(item.cartItemId, val)}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                              currentVal === val
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                            }`}
                                          >
                                            {val}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                            </div>

                            {/* Rate (दर) */}
                            <div className="col-span-4">
                              <label className="text-[10px] font-bold text-gray-500 block mb-0.5">दर (Rate):</label>
                              {isPack ? (
                                <div>
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.originalSellingPrice}
                                      onChange={e => updateItemPrice(item.cartItemId, Number(e.target.value))}
                                      className="w-full h-7 pl-5 pr-1.5 font-bold text-gray-900 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                                    />
                                  </div>
                                  <span className="text-[9px] text-gray-400 block mt-0.5 truncate">
                                    /{item.unit}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-1">
                                    <div className="relative flex-1 min-w-0">
                                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={item.looseRateAmount ?? Math.round((item.sellingPricePerBaseUnit || item.originalSellingPrice || 0) * (item.looseRateDenominator || 1) * 100) / 100}
                                        onChange={e => updateLooseRateAmount(item.cartItemId, Number(e.target.value))}
                                        className="w-full h-7 pl-4 pr-1 font-bold text-gray-900 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                                      />
                                    </div>
                                    <select
                                      value={item.looseRateUnit || (item.looseUnit === 'g' ? '10 g' : '10 ml')}
                                      onChange={e => updateLooseRateUnit(item.cartItemId, e.target.value)}
                                      className="h-7 px-1 text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                                    >
                                      {getLooseRateOptions(item.looseUnit || 'g').map(opt => (
                                        <option key={opt.label} value={opt.label}>
                                          / {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <span className="text-[9px] text-blue-700 font-medium block mt-0.5">
                                    (₹{(item.sellingPricePerBaseUnit || item.originalSellingPrice || 0).toFixed(2)}/{item.looseUnit || 'g'})
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Line Total (कुल) */}
                            <div className="col-span-3 text-right">
                              <label className="text-[10px] font-bold text-gray-500 block mb-0.5">कुल (Total):</label>
                              <div className="font-black text-gray-900 text-sm">
                                ₹{lineTotal}
                              </div>
                              {/* Unit Profit */}
                              {allocItem && (
                                <div className={`text-[10px] font-bold ${allocItem.lineGrossProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                  लाभ: ₹{allocItem.lineGrossProfit} ({allocItem.lineMarginPercent}%)
                                </div>
                              )}
                            </div>
                          </div>

                          {/* INLINE LOOSE / PARTIAL SALE CONTROLS (Requirement 4, 5, 6) */}
                          {isPack && item.packSizeValue && item.packSizeValue > 1 && (
                            <div className="pt-1.5 border-t border-dashed border-gray-200 flex items-center justify-between text-[11px]">
                              <button
                                type="button"
                                onClick={() => switchToLooseSale(item.cartItemId)}
                                className="text-blue-700 hover:text-blue-900 font-bold flex items-center hover:underline cursor-pointer"
                              >
                                <span>खुला बिक्री (Loose Sale)</span>
                              </button>
                              <span className="text-[10px] text-gray-400">
                                पैक: {item.packSizeValue} {item.packSizeUnit}
                              </span>
                            </div>
                          )}

                          {/* When in Loose Editing mode */}
                          {isLoose && item.fullPackCostPrice && (
                            <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-[11px]">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-blue-900">
                                  खुली बिक्री: {item.looseQuantity || item.quantity} {item.looseUnit || 'g'} × ₹{(item.sellingPricePerBaseUnit || item.originalSellingPrice || 0).toFixed(2)}/{item.looseUnit || 'g'} = ₹{lineTotal}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => revertToPackSale(item.cartItemId)}
                                  className="text-emerald-800 hover:text-emerald-950 font-bold text-[10px] bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" /> वापस पूरा पैक (1 {item.packagingType || 'Bottle'})
                                </button>
                              </div>

                              <div className="text-[10px] text-blue-800 flex justify-between pt-0.5 border-t border-blue-100">
                                <span>
                                  लागत दर: ₹{(item.costPrice || 0).toFixed(2)}/{item.looseUnit || 'g'} (लागत: ₹{allocItem?.totalCost ?? Math.round((item.looseQuantity || item.quantity) * (item.costPrice || 0))})
                                </span>
                                <span>
                                  दर: {item.looseRateAmount ? `₹${item.looseRateAmount}/${item.looseRateUnit}` : `₹${item.originalSellingPrice}`}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Bargaining share details if bargaining active */}
                          {allocItem && allocation.bargainingDiscount > 0 && (
                            <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                              <span className="text-gray-500">
                                मोलभाव शेयर: <span className="font-bold text-amber-700">-₹{allocItem.bargainingDiscountShare}</span> (प्रभावी दर: ₹{allocItem.effectiveSellingPrice})
                              </span>
                              <span className={`font-bold ${allocItem.isBelowCost ? 'text-red-600' : 'text-emerald-700'}`}>
                                अंतिम लाभ: ₹{allocItem.lineGrossProfit} ({allocItem.lineMarginPercent}%)
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* BARGAINING / NEGOTIATION PROPORTIONAL CALCULATOR */}
              {cartItems.length > 0 && (
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      मोलभाव / अंतिम देय राशि (Bargaining & Final Amount)
                    </span>
                    <span className="text-xs text-gray-600">
                      कुल MRP योग: <strong className="text-gray-900 text-sm font-black">₹{subtotalBeforeBargain}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5 flex-wrap">
                          <span>ग्राहक द्वारा देय राशि (Final Agreed Bill):</span>
                          {!isFinalAmountManuallyEdited ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                              लाइव सिंक चालू
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              मोलभाव (Custom)
                            </span>
                          )}
                        </label>
                        {(isFinalAmountManuallyEdited || allocation.bargainingDiscount > 0) && (
                          <button
                            type="button"
                            onClick={handleResetFinalAmountToMRP}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer flex items-center gap-1"
                            title="मोलभाव हटाकर कुल MRP के साथ लाइव सिंक करें"
                          >
                            <RotateCcw className="w-3 h-3" />
                            MRP पर रीसेट करें
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-emerald-800 text-base">₹</span>
                        <input
                          type="number"
                          value={customFinalTotalInput}
                          onChange={handleFinalAmountChange}
                          onBlur={handleFinalAmountBlur}
                          placeholder={String(subtotalBeforeBargain)}
                          className="w-full pl-8 pr-8 py-2 text-base font-extrabold text-emerald-900 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        {isFinalAmountManuallyEdited && (
                          <button
                            type="button"
                            onClick={handleResetFinalAmountToMRP}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
                            title="रीसेट करें"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {!isFinalAmountManuallyEdited 
                          ? "आइटम्स जोड़ने या हटाने पर यह राशि कुल MRP के साथ अपने-आप सिंक रहेगी।"
                          : "ग्राहक मोलभाव लागू है। MRP वापस लागू करने के लिए 'MRP पर रीसेट करें' दबाएं।"
                        }
                      </p>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 text-xs space-y-1">
                      <div className="flex justify-between text-gray-600">
                        <span>दी गई छूट (Discount):</span>
                        <strong className={allocation.bargainingDiscount > 0 ? "text-amber-700 font-bold" : "text-gray-700"}>
                          ₹{allocation.bargainingDiscount}
                        </strong>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>माल की कुल लागत (COGS):</span>
                        <span className="font-semibold text-gray-800">₹{allocation.totalCOGS}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
                        <span>सकल लाभ (Gross Profit):</span>
                        <span className={allocation.grossProfit < 0 ? 'text-red-600 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                          ₹{allocation.grossProfit} ({allocation.grossMarginPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Payment Mode Selection */}
            {cartItems.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-gray-700 block">
                  भुगतान का माध्यम (Payment Mode)
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                  {[
                    { id: 'cash', label: 'नकद (Cash)', icon: Banknote },
                    { id: 'online', label: 'ऑनलाइन (UPI)', icon: Smartphone },
                    { id: 'udhari', label: 'पूरी उधारी (Khata)', icon: BookOpen },
                    { id: 'split', label: 'आधा नकद / उधारी', icon: Scale },
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMode(m.id as any)}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          paymentMode === m.id
                            ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Split / Custom Payment Inputs */}
                {paymentMode === 'split' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600">नकद प्राप्त (Cash Paid): ₹</label>
                      <input
                        type="number"
                        value={cashPaidInput}
                        onChange={e => setCashPaidInput(e.target.value)}
                        className="w-full mt-1 p-2 font-bold bg-white border border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-600">ऑनलाइन प्राप्त (UPI): ₹</label>
                      <input
                        type="number"
                        value={onlinePaidInput}
                        onChange={e => setOnlinePaidInput(e.target.value)}
                        className="w-full mt-1 p-2 font-bold bg-white border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Udhari Breakdown Alert */}
                {udhariRemaining > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-bold">
                    <span>खाते में जाने वाली उधारी राशि:</span>
                    <span className="text-sm text-red-700 font-extrabold">₹{udhariRemaining}</span>
                  </div>
                )}

                {/* Optional Note */}
                <input
                  type="text"
                  placeholder="टिप्पणी / फसल का नाम (वैकल्पिक)..."
                  value={billNote}
                  onChange={e => setBillNote(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                {/* Final Action Button */}
                <button
                  type="button"
                  disabled={isSubmitting || cartItems.length === 0}
                  onClick={handleCreateSale}
                  className="w-full py-3.5 px-6 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl font-extrabold text-sm sm:text-base shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'बिल सुरक्षित हो रहा है...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      बिल सेव करें (Save Bill) · ₹{calculatedFinalTotal}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                नया ग्राहक जोड़ें (Add Customer)
              </h3>
              <button onClick={() => setShowQuickCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">किसान का पूरा नाम *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. रमेश पाटीदार"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    placeholder="उदा. 98260XXXXX"
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">गाँव / पता</label>
                  <input
                    type="text"
                    placeholder="उदा. फल्सावद"
                    value={newCustVillage}
                    onChange={e => setNewCustVillage(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">अधिकतम उधारी सीमा (Credit Limit) ₹</label>
                <input
                  type="number"
                  value={newCustCreditLimit}
                  onChange={e => setNewCustCreditLimit(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#2D5A27] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-[#23461e] active:scale-95 transition-all mt-4"
              >
                ग्राहक सुरक्षित करें
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LOOSE & SPRAY PUMP / BIGHA DOSE CALCULATOR MODAL */}
      {looseModalProduct && (() => {
        const catInfo = detectProductPhysicalCategory(looseModalProduct);
        const variants = getProductVariants(looseModalProduct);
        const isLiquid = catInfo.physicalType === 'liquid';
        const isSeed = catInfo.physicalType === 'seed';

        // Calculation variables
        let reqDisplayQty = 0;
        let reqDisplayUnit = '';
        let reqBaseQty = 0;

        if (looseMode === 'pump') {
          const pumps = Number(loosePumpCount) || 1;
          const dose = Number(looseDosePerPump) || (isLiquid ? 35 : 25);
          const totalDose = pumps * dose;
          reqBaseQty = totalDose;
          if (isLiquid) {
            if (totalDose >= 1000 && totalDose % 1000 === 0) {
              reqDisplayQty = totalDose / 1000;
              reqDisplayUnit = 'L';
            } else {
              reqDisplayQty = totalDose;
              reqDisplayUnit = 'ml';
            }
          } else {
            if (totalDose >= 1000 && totalDose % 1000 === 0) {
              reqDisplayQty = totalDose / 1000;
              reqDisplayUnit = 'kg';
            } else {
              reqDisplayQty = totalDose;
              reqDisplayUnit = 'g';
            }
          }
        } else if (looseMode === 'bigha') {
          const bighas = Number(looseBighaCount) || 1;
          const dose = Number(looseDosePerBigha) || 1;
          const totalVal = Math.round(bighas * dose * 100) / 100;
          reqDisplayQty = totalVal;
          reqDisplayUnit = looseBighaUnit;
          const isLarge = reqDisplayUnit === 'kg' || reqDisplayUnit === 'L' || reqDisplayUnit === 'Ltr';
          reqBaseQty = isLarge ? totalVal * 1000 : totalVal;
        } else {
          reqDisplayQty = Number(looseDirectQty) || 0;
          reqDisplayUnit = looseDirectUnit;
          const isLarge = reqDisplayUnit === 'kg' || reqDisplayUnit === 'L' || reqDisplayUnit === 'Ltr';
          reqBaseQty = isLarge ? reqDisplayQty * 1000 : reqDisplayQty;
        }

        const rateAmt = Number(looseCustomPrice) || 0;
        const mult = looseModalRateMultiplier || 1;
        const pricePerBase = mult > 0 ? (rateAmt / mult) : rateAmt;
        const lineTotal = Math.round(reqBaseQty * pricePerBase);
        const lineCost = Math.round(reqBaseQty * (looseModalCostPerBase || 0) * 100) / 100;
        const lineProfit = Math.round((lineTotal - lineCost) * 100) / 100;
        const profitMargin = lineTotal > 0 ? Math.round((lineProfit / lineTotal) * 100) : 0;

        const openStock = looseModalProduct.looseStock?.availableBaseQty || 0;
        const willNeedPackOpen = reqBaseQty > openStock;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border border-gray-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    isLiquid ? 'bg-blue-100 text-blue-700' : isSeed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isLiquid ? <Droplet className="w-5 h-5" /> : isSeed ? <Sprout className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900">
                        {looseModalProduct.hindiName || looseModalProduct.name}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isLiquid ? 'bg-blue-50 text-blue-800 border-blue-200' : isSeed ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {catInfo.description}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      स्मार्ट खुला / स्प्रे / बीघा डोज बिक्री
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setLooseModalProduct(null)} 
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Packaging Variant Source & Unit Cost Basis Card */}
              {variants.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">मूल पैकिंग स्रोत (Packaging Variant):</span>
                    <span className="text-[11px] text-gray-500">
                      लागत आधार: <strong>₹{(looseModalCostPerBase || 0).toFixed(4)}</strong> / {catInfo.baseUnit}
                      {catInfo.baseUnit === 'ml' ? ` (₹${((looseModalCostPerBase || 0) * 1000).toFixed(2)}/L)` : ` (₹${((looseModalCostPerBase || 0) * 1000).toFixed(2)}/kg)`}
                    </span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {variants.map(v => {
                      const isSelected = looseSelectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectPackVariant(v)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{v.sizeValue} {v.sizeUnit} {v.packagingType ? `(${v.packagingType})` : ''}</span>
                          <span className={isSelected ? 'text-emerald-100' : 'text-gray-500'}>
                            · ₹{v.costPrice || 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rate and Dispensing Info */}
              <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-emerald-800 font-medium block">खुली बिक्री (Loose Dispensing):</span>
                  <span className="text-xs font-bold text-emerald-950">
                    मास्टर दर पर कस्टम मात्रा बिलिंग
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">खुली दर (Selling Rate):</span>
                  <span className="text-xs font-bold text-gray-800">
                    ₹{looseCustomPrice || 0} / {looseModalRateUnit}
                  </span>
                </div>
              </div>

              {/* Mode Switch Tabs (3 Modes) */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLooseMode('direct')}
                  className={`py-2 px-1 text-center rounded-xl transition-all ${
                    looseMode === 'direct' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📦 सीधी खुली मात्रा
                </button>
                <button
                  type="button"
                  onClick={() => setLooseMode('pump')}
                  className={`py-2 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1 ${
                    looseMode === 'pump' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>🚿 पंप डोज</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLooseMode('bigha')}
                  className={`py-2 px-1 text-center rounded-xl transition-all flex items-center justify-center gap-1 ${
                    looseMode === 'bigha' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>🌾 प्रति बीघा डोज</span>
                </button>
              </div>

              {/* MODE 1: Direct Quantity */}
              {looseMode === 'direct' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-gray-700 block">
                        मात्रा यूनिट चुनें (Select Unit):
                      </label>
                      {/* Dynamic Unit Switcher */}
                      <div className="flex gap-1">
                        {catInfo.availableUnits.map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => {
                              setLooseDirectUnit(u);
                              if (u === 'kg') setLooseDirectQty('25');
                              else if (u === 'L') setLooseDirectQty('1');
                              else if (u === 'ml') setLooseDirectQty('100');
                              else if (u === 'packet') setLooseDirectQty('1');
                              else setLooseDirectQty('50');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              looseDirectUnit === u
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="0.1"
                        step={looseDirectUnit === 'kg' || looseDirectUnit === 'L' ? '0.5' : '1'}
                        placeholder={`उदा. ${looseDirectUnit === 'kg' ? '5' : looseDirectUnit === 'L' ? '1' : '100'} ${looseDirectUnit}`}
                        value={looseDirectQty}
                        onChange={e => setLooseDirectQty(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">
                        {looseDirectUnit}
                      </span>
                    </div>

                    {/* Quick Preset Buttons tailored to unit */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {(looseDirectUnit === 'kg'
                        ? ['0.5', '1', '2', '5', '10', '25', '50']
                        : looseDirectUnit === 'L'
                        ? ['0.25', '0.5', '1', '2', '5']
                        : looseDirectUnit === 'packet'
                        ? ['1', '2', '5', '10']
                        : ['10', '25', '50', '100', '250', '500']
                      ).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setLooseDirectQty(val)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            looseDirectQty === val
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {val} {looseDirectUnit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: Spray Tank Dose Calculator */}
              {looseMode === 'pump' && (
                <div className="space-y-3 text-xs">
                  {/* Tank Size Selection */}
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      टंकी का साइज़ (Spray Tank Capacity):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { size: '16', label: '15-16 L Knapsack' },
                        { size: '20', label: '20 L Battery' },
                        { size: '200', label: '200 L Drum' },
                        { size: '500', label: '500 L Tractor' },
                      ].map(t => (
                        <button
                          key={t.size}
                          type="button"
                          onClick={() => {
                            setLooseTankSize(t.size);
                            if (t.size === '200') {
                              setLooseDosePerPump(isLiquid ? '350' : '250');
                            } else if (t.size === '500') {
                              setLooseDosePerPump(isLiquid ? '850' : '650');
                            } else {
                              const std = looseModalProduct.standardDoseInfo?.verifiedDosePer20LTank || (isLiquid ? 35 : 25);
                              setLooseDosePerPump(String(std));
                            }
                          }}
                          className={`p-2 rounded-xl text-center border font-bold text-[11px] transition-all cursor-pointer ${
                            looseTankSize === t.size
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        पंपों की संख्या (Tanks) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="उदा. 3"
                        value={loosePumpCount}
                        onChange={e => setLoosePumpCount(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {['1', '2', '3', '4', '5', '10'].map(cnt => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setLoosePumpCount(cnt)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                              loosePumpCount === cnt
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        प्रति पंप डोज ({catInfo.baseUnit}) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder={isLiquid ? 'उदा. 35' : 'उदा. 25'}
                        value={looseDosePerPump}
                        onChange={e => setLooseDosePerPump(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      {looseModalProduct.standardDoseInfo?.verifiedDosePer20LTank && (
                        <button
                          type="button"
                          onClick={() => setLooseDosePerPump(String(looseModalProduct.standardDoseInfo?.verifiedDosePer20LTank))}
                          className="text-[10px] text-emerald-700 font-bold block mt-1 hover:underline cursor-pointer"
                        >
                          सत्यापित डोज: {looseModalProduct.standardDoseInfo.verifiedDosePer20LTank} {catInfo.baseUnit}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Calculation Summary Box */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                    <div className="font-bold text-amber-900 flex items-center justify-between">
                      <span>कुल दवा की मात्रा (Total Volume):</span>
                      <span className="text-sm font-black text-amber-950">
                        {reqBaseQty} {catInfo.baseUnit}
                        {reqBaseQty >= 1000 && ` (${(reqBaseQty / 1000).toFixed(2)} ${isLiquid ? 'L' : 'kg'})`}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      {loosePumpCount} पंप × {looseDosePerPump} {catInfo.baseUnit} (टंकी क्षमता: {looseTankSize} लीटर)
                    </p>
                  </div>
                </div>
              )}

              {/* MODE 3: Per Bigha Dose Calculator */}
              {looseMode === 'bigha' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        खेत का रकबा (बीघा / Bigha) *
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        placeholder="उदा. 5"
                        value={looseBighaCount}
                        onChange={e => setLooseBighaCount(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {['1', '2', '3', '5', '10', '20'].map(cnt => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setLooseBighaCount(cnt)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                              looseBighaCount === cnt
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700 block">
                          डोज यूनिट *
                        </label>
                        <div className="flex gap-1">
                          {(isLiquid ? ['ml', 'L'] : ['g', 'kg']).map(u => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => {
                                setLooseBighaUnit(u);
                                if (u === 'kg') setLooseDosePerBigha('5');
                                else if (u === 'g') setLooseDosePerBigha('500');
                                else if (u === 'L') setLooseDosePerBigha('1');
                                else setLooseDosePerBigha('250');
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                looseBighaUnit === u
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0.1"
                        step={looseBighaUnit === 'kg' || looseBighaUnit === 'L' ? '0.5' : '10'}
                        placeholder={looseBighaUnit === 'kg' ? 'उदा. 5' : 'उदा. 500'}
                        value={looseDosePerBigha}
                        onChange={e => setLooseDosePerBigha(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {(looseBighaUnit === 'kg'
                          ? ['1', '2', '5', '10', '25']
                          : looseBighaUnit === 'L'
                          ? ['0.5', '1', '2']
                          : ['100', '250', '500']
                        ).map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setLooseDosePerBigha(val)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                              looseDosePerBigha === val
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      {looseModalProduct.standardDoseInfo?.verifiedDosePerBigha && (
                        <button
                          type="button"
                          onClick={() => {
                            setLooseDosePerBigha(String(looseModalProduct.standardDoseInfo?.verifiedDosePerBigha));
                            if (looseModalProduct.standardDoseInfo?.doseBighaUnit) {
                              setLooseBighaUnit(looseModalProduct.standardDoseInfo.doseBighaUnit === 'Ltr' ? 'L' : looseModalProduct.standardDoseInfo.doseBighaUnit);
                            }
                          }}
                          className="text-[10px] text-emerald-800 font-bold block mt-1 hover:underline cursor-pointer"
                        >
                          सत्यापित डोज: {looseModalProduct.standardDoseInfo.verifiedDosePerBigha} {looseModalProduct.standardDoseInfo.doseBighaUnit || 'यूनिट'}/बीघा
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bigha Calculation Summary Box */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
                    <div className="font-bold text-emerald-900 flex items-center justify-between">
                      <span>कुल खेत डोज (Total Dose):</span>
                      <span className="text-sm font-black text-emerald-950">
                        {reqDisplayQty} {reqDisplayUnit}
                        {reqDisplayUnit !== catInfo.baseUnit && ` (${reqBaseQty} ${catInfo.baseUnit})`}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      {looseBighaCount} बीघा × {looseDosePerBigha} {looseBighaUnit}/बीघा
                    </p>
                  </div>
                </div>
              )}

              {/* SELLING RATE & UNIT SELECTOR */}
              <div className="space-y-1 text-xs">
                <label className="font-bold text-gray-700 block">
                  बिक्री दर (Selling Rate) *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="30"
                      value={looseCustomPrice}
                      onChange={e => setLooseCustomPrice(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={looseModalRateUnit}
                    onChange={e => handleModalRateUnitChange(e.target.value)}
                    className="px-3 py-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {getLooseRateOptions(catInfo.baseUnit).map(opt => (
                      <option key={opt.label} value={opt.label}>
                        / {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 pt-0.5">
                  <span>
                    प्रभावी दर: ₹{(pricePerBase).toFixed(3)} / {catInfo.baseUnit}
                  </span>
                  <span>
                    ({catInfo.baseUnit === 'ml' ? `₹${(pricePerBase * 1000).toFixed(2)}/L` : `₹${(pricePerBase * 1000).toFixed(2)}/kg`})
                  </span>
                </div>
              </div>

              {/* LIVE TOTAL, ESTIMATED COST, PROFIT & STOCK PREVIEW */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-gray-500 block">कुल देय राशि (Line Total):</span>
                      <span className="text-xl font-black text-gray-900">₹{lineTotal}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-gray-500 block">बिल में जाने वाली मात्रा:</span>
                      <span className="text-sm font-bold text-emerald-800">
                        {reqDisplayQty} {reqDisplayUnit}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-[11px]">
                    <span className="text-gray-600">
                      अनुमानित लागत: <strong>₹{lineCost}</strong>
                    </span>
                    <span className={`font-bold ${lineProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      अनुमानित लाभ: ₹{lineProfit} ({profitMargin}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLooseModalProduct(null)}
                    className="py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmLooseSale}
                    className="py-2.5 px-4 bg-[#2D5A27] text-white rounded-xl font-bold text-xs hover:bg-[#23461e] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    बिल में जोड़ें
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      </>
      )}

      {/* COMPLETED SALE & PRINT MODAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1 border-b pb-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">बिल सफलतापूर्वक कट गया!</h3>
              <p className="text-xs text-gray-500">इनवॉइस नंबर: <strong>#{completedSale.invoiceNo}</strong></p>
            </div>

            {/* Printable Receipt Preview */}
            <div id="printable-receipt" className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs space-y-3 font-mono">
              <div className="text-center border-b pb-2">
                <h4 className="font-extrabold text-sm uppercase">फल्सावदिया कृषि बाजार</h4>
                <p className="text-[10px] text-gray-500">डिंपल चौराहा, शामगढ़ (म.प्र.) | मो. 8982338046</p>
                <p className="text-[10px] text-gray-400">दिनांक: {completedSale.date}</p>
              </div>

              <div className="flex justify-between border-b pb-1 text-[11px]">
                <span>ग्राहक: <strong>{completedSale.customerName}</strong></span>
                <span>{completedSale.customerPhone}</span>
              </div>

              <div className="space-y-1.5 py-1">
                {completedSale.items.map((it, idx) => {
                  const itemTitle = formatSaleItemInvoiceTitle(it);
                  return (
                    <div key={idx} className="flex justify-between text-[11px] py-0.5 border-b border-gray-100 last:border-b-0">
                      <span className="flex-1 pr-2 font-medium text-gray-800">
                        {itemTitle} × {it.quantity}
                      </span>
                      <span className="font-bold text-gray-900 whitespace-nowrap">₹{it.totalEffectiveAmount}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>उप-कुल (Subtotal):</span>
                  <span>₹{completedSale.subtotal}</span>
                </div>
                {completedSale.bargainingDiscount > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>मोलभाव छूट (Discount):</span>
                    <span>-₹{completedSale.bargainingDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-extrabold pt-1 border-t">
                  <span>अंतिम कुल (Grand Total):</span>
                  <span>₹{completedSale.finalTotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>नकद/UPI भुगतान:</span>
                  <span>₹{completedSale.cashPaid + completedSale.onlinePaid}</span>
                </div>
                {completedSale.udhariAmount > 0 && (
                  <div className="flex justify-between text-red-700 font-bold">
                    <span>खाते में उधारी (Due):</span>
                    <span>₹{completedSale.udhariAmount}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="py-3 px-2 bg-gray-100 text-gray-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors border border-gray-200 disabled:opacity-50"
                title="PDF डाउनलोड करें"
              >
                <Download className="w-3.5 h-3.5 text-gray-500 shrink-0" /> {isDownloadingPdf ? 'PDF...' : 'PDF'}
              </button>
              <button
                onClick={() => {
                  setCompletedSale(null);
                  setActiveTab('history');
                }}
                className="py-3 px-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors border border-emerald-200"
              >
                <Calendar className="w-3.5 h-3.5" /> इतिहास
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="py-3 px-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                अगला बिल
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLLED ADMIN TEST DATA RESET CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">टेस्टिंग डेटा रीसेट (Test Data Reset)</h3>
                  <p className="text-xs text-gray-500">अकाउंटिंग व बिलिंग सिस्टम को प्रारंभिक स्थिति में लाएं</p>
                </div>
              </div>
              <button 
                onClick={() => !isResetting && setShowResetConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100"
                disabled={isResetting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>क्या साफ किया जाएगा (What will be reset):</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-amber-900">
                  <li>अब तक टेस्टिंग के दौरान बने सभी <strong>POS बिक्री बिल</strong></li>
                  <li>कैश फ्लो और दैनिक गल्ले के टेस्टिंग रिकॉर्ड्स</li>
                  <li>ग्राहकों की टेस्टिंग उधारी और लेजर प्रविष्टियां (सभी बैलेंस <strong>₹0</strong> होंगे)</li>
                  <li>मुनाफा (Gross/Net Profit) एवं सेल्स डैशबोर्ड आंकड़े</li>
                  <li>बिल नंबर काउंटर रीसेट होकर <strong>Bill #FKB-0001</strong> से शुरू होगा</li>
                </ul>
              </div>

              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>मास्टर डेटा सुरक्षित रहेगा (Master Data Preserved):</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  दुकान के उत्पाद (Products), किस्में, श्रेणियां, ग्राहक प्रोफाइल (नाम, फोन, गांव), और सप्लायर रिकॉर्ड्स को कुछ नहीं होगा।
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                onClick={handleResetTestData}
                disabled={isResetting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>डेटा साफ हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>हाँ, टेस्ट डेटा रीसेट करें</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED A4 PRINT PORTAL */}
      {typeof document !== 'undefined' && isPrinting && completedSale && createPortal(
        <div id="active-print-portal">
          <PrintableSalesInvoice
            sale={completedSale}
            customerOutstanding={selectedCustomer?.currentOutstanding || 0}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountingPOSBilling;
