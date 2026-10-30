import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Building2, Plus, Check, Maximize2, Package, MessageSquare } from 'lucide-react';
import { Product, ImageSource } from '../types';
import SmartImage from './SmartImage';
import { cn } from '../lib/utils';
import { openProductWhatsAppEnquiry } from '../utils/whatsappHelper';
import { useAppContext } from '../context/AppContext';

interface KrishiBazaarProductCardProps {
  product: Product;
  index: number;
  onSelect: (product: Product) => void;
  onZoom: (src: string | ImageSource, alt: string) => void;
  onAddToCart: (product: Product, variant?: { id: string; quantity: string; price: number }) => void;
  onBuy: (product: Product, variant?: { id: string; quantity: string; price: number }) => void;
}

export const KrishiBazaarProductCard: React.FC<KrishiBazaarProductCardProps> = ({
  product,
  index,
  onSelect,
  onZoom,
  onAddToCart,
  onBuy
}) => {
  const { appContent } = useAppContext();
  const isPriceHidden = Boolean(appContent?.hideAllProductPrices || product.hidePrice);
  // Extract all available packaging variants dynamically
  const variants = useMemo(() => {
    if (product.variants && product.variants.length > 0) {
      return product.variants;
    }
    // Fallback: build default variant from primary product fields
    return [{
      id: 'default',
      quantity: product.unit || '1 unit',
      price: product.price || 0
    }];
  }, [product.variants, product.unit, product.price]);

  // Track the user-selected active packaging variant
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || 'default');
  const [isAdded, setIsAdded] = useState(false);

  // Derive the active variant configuration
  const activeVariant = useMemo(() => {
    return variants.find(v => v.id === selectedVariantId) || variants[0];
  }, [variants, selectedVariantId]);

  const displayPrice = activeVariant?.price || product.price || 0;
  const displayUnit = activeVariant?.quantity || product.unit || '';
  const isInStock = product.inStock !== false;

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
      onClick={() => onSelect(product)}
      className={cn(
        "bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between overflow-hidden group cursor-pointer relative h-full",
        !isInStock && "opacity-75 grayscale-[0.3]"
      )}
    >
      {/* Product Image Section - Exactly matching FeaturedProductCard */}
      <div 
        className="relative aspect-square w-full overflow-hidden border-b border-gray-100 cursor-zoom-in bg-white"
        onClick={(e) => {
          e.stopPropagation();
          onZoom(product.image, product.hindiName || product.name);
        }}
      >
        <SmartImage 
          src={product.image} 
          alt={product.hindiName || product.name} 
          className="w-full h-full transition-transform duration-300 group-hover:scale-105" 
          objectFit="cover"
        />

        {/* Out of stock badge */}
        {!isInStock ? (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="text-[10px] sm:text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-full shadow-lg border border-white/30 rotate-[-8deg]">
              स्टॉक खत्म
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(product.image, product.hindiName || product.name);
            }}
            className="absolute bottom-2.5 right-2.5 bg-white/90 hover:bg-white text-gray-700 p-1.5 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
            title="इमेज बड़ी करें"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* MIDDLE: Product Information Hierarchy */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand + Custom ID row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#2D5A27] bg-[#2D5A27]/5 px-2 py-0.5 rounded-md border border-[#2D5A27]/15 truncate">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{product.brand || 'कृषि उत्पाद'}</span>
            </div>
            {product.customId && (
              <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase shrink-0">
                {product.customId}
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug group-hover:text-[#2D5A27] transition-colors line-clamp-1 mb-1.5">
            {product.hindiName || product.name}
          </h3>

          {/* Short Product Information */}
          {product.description && (
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2.5 font-normal">
              {product.description}
            </p>
          )}

          {/* Available Packaging Variants (उपलब्ध पैक) */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mb-1.5">
              <Package className="w-3 h-3 text-gray-400" />
              उपलब्ध पैक
            </span>

            {/* Packaging Chips */}
            <div className="flex flex-wrap gap-1.5">
              {variants.map((v) => {
                const isSelected = v.id === (activeVariant?.id || 'default');
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVariantSelect(v.id);
                    }}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                      isSelected
                        ? "bg-[#2D5A27] text-white border-[#2D5A27] shadow-xs scale-105 font-semibold"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    )}
                    title={isPriceHidden ? v.quantity : `${v.quantity} - ₹${v.price}`}
                  >
                    {v.quantity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM: Price & Action Buttons */}
        <div className="pt-3 mt-3 border-t border-gray-100">
          {isPriceHidden ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                  कीमत उपलब्ध नहीं
                </span>
                {!isInStock && (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    स्टॉक खत्म
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openProductWhatsAppEnquiry(
                    product.hindiName || product.name,
                    product.brand,
                    displayUnit,
                    product.customId
                  );
                }}
                className="w-full h-10 py-2 px-3 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                title="कीमत जानने के लिए WhatsApp पर संपर्क करें"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp पर कीमत पूछें</span>
              </button>
            </div>
          ) : (
            <>
              {/* Price Display */}
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  {!displayPrice ? (
                    <span className="text-xs text-gray-400 font-medium">मूल्य उपलब्ध नहीं</span>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base sm:text-lg font-bold text-[#2D5A27]">
                        ₹{displayPrice}
                      </span>
                      {displayUnit && (
                        <span className="text-[11px] text-gray-500 font-medium">
                          / {displayUnit}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {!isInStock && (
                  <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    स्टॉक खत्म
                  </span>
                )}
              </div>

              {/* Action Buttons: Add to Cart & Buy Now */}
              <div className="flex items-center gap-2">
                <button
                  disabled={!isInStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product, activeVariant);
                    setIsAdded(true);
                    setTimeout(() => setIsAdded(false), 1400);
                  }}
                  className={cn(
                    "flex-1 h-10 py-2 px-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap",
                    !isInStock
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                      : isAdded
                        ? "bg-emerald-700 text-white"
                        : "bg-[#2D5A27] hover:bg-[#23471f] text-white"
                  )}
                  title={isInStock ? 'कार्ट में जोड़ें' : 'स्टॉक खत्म'}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>जोड़ दिया गया</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>कार्ट में जोड़ें</span>
                    </>
                  )}
                </button>

                <button
                  disabled={!isInStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuy(product, activeVariant);
                  }}
                  className={cn(
                    "w-10 h-10 shrink-0 rounded-xl shadow-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer",
                    isInStock
                      ? "bg-[#EAB308] hover:bg-[#d4a007] text-[#2D5A27]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                  title={isInStock ? 'तुरंत खरीदें' : 'स्टॉक खत्म'}
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default KrishiBazaarProductCard;
