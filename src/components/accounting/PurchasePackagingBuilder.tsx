import React from 'react';
import { 
  Plus, 
  Trash2, 
  Droplet, 
  Scale, 
  Package, 
  Sparkles,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { 
  AccountingProduct, 
  PackagingVariant, 
  SizeUnit, 
  PackagingType 
} from '../../types/accounting';
import { normalizeToBaseUnit, formatBaseUnitDisplay, getProductVariants } from '../../utils/agriPackagingUtils';

export interface PurchaseVariantRow {
  id: string; // internal unique key
  variantId?: string; // matched existing variant id
  sizeValue: number;
  sizeUnit: SizeUnit;
  packagingType: PackagingType;
  costPrice: number;
  sellingPrice: number;
  quantity: number; // packs bought
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
}

export interface PurchaseProductEntry {
  tempId: string;
  productId?: string;
  name: string;
  hindiName?: string;
  productType: 'liquid' | 'powder_granule';
  category: string;
  variants: PurchaseVariantRow[];
}

interface PurchasePackagingBuilderProps {
  products: AccountingProduct[];
  productEntries: PurchaseProductEntry[];
  onChangeEntries: (entries: PurchaseProductEntry[]) => void;
  transportCharges?: number;
}

export const PurchasePackagingBuilder: React.FC<PurchasePackagingBuilderProps> = ({
  products,
  productEntries,
  onChangeEntries,
  transportCharges = 0,
}) => {
  // Calculate total invoice products cost across all entries and variants for landed cost distribution
  const overallProductCost = productEntries.reduce((sum, p) => {
    return sum + p.variants.reduce((vSum, v) => vSum + (Number(v.quantity) || 0) * (Number(v.costPrice) || 0), 0);
  }, 0);

  // Add a new product block
  const handleAddProductBlock = () => {
    const newEntry: PurchaseProductEntry = {
      tempId: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      hindiName: '',
      productType: 'liquid',
      category: 'pesticides',
      variants: [
        {
          id: `var_init_${Date.now()}`,
          sizeValue: 100,
          sizeUnit: 'ml',
          packagingType: 'Bottle',
          costPrice: 0,
          sellingPrice: 0,
          quantity: 1,
          batchNumber: '',
          expiryDate: '',
        },
      ],
    };
    onChangeEntries([...productEntries, newEntry]);
  };

  // Remove a product block
  const handleRemoveProductBlock = (pIdx: number) => {
    if (productEntries.length <= 1) {
      // Clear instead of removing last
      onChangeEntries([
        {
          tempId: `entry_${Date.now()}`,
          name: '',
          hindiName: '',
          productType: 'liquid',
          category: 'pesticides',
          variants: [
            {
              id: `var_${Date.now()}`,
              sizeValue: 100,
              sizeUnit: 'ml',
              packagingType: 'Bottle',
              costPrice: 0,
              sellingPrice: 0,
              quantity: 1,
            },
          ],
        },
      ]);
      return;
    }
    onChangeEntries(productEntries.filter((_, i) => i !== pIdx));
  };

  // Product selection handler
  const handleSelectProduct = (pIdx: number, productId: string) => {
    const updated = [...productEntries];
    const target = { ...updated[pIdx] };

    if (!productId) {
      target.productId = undefined;
      target.name = '';
      target.hindiName = '';
      updated[pIdx] = target;
      onChangeEntries(updated);
      return;
    }

    const foundProd = products.find(p => p.id === productId);
    if (foundProd) {
      target.productId = foundProd.id;
      target.name = foundProd.name;
      target.hindiName = foundProd.hindiName || foundProd.name;
      target.category = foundProd.category || 'pesticides';
      target.productType = foundProd.productType === 'liquid' ? 'liquid' : 'powder_granule';

      // Populate existing variants if available
      const existingVariants = getProductVariants(foundProd);
      if (existingVariants && existingVariants.length > 0) {
        target.variants = existingVariants.map(v => ({
          id: `var_row_${v.id}_${Date.now()}`,
          variantId: v.id,
          sizeValue: v.sizeValue,
          sizeUnit: v.sizeUnit,
          packagingType: v.packagingType,
          costPrice: v.costPrice || foundProd.costPrice || 0,
          sellingPrice: v.sellingPrice || foundProd.defaultSellingPrice || 0,
          quantity: 1, // default 1 pack for convenience
          batchNumber: foundProd.batchNo || '',
          expiryDate: foundProd.expiryDate || '',
        }));
      } else {
        target.variants = [
          {
            id: `var_${Date.now()}`,
            sizeValue: target.productType === 'liquid' ? 100 : 500,
            sizeUnit: target.productType === 'liquid' ? 'ml' : 'g',
            packagingType: target.productType === 'liquid' ? 'Bottle' : 'Packet',
            costPrice: foundProd.costPrice || 0,
            sellingPrice: foundProd.defaultSellingPrice || 0,
            quantity: 1,
            batchNumber: foundProd.batchNo || '',
            expiryDate: foundProd.expiryDate || '',
          },
        ];
      }
    }

    updated[pIdx] = target;
    onChangeEntries(updated);
  };

  // Add variant to product entry
  const handleAddVariant = (
    pIdx: number, 
    preset?: { val: number; unit: SizeUnit; type: PackagingType; cost?: number; selling?: number; existingId?: string }
  ) => {
    const updated = [...productEntries];
    const target = { ...updated[pIdx] };
    const pType = target.productType;

    const newVar: PurchaseVariantRow = {
      id: `var_row_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      variantId: preset?.existingId,
      sizeValue: preset ? preset.val : (pType === 'liquid' ? 100 : 500),
      sizeUnit: preset ? preset.unit : (pType === 'liquid' ? 'ml' : 'g'),
      packagingType: preset ? preset.type : (pType === 'liquid' ? 'Bottle' : 'Packet'),
      costPrice: preset?.cost || 0,
      sellingPrice: preset?.selling || 0,
      quantity: 1,
      batchNumber: '',
      expiryDate: '',
    };

    target.variants = [...target.variants, newVar];
    updated[pIdx] = target;
    onChangeEntries(updated);
  };

  // Update variant field
  const handleUpdateVariant = (
    pIdx: number, 
    vIdx: number, 
    field: keyof PurchaseVariantRow, 
    value: any
  ) => {
    const updated = [...productEntries];
    const targetProduct = { ...updated[pIdx] };
    const targetVariants = [...targetProduct.variants];

    targetVariants[vIdx] = {
      ...targetVariants[vIdx],
      [field]: value,
    };

    targetProduct.variants = targetVariants;
    updated[pIdx] = targetProduct;
    onChangeEntries(updated);
  };

  // Remove variant
  const handleRemoveVariant = (pIdx: number, vIdx: number) => {
    const updated = [...productEntries];
    const targetProduct = { ...updated[pIdx] };

    if (targetProduct.variants.length <= 1) {
      // Keep at least one variant row
      return;
    }

    targetProduct.variants = targetProduct.variants.filter((_, i) => i !== vIdx);
    updated[pIdx] = targetProduct;
    onChangeEntries(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-700" />
            <span>खरीद उत्पाद एवं पैकेजिंग साइज (Products & Packaging Variants)</span>
          </h4>
          <p className="text-[11px] text-gray-500">
            सप्लायर से खरीदे जा रहे उत्पादों के सभी साइज, लागत, मात्रा व बैच एक साथ दर्ज करें
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddProductBlock}
          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-blue-200"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ अगला उत्पाद जोड़ें</span>
        </button>
      </div>

      {/* List of Product Entry Blocks */}
      <div className="space-y-4">
        {productEntries.map((prodEntry, pIdx) => {
          const selectedProd = products.find(p => p.id === prodEntry.productId);
          const existingInventoryVariants = selectedProd ? getProductVariants(selectedProd) : [];

          // Product totals
          const totalPacks = prodEntry.variants.reduce((acc, v) => acc + (Number(v.quantity) || 0), 0);
          const totalProdAmount = prodEntry.variants.reduce((acc, v) => acc + (Number(v.quantity) || 0) * (Number(v.costPrice) || 0), 0);

          // Total equivalent volume or weight across all variant packs
          const totalBaseQty = prodEntry.variants.reduce((acc, v) => {
            const basePerPack = normalizeToBaseUnit(v.sizeValue, v.sizeUnit);
            return acc + (Number(v.quantity) || 0) * basePerPack;
          }, 0);
          const baseUnit = prodEntry.productType === 'liquid' ? 'ml' : 'g';
          const equivDisplay = formatBaseUnitDisplay(totalBaseQty, baseUnit);

          return (
            <div 
              key={prodEntry.tempId || pIdx} 
              className="p-4 bg-white border-2 border-blue-100/80 rounded-2xl shadow-sm space-y-3 relative"
            >
              {/* Product Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-6 h-6 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {pIdx + 1}
                  </span>
                  
                  {/* Select Existing Product or Manual Name */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <select
                        value={prodEntry.productId || ''}
                        onChange={e => handleSelectProduct(pIdx, e.target.value)}
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- इन्वेंट्री से उत्पाद चुनें (या नया लिखें) --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.hindiName} ({p.name}) · स्टॉक: {p.currentStock || 0}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!prodEntry.productId ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="उत्पाद का नाम (हिंदी / अंग्रेज़ी)..."
                          value={prodEntry.hindiName || prodEntry.name}
                          onChange={e => {
                            const copy = [...productEntries];
                            copy[pIdx].name = e.target.value;
                            copy[pIdx].hindiName = e.target.value;
                            onChangeEntries(copy);
                          }}
                          className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        {/* Product Form selector for new products */}
                        <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...productEntries];
                              copy[pIdx].productType = 'liquid';
                              onChangeEntries(copy);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                              prodEntry.productType === 'liquid' ? 'bg-white shadow-xs text-blue-900' : 'text-gray-500'
                            }`}
                          >
                            <Droplet className="w-3 h-3 text-blue-600" />
                            <span>तरल</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...productEntries];
                              copy[pIdx].productType = 'powder_granule';
                              onChangeEntries(copy);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                              prodEntry.productType === 'powder_granule' ? 'bg-white shadow-xs text-amber-900' : 'text-gray-500'
                            }`}
                          >
                            <Scale className="w-3 h-3 text-amber-600" />
                            <span>पाउडर</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                        <span>{prodEntry.hindiName}</span>
                        <span className="text-gray-500 font-normal">({prodEntry.name})</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-900 ml-auto">
                          {prodEntry.productType === 'liquid' ? '💧 तरल' : '⚖️ पाउडर/दानेदार'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveProductBlock(pIdx)}
                  title="उत्पाद हटाएं"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors self-end sm:self-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* SECTION: PACKAGING SIZE VARIANTS BUILDER */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-gray-900 text-xs block flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      पैकेजिंग साइज वेरिएंट्स (Pack Sizes)
                    </span>
                    <span className="text-[10px] text-gray-500">
                      खरीदे गए अलग-अलग पैक साइज, मात्रा, लागत और बैच दर्ज करें
                    </span>
                  </div>

                  {/* Preset Buttons matching Inventory System */}
                  <div className="flex flex-wrap items-center gap-1">
                    {prodEntry.productType === 'liquid' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(pIdx, { val: 100, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-800 rounded text-[10px] font-bold transition-colors"
                        >
                          + 100ml
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(pIdx, { val: 250, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-800 rounded text-[10px] font-bold transition-colors"
                        >
                          + 250ml
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(pIdx, { val: 500, unit: 'ml', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-800 rounded text-[10px] font-bold transition-colors"
                        >
                          + 500ml
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(pIdx, { val: 1, unit: 'Ltr', type: 'Bottle' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-800 rounded text-[10px] font-bold transition-colors"
                        >
                          + 1L
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(pIdx, { val: 100, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-amber-50 hover:text-amber-800 rounded text-[10px] font-bold transition-colors"
                        >
                          + 100g
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(pIdx, { val: 250, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-amber-50 hover:text-amber-800 rounded text-[10px] font-bold transition-colors"
                        >
                          + 250g
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(pIdx, { val: 500, unit: 'g', type: 'Packet' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-amber-50 hover:text-amber-800 rounded text-[10px] font-bold transition-colors"
                        >
                          + 500g
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddVariant(pIdx, { val: 1, unit: 'kg', type: 'Bag' })}
                          className="px-2 py-1 bg-gray-100 hover:bg-amber-50 hover:text-amber-800 rounded text-[10px] font-bold transition-colors"
                        >
                          + 1kg
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAddVariant(pIdx)}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ नई पैकेजिंग</span>
                    </button>
                  </div>
                </div>

                {/* Existing inventory variants quick selector chips */}
                {existingInventoryVariants.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-900 shrink-0">
                      इन्वेंट्री के मौजूदा वेरिएंट्स जोड़ें:
                    </span>
                    {existingInventoryVariants.map(exVar => (
                      <button
                        key={exVar.id}
                        type="button"
                        onClick={() => handleAddVariant(pIdx, {
                          val: exVar.sizeValue,
                          unit: exVar.sizeUnit,
                          type: exVar.packagingType,
                          cost: exVar.costPrice,
                          selling: exVar.sellingPrice,
                          existingId: exVar.id,
                        })}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-100 hover:text-emerald-900 border border-blue-200 rounded-lg text-[10px] font-bold text-gray-700 flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{exVar.label || `${exVar.sizeValue} ${exVar.sizeUnit} ${exVar.packagingType}`}</span>
                        <span className="text-gray-400 font-normal">₹{exVar.costPrice || 0}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Variant rows list */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {prodEntry.variants.map((v, vIdx) => {
                    const lineTotal = Math.round((Number(v.quantity) || 0) * (Number(v.costPrice) || 0) * 100) / 100;
                    
                    // Landed Cost allocation for this variant line
                    let allocatedTransport = 0;
                    let landedPerPack = Number(v.costPrice) || 0;
                    if (transportCharges > 0 && overallProductCost > 0 && Number(v.quantity) > 0) {
                      allocatedTransport = Math.round((lineTotal / overallProductCost) * transportCharges * 100) / 100;
                      landedPerPack = Math.round(((Number(v.costPrice) || 0) + (allocatedTransport / Number(v.quantity))) * 100) / 100;
                    }

                    // Equivalent volume/weight for this row
                    const rowBaseQty = (Number(v.quantity) || 0) * normalizeToBaseUnit(v.sizeValue, v.sizeUnit);
                    const rowEquivStr = formatBaseUnitDisplay(rowBaseQty, v.sizeUnit === 'ml' || v.sizeUnit === 'Ltr' ? 'ml' : 'g');

                    return (
                      <div 
                        key={v.id || vIdx} 
                        className="p-3 bg-gray-50/90 rounded-2xl border border-gray-200 space-y-2 transition-all hover:border-gray-300"
                      >
                        {/* Row 1: Size, Cost, Sale, Quantity, Line Total */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          {/* Size & Packaging Select */}
                          <div className="sm:col-span-4">
                            <label className="text-[10px] font-bold text-gray-500 block mb-0.5">
                              साइज व पैकेजिंग प्रकार
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                required
                                value={v.sizeValue}
                                onChange={e => handleUpdateVariant(pIdx, vIdx, 'sizeValue', Number(e.target.value))}
                                className="w-16 p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-center text-xs"
                              />
                              <select
                                value={v.sizeUnit}
                                onChange={e => handleUpdateVariant(pIdx, vIdx, 'sizeUnit', e.target.value as SizeUnit)}
                                className="p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-xs"
                              >
                                <option value="ml">ml</option>
                                <option value="Ltr">Ltr</option>
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="Piece">नग</option>
                              </select>
                              <select
                                value={v.packagingType}
                                onChange={e => handleUpdateVariant(pIdx, vIdx, 'packagingType', e.target.value as PackagingType)}
                                className="flex-1 p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-xs"
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

                          {/* Purchase Price (Cost) */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 block mb-0.5">
                              खरीद दर (Cost) ₹
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              value={v.costPrice}
                              onChange={e => handleUpdateVariant(pIdx, vIdx, 'costPrice', Number(e.target.value))}
                              className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-xs text-purple-900"
                            />
                          </div>

                          {/* Selling Price (Suggestion) */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 block mb-0.5">
                              विक्रय दर (Sale) ₹
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="बिक्री दर"
                              value={v.sellingPrice || ''}
                              onChange={e => handleUpdateVariant(pIdx, vIdx, 'sellingPrice', Number(e.target.value))}
                              className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-bold text-xs text-emerald-800"
                            />
                          </div>

                          {/* Quantity (Packs) */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 block mb-0.5">
                              मात्रा (Packs)
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="1"
                              required
                              value={v.quantity}
                              onChange={e => handleUpdateVariant(pIdx, vIdx, 'quantity', Number(e.target.value))}
                              className="w-full p-1.5 bg-white border border-gray-200 rounded-lg font-extrabold text-xs text-center text-blue-900"
                            />
                          </div>

                          {/* Row Total & Action */}
                          <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                            <div className="text-right">
                              <span className="text-[10px] text-gray-400 block sm:hidden">कुल:</span>
                              <span className="font-mono font-black text-xs text-gray-900">₹{lineTotal.toLocaleString()}</span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(pIdx, vIdx)}
                              disabled={prodEntry.variants.length <= 1}
                              title="वेरिएंट हटाएं"
                              className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Batch, MFG, EXP & Landed Cost Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-gray-100 text-[11px]">
                          <div>
                            <span className="text-[9px] text-gray-400 block">बैच नंबर (Batch No.)</span>
                            <input
                              type="text"
                              placeholder="उदा. B-2409"
                              value={v.batchNumber || ''}
                              onChange={e => handleUpdateVariant(pIdx, vIdx, 'batchNumber', e.target.value)}
                              className="w-full p-1 bg-white border border-gray-200 rounded text-[11px] font-mono"
                            />
                          </div>

                          <div>
                            <span className="text-[9px] text-gray-400 block">निर्माण तारीख (MFG)</span>
                            <input
                              type="date"
                              value={v.manufacturingDate || ''}
                              onChange={e => handleUpdateVariant(pIdx, vIdx, 'manufacturingDate', e.target.value)}
                              className="w-full p-1 bg-white border border-gray-200 rounded text-[11px]"
                            />
                          </div>

                          <div>
                            <span className="text-[9px] text-gray-400 block">एक्सपायरी तारीख (EXP)</span>
                            <input
                              type="date"
                              value={v.expiryDate || ''}
                              onChange={e => handleUpdateVariant(pIdx, vIdx, 'expiryDate', e.target.value)}
                              className="w-full p-1 bg-white border border-gray-200 rounded text-[11px]"
                            />
                          </div>

                          <div className="flex flex-col justify-center">
                            <span className="text-[9px] text-gray-400 block">कुल समतुल्य मात्रा:</span>
                            <span className="font-bold text-gray-700 text-[11px]">
                              {rowEquivStr}
                            </span>
                            {transportCharges > 0 && (
                              <span className="text-[10px] text-purple-700 font-bold">
                                लैंडेड: ₹{landedPerPack}/पैक
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product Subtotal Footer Bar */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs bg-gray-50/60 p-2 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 font-medium">
                    कुल सीलबंद पैकेट: <strong className="text-gray-900">{totalPacks} पैकेट</strong>
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600 font-medium">
                    कुल मात्रा / आयतन: <strong className="text-emerald-800">{equivDisplay}</strong>
                  </span>
                </div>

                <div className="font-bold text-gray-800">
                  उत्पाद खरीद उप-योग: <strong className="text-blue-900 font-mono text-sm">₹{totalProdAmount.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
