import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Building2, Tag, Info, Wheat, Maximize2, Droplets } from 'lucide-react';
import { Product } from '../types';
import SmartImage from './SmartImage';
import ImageZoomModal from './ImageZoomModal';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onBuy: (product: Product) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product, onBuy }) => {
  const { categories } = useAppContext();
  const [isZoomOpen, setIsZoomOpen] = React.useState(false);
  const [selectedVariant, setSelectedVariant] = React.useState<{id: string; quantity: string; price: number} | null>(null);

  const categoryName = React.useMemo(() => {
    if (!product || !categories) return '';
    const cat = categories.find(c => c.id === product.category);
    return cat ? cat.name : product.category;
  }, [product, categories]);

  React.useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [product]);

  if (!product) return null;

  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const displayUnit = selectedVariant ? selectedVariant.quantity : product.unit;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header Image */}
            <div className="relative h-64 sm:h-80 flex-shrink-0 overflow-hidden group cursor-zoom-in" onClick={() => setIsZoomOpen(true)}>
              <SmartImage 
                src={product.image} 
                alt={product.hindiName}
                className="w-full h-full transition-transform duration-700 group-hover:scale-110"
                objectFit="cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-3 mb-2 justify-center sm:justify-start">
                  {product.customId ? (
                    <span className="bg-[#EAB308] text-[#2D5A27] text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      {product.customId}
                    </span>
                  ) : (
                    <span className="bg-[#EAB308] text-[#2D5A27] text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      ITEM-{product.id.substring(0, 4).toUpperCase()}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-white/90 font-bold">
                    <Building2 className="w-3.5 h-3.5 text-[#EAB308]" />
                    {product.brand}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/70 font-bold">
                    <Tag className="w-3.5 h-3.5 text-white/50" />
                    {categoryName}
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md",
                    product.inStock !== false ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", product.inStock !== false ? "bg-green-400" : "bg-red-400")} />
                    {product.inStock !== false ? 'In Stock' : 'Out of Stock'}
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold leading-tight">{product.hindiName}</h3>
                <p className="text-sm text-white/80 mt-1">{product.name}</p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Variants Section */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#4A3728]">
                    <Tag className="w-4 h-4 text-[#2D5A27]" />
                    उपलब्ध मात्रा चुनें (Select Quantity)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v, i) => (
                      <button
                        key={`${v.id}-${i}`}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "px-4 py-3 rounded-2xl text-xs font-bold transition-all border-2",
                          selectedVariant?.id === v.id
                            ? "bg-[#2D5A27] border-[#2D5A27] text-white shadow-md shadow-[#2D5A27]/20 scale-105"
                            : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        {v.quantity}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price and Unit Section */}
              {(displayPrice || product.hidePrice) ? (
                <div className="flex items-center justify-between bg-[#F5F2ED] p-4 rounded-2xl border border-[#4A3728]/10">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[#4A3728]/60 font-bold uppercase mb-1">
                      <Tag className="w-3.5 h-3.5" /> कीमत (Price)
                    </div>
                    {product.hidePrice || !displayPrice ? (
                      <span className="text-sm font-bold text-gray-400">कीमत उपलब्ध नहीं</span>
                    ) : (
                      <div className="flex items-baseline gap-1 animate-in fade-in zoom-in-95 duration-300" key={displayPrice}>
                        <span className="text-2xl font-bold text-[#2D5A27]">₹{displayPrice}</span>
                        {displayUnit && (
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-1">
                            / {displayUnit}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-xs text-[#4A3728]/60 font-bold uppercase mb-1 justify-end">
                      स्थिति (Status)
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-3 py-1 rounded-lg",
                      product.inStock !== false ? "bg-[#2D5A27]/10 text-[#2D5A27]" : "bg-red-50 text-red-600"
                    )}>
                      {product.inStock !== false ? '🟢 उपलब्ध' : '🔴 स्टॉक में नहीं'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">कीमत और उपलब्धता</p>
                  <p className="text-sm font-bold text-[#4A3728]">कीमत उपलब्ध नहीं है</p>
                </div>
              )}

              {/* Crops Section */}
              {product.crops && product.crops.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#4A3728]">
                    <Wheat className="w-4 h-4 text-[#2D5A27]" />
                    उपयोगी फसलें (Target Crops)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.crops.map((crop, i) => (
                      <span key={i} className="bg-[#2D5A27]/10 text-[#2D5A27] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#2D5A27]/20">
                        {crop}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#4A3728]">
                  <Info className="w-4 h-4 text-[#2D5A27]" />
                  उत्पाद विवरण (Product Description)
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 leading-relaxed text-gray-700 text-sm whitespace-pre-wrap">
                  {product.description || 'विवरण उपलब्ध नहीं है।'}
                </div>
              </div>

              {/* Dosage Section */}
              {product.dosage?.show && product.dosage.value && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#4A3728]">
                    <Droplets className="w-4 h-4 text-[#2D5A27]" />
                    खुराक (Dosage / Usage)
                  </div>
                  <div className="bg-[#E7F3E1] rounded-2xl border border-[#2D5A27]/10 p-4 leading-relaxed text-[#2D5A27] text-sm whitespace-pre-wrap font-medium">
                    {product.dosage.value}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="text-xs text-orange-800 leading-relaxed">
                  <span className="font-bold block mb-1">⚠️ महत्वपूर्ण जानकारी:</span>
                  खाद, बीज एवं कृषि दवाइयों का उपयोग हमेशा कृषि विशेषज्ञ की सलाह या उत्पाद पैकेट पर दिए गए निर्देशों के अनुसार ही करें। बेहतर परिणामों के लिए अपनी मिट्टी, फसल की अवस्था और आवश्यकता के अनुसार सही मात्रा का चयन करें।
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4 flex-shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                बंद करें
              </button>
              <button
                disabled={product.inStock === false}
                onClick={() => {
                  onClose();
                  // Passing the selected variant's info in a clone for the order message
                  const productWithSelection = {
                    ...product,
                    price: displayPrice || 0,
                    unit: displayUnit || ''
                  };
                  onBuy(productWithSelection);
                }}
                className={cn(
                  "flex-[2] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-white",
                  product.inStock !== false 
                    ? "bg-[#2D5A27] shadow-[#2D5A27]/20" 
                    : "bg-gray-300 shadow-none cursor-not-allowed"
                )}
              >
                <ShoppingBag className="w-5 h-5" /> 
                {product.inStock !== false ? 'अभी खरीदें (Buy)' : 'आउट ऑफ स्टॉक'}
              </button>
            </div>

            <ImageZoomModal 
              isOpen={isZoomOpen}
              onClose={() => setIsZoomOpen(false)}
              imageSrc={product.image}
              altText={product.hindiName}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;
