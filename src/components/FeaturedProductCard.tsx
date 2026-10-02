import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Maximize2, Package } from 'lucide-react';
import { Product, ImageSource } from '../types';
import SmartImage from './SmartImage';
import { cn } from '../lib/utils';

interface FeaturedProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onZoom: (src: string | ImageSource, alt: string) => void;
  onBuy: (product: Product, variant?: { id: string; quantity: string; price: number }) => void;
  index: number;
}

export const FeaturedProductCard: React.FC<FeaturedProductCardProps> = ({
  product,
  onSelect,
  onZoom,
  onBuy,
  index
}) => {
  // Extract all available packaging variants dynamically from database
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

  // Determine active variant
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onSelect(product)}
      className={cn(
        "min-w-[210px] sm:min-w-[220px] md:min-w-0 bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-200/80 overflow-hidden snap-start flex flex-col justify-between cursor-pointer group transition-shadow duration-200 relative h-full",
        !isInStock && "opacity-75 grayscale-[0.3]"
      )}
    >
      {/* Product Image Section - Full-Bleed Edge-to-Edge with 1:1 Square Proportion */}
      <div 
        className="relative aspect-square w-full overflow-hidden border-b border-gray-100 cursor-zoom-in bg-white"
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

        {/* Out of stock badge */}
        {!isInStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="text-[10px] sm:text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-full shadow-lg border border-white/30 rotate-[-8deg]">
              स्टॉक समाप्त
            </span>
          </div>
        )}

        {/* Quick Zoom Icon */}
        {isInStock && (
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

      {/* Product Details Section */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Custom Product ID */}
          {product.customId && (
            <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase inline-block mb-1.5">
              {product.customId}
            </span>
          )}

          {/* Product Hindi Title */}
          <h4 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#2D5A27] transition-colors line-clamp-1">
            {product.hindiName}
          </h4>

          {/* Subtitle / English Name */}
          {product.name && (
            <p className="text-[11px] text-gray-500 font-normal line-clamp-1 mb-2">
              {product.name}
            </p>
          )}

          {/* Available Packaging Sizes (उपलब्ध पैकिंग) */}
          <div className="my-2 pt-1.5 border-t border-gray-100/80">
            <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mb-1.5">
              <Package className="w-3 h-3 text-gray-400" /> 
              उपलब्ध पैकिंग:
            </span>

            {/* Packaging Chips List */}
            <div className="flex flex-wrap gap-1.5">
              {variants.map((variant) => {
                const isSelected = variant.id === (activeVariant?.id || 'default');
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVariantSelect(variant.id);
                    }}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                      isSelected
                        ? "bg-[#2D5A27] text-white border-[#2D5A27] shadow-xs scale-105 font-semibold"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    )}
                    title={`${variant.quantity} - ₹${variant.price}`}
                  >
                    {variant.quantity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Price & Action Area */}
        <div className="pt-2.5 mt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            {product.hidePrice || !displayPrice ? (
              <span className="text-[10px] text-gray-400 font-medium">कीमत उपलब्ध नहीं</span>
            ) : (
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold text-[#2D5A27]">
                  ₹{displayPrice}
                </span>
                {displayUnit && (
                  <span className="text-[10px] text-gray-400 font-medium leading-none">
                    प्रति {displayUnit}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Add to Cart / Buy Button */}
          <button
            type="button"
            disabled={!isInStock}
            onClick={(e) => {
              e.stopPropagation();
              onBuy(product, activeVariant);
            }}
            className={cn(
              "p-2 sm:p-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer",
              isInStock
                ? "bg-[#EAB308] hover:bg-[#d4a007] text-[#2D5A27] active:scale-90"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
            title={isInStock ? "खरीदें / कार्ट में जोड़ें" : "स्टॉक समाप्त"}
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default FeaturedProductCard;
