import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Building2, Plus, Check, Maximize2, Package } from 'lucide-react';
import { Product, ImageSource } from '../types';
import SmartImage from './SmartImage';
import { cn } from '../lib/utils';

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
  // Extract all available packaging variants dynamically
  const variants = useMemo(() => {
    if (product.variants && product.variants.length > 0) {
      return product.variants;
    }
    if (product.unit) {
      return [{ 
        id: 'default', 
        quantity: product.unit, 
        price: product.price || 0 
      }];
    }
    return [];
  }, [product.variants, product.unit, product.price]);

  // Selected variant state (defaults to first variant)
  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    return variants[0]?.id || 'default';
  });

  // Added animation state
  const [isAdded, setIsAdded] = useState(false);

  // Current active variant
  const activeVariant = useMemo(() => {
    return variants.find(v => v.id === selectedVariantId) || variants[0];
  }, [variants, selectedVariantId]);

  const displayPrice = activeVariant ? activeVariant.price : product.price;
  const displayUnit = activeVariant ? activeVariant.quantity : product.unit;
  const isInStock = product.inStock !== false;

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => onSelect(product)}
      className={cn(
        "bg-white rounded-2xl border border-gray-200/90 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between overflow-hidden group cursor-pointer relative h-full",
        !isInStock && "opacity-80"
      )}
    >
      {/* TOP: Large Product Image Section - Full-Bleed Edge-to-Edge */}
      <div 
        className="relative h-48 sm:h-52 md:h-56 w-full overflow-hidden border-b border-gray-100 cursor-zoom-in bg-white"
        onClick={(e) => {
          e.stopPropagation();
          onZoom(product.image, product.hindiName);
        }}
      >
        <SmartImage 
          src={product.image} 
          alt={product.hindiName || product.name} 
          className="w-full h-full transition-transform duration-300 group-hover:scale-105" 
          objectFit="cover"
        />

        {/* Out of Stock Overlay / Badge */}
        {!isInStock ? (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider bg-red-600 px-3 py-1 rounded-full shadow-lg border border-white/30 rotate-[-8deg]">
              STOCK OUT
            </span>
          </div>
        ) : (
          // Subtle Zoom Icon on Hover
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onZoom(product.image, product.hindiName);
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
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#2D5A27] bg-[#2D5A27]/5 px-2 py-0.5 rounded-md border border-[#2D5A27]/15 truncate">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{product.brand || 'कृषि उत्पाद'}</span>
            </div>
            {product.customId && (
              <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-tight shrink-0">
                {product.customId}
              </span>
            )}
          </div>

          {/* Product Name (Most Prominent) */}
          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug group-hover:text-[#2D5A27] transition-colors line-clamp-1">
            {product.hindiName}
          </h3>
          {product.name && (
            <p className="text-xs text-gray-500 font-medium line-clamp-1 mb-1.5">
              {product.name}
            </p>
          )}

          {/* Short Product Information */}
          {product.description && (
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2.5 font-normal">
              {product.description}
            </p>
          )}

          {/* Available Packaging Variants (उपलब्ध पैक) */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
              <Package className="w-3 h-3 text-gray-400" />
              उपलब्ध पैक:
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
                      "text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                      isSelected
                        ? "bg-[#2D5A27] text-white border-[#2D5A27] shadow-xs scale-105"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    )}
                    title={`${v.quantity} - ₹${v.price}`}
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
          {/* Price Display */}
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              {product.hidePrice || !displayPrice ? (
                <span className="text-xs text-gray-400 font-medium">कीमत उपलब्ध नहीं</span>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-extrabold text-[#2D5A27]">
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
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                स्टॉक खत्म
              </span>
            )}
          </div>

          {/* Action Buttons: Add to Cart & Buy Now */}
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={!isInStock}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product, activeVariant);
                setIsAdded(true);
                setTimeout(() => setIsAdded(false), 1400);
              }}
              className={cn(
                "py-2.5 px-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer",
                !isInStock
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  : isAdded
                    ? "bg-emerald-700 text-white"
                    : "bg-[#2D5A27] hover:bg-[#23471f] text-white"
              )}
              title={isInStock ? "कार्ट में जोड़ें" : "स्टॉक समाप्त"}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Added ✓</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add To Cart</span>
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
                "py-2.5 px-2 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer",
                isInStock
                  ? "bg-[#EAB308] hover:bg-[#d4a007] text-[#2D5A27]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
              title={isInStock ? "सीधे ऑर्डर करें" : "स्टॉक समाप्त"}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isInStock ? 'अभी खरीदें' : 'खत्म'}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default KrishiBazaarProductCard;
