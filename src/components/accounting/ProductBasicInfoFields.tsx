import React, { useMemo } from 'react';
import { Droplet, Scale, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AccountingProduct } from '../../types/accounting';

export interface ProductCategoryOption {
  id: string;
  nameHindi: string;
  shortLabel: string;
}

export const ACCOUNTING_PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { id: 'pesticides', nameHindi: 'कीटनाशक (Pesticides)', shortLabel: 'कीटनाशक' },
  { id: 'fungicides', nameHindi: 'फफूंदनाशी (Fungicides)', shortLabel: 'फफूंदनाशी' },
  { id: 'herbicides', nameHindi: 'खरपतवारनाशी (Herbicides)', shortLabel: 'खरपतवारनाशी' },
  { id: 'medicines', nameHindi: 'PGR / टॉनिक व वृद्धि वर्धक (Medicines)', shortLabel: 'PGR/टॉनिक' },
  { id: 'fertilizers', nameHindi: 'उर्वरक / खाद (Fertilizers)', shortLabel: 'खाद/उर्वरक' },
  { id: 'micronutrients', nameHindi: 'सूक्ष्म पोषक तत्व (Micronutrients)', shortLabel: 'सूक्ष्म पोषक' },
  { id: 'seeds', nameHindi: 'बीज (Seeds)', shortLabel: 'बीज' },
  { id: 'implements', nameHindi: 'कृषि उपकरण (Implements)', shortLabel: 'उपकरण' },
  { id: 'other', nameHindi: 'अन्य (Other)', shortLabel: 'अन्य' },
];

export interface ProductBasicInfoValues {
  hindiName: string;
  name: string;
  category: string;
  productType: 'liquid' | 'powder_granule' | 'other';
}

export interface ProductBasicInfoFieldsProps {
  values: ProductBasicInfoValues;
  onChange: (updated: Partial<ProductBasicInfoValues>) => void;
  existingProducts?: AccountingProduct[];
  currentProductId?: string;
  onSelectExistingProduct?: (product: AccountingProduct) => void;
  accentColor?: 'emerald' | 'blue';
  disabled?: boolean;
  showDuplicateAlert?: boolean;
}

export const ProductBasicInfoFields: React.FC<ProductBasicInfoFieldsProps> = ({
  values,
  onChange,
  existingProducts = [],
  currentProductId,
  onSelectExistingProduct,
  accentColor = 'emerald',
  disabled = false,
  showDuplicateAlert = true,
}) => {
  // Duplicate check: checks name, hindiName & category match against existing inventory
  const matchingDuplicate = useMemo(() => {
    if (!showDuplicateAlert || !existingProducts || existingProducts.length === 0) return null;
    const cleanHindi = (values.hindiName || '').trim().toLowerCase();
    const cleanName = (values.name || '').trim().toLowerCase();
    if (cleanHindi.length < 2 && cleanName.length < 2) return null;

    return existingProducts.find(p => {
      if (currentProductId && p.id === currentProductId) return false;
      const pHindi = (p.hindiName || '').trim().toLowerCase();
      const pName = (p.name || '').trim().toLowerCase();

      const matchHindi = cleanHindi.length >= 2 && (pHindi === cleanHindi || (cleanHindi.length >= 3 && pHindi.includes(cleanHindi)));
      const matchName = cleanName.length >= 2 && (pName === cleanName || (cleanName.length >= 3 && pName.includes(cleanName)));
      const cross1 = cleanHindi.length >= 3 && pName.includes(cleanHindi);
      const cross2 = cleanName.length >= 3 && pHindi.includes(cleanName);

      return matchHindi || matchName || cross1 || cross2;
    }) || null;
  }, [showDuplicateAlert, existingProducts, values.hindiName, values.name, currentProductId]);

  const activeTheme = accentColor === 'blue'
    ? {
        ring: 'focus:ring-blue-500',
        activeBtn: 'bg-blue-50 text-blue-900 border-blue-300 shadow-xs',
        badge: 'bg-blue-100 text-blue-800',
      }
    : {
        ring: 'focus:ring-emerald-500',
        activeBtn: 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs',
        badge: 'bg-emerald-100 text-emerald-800',
      };

  return (
    <div className="space-y-3">
      {/* Duplicate Alert Banner */}
      {matchingDuplicate && onSelectExistingProduct && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs animate-fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-black text-amber-950 flex items-center gap-1.5 flex-wrap">
                <span>यह उत्पाद पहले से Inventory में उपलब्ध है!</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                  {ACCOUNTING_PRODUCT_CATEGORIES.find(c => c.id === matchingDuplicate.category)?.shortLabel || matchingDuplicate.category}
                </span>
              </div>
              <div className="text-[11px] text-gray-700 mt-0.5">
                <span className="font-bold text-gray-900">{matchingDuplicate.hindiName}</span>
                {matchingDuplicate.name && <span className="text-gray-600"> ({matchingDuplicate.name})</span>}
                <span className="ml-2 text-gray-500">
                  वर्तमान स्टॉक: <b className="text-gray-800">{matchingDuplicate.currentStock || 0}</b>
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectExistingProduct(matchingDuplicate)}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 shrink-0 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Existing Product इस्तेमाल करें</span>
          </button>
        </div>
      )}

      {/* Basic Info Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. उत्पाद का नाम * */}
        <div>
          <label className="font-bold text-gray-700 block mb-1 text-xs">
            उत्पाद का नाम (हिंदी / व्यापारिक नाम) *
          </label>
          <input
            type="text"
            required
            disabled={disabled}
            placeholder="उदा. रोकेट (Rocket)"
            value={values.hindiName}
            onChange={e => onChange({ hindiName: e.target.value })}
            className={`w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 ${activeTheme.ring}`}
          />
        </div>

        {/* 2. Technical नाम */}
        <div>
          <label className="font-bold text-gray-700 block mb-1 text-xs">
            अंग्रेज़ी / टेक्निकल नाम
          </label>
          <input
            type="text"
            disabled={disabled}
            placeholder="उदा. Profenofos 40% + Cypermethrin 4% EC"
            value={values.name}
            onChange={e => onChange({ name: e.target.value })}
            className={`w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 ${activeTheme.ring}`}
          />
        </div>

        {/* 3. श्रेणी (Category) */}
        <div>
          <label className="font-bold text-gray-700 block mb-1 text-xs">
            श्रेणी (Category) *
          </label>
          <select
            disabled={disabled}
            value={values.category || 'pesticides'}
            onChange={e => onChange({ category: e.target.value })}
            className={`w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 ${activeTheme.ring}`}
          >
            {ACCOUNTING_PRODUCT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.nameHindi}
              </option>
            ))}
          </select>
        </div>

        {/* 4. उत्पाद रूप (Product Form) */}
        <div>
          <label className="font-bold text-gray-700 block mb-1 text-xs">
            उत्पाद रूप (Product Form) *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ productType: 'liquid' })}
              className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                values.productType === 'liquid'
                  ? activeTheme.activeBtn
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Droplet className="w-3.5 h-3.5 text-blue-600" />
              <span>तरल (Liquid)</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ productType: 'powder_granule' })}
              className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                values.productType === 'powder_granule'
                  ? activeTheme.activeBtn
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>पाउडर / दानेदार</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
