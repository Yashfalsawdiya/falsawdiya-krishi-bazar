import React from 'react';
import { 
  X, ShoppingBag, Plus, Minus, Check, AlertTriangle, 
  Tag, Info, Wheat, Droplets, Building2, Maximize2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import SmartImage from './SmartImage';
import ImageZoomModal from './ImageZoomModal';
import { cn } from '../lib/utils';
import { openProductWhatsAppEnquiry } from '../utils/whatsappHelper';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onBuy?: (product: Product, variant?: { id: string; quantity: string; price: number }) => void;
  cartItemId?: string;
  onCartItemIdChange?: (newCartItemId: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  product, 
  onBuy,
  cartItemId,
  onCartItemIdChange
}) => {
  const navigate = useNavigate();
  const { categories } = useAppContext();
  const { addToCart, cartItems, updateQuantity, updateVariant } = useCart();
  const [isZoomOpen, setIsZoomOpen] = React.useState(false);
  const [selectedVariant, setSelectedVariant] = React.useState<{id: string; quantity: string; price: number} | null>(null);
  const [isAdded, setIsAdded] = React.useState(false);

  const currentCartItem = React.useMemo(() => {
    if (!product) return null;
    const unitToMatch = selectedVariant ? selectedVariant.quantity : (product.unit || '1 unit');
    return cartItems.find(item => item.product.id === product.id && item.unit === unitToMatch);
  }, [product, selectedVariant, cartItems]);

  const handleVariantClick = (v: { id: string; quantity: string; price: number }) => {
    setSelectedVariant(v);
    if (cartItemId && onCartItemIdChange) {
      const item = cartItems.find(i => i.id === cartItemId);
      if (item) {
        updateVariant(cartItemId, v);
        const newCartItemId = `${item.product.id}-${v.id}`;
        onCartItemIdChange(newCartItemId);
      }
    }
  };

  const categoryName = React.useMemo(() => {
    if (!product || !categories) return '';
    const cat = categories.find(c => c.id === product.category);
    return cat ? cat.name : product.category;
  }, [product, categories]);

  // Set default variant on open
  React.useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const displayUnit = selectedVariant ? selectedVariant.quantity : product.unit;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header / Banner Section */}
            <div className="relative h-64 sm:h-72 bg-[#FAF8F5] overflow-hidden flex-shrink-0 flex items-center justify-center">
              <div 
                className="w-full h-full cursor-zoom-in"
                onClick={() => setIsZoomOpen(true)}
              >
                <SmartImage 
                  src={product.image} 
                  alt={product.hindiName || product.name} 
                  className="w-full h-full"
                  objectFit="contain"
                />
              </div>

              {/* Gradient Overlay for Text Visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all active:scale-95 z-20 cursor-pointer"
                title="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Zoom Button */}
              <button
                onClick={() => setIsZoomOpen(true)}
                className="absolute top-4 left-4 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all active:scale-95 z-20 cursor-pointer"
                title="इमेज बड़ी करें"
              >
                <Maximize2 className="w-5 h-5" />
              </button>

              {/* Title & Brand on Top of Banner */}
              <div className="absolute bottom-4 left-6 right-6 text-white z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {product.brand && (
                    <span className="flex items-center gap-1 bg-[#2D5A27] text-emerald-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md border border-white/20">
                      <Building2 className="w-3 h-3" /> {product.brand}
                    </span>
                  )}
                  {categoryName && (
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md border border-white/10">
                      {categoryName}
                    </span>
                  )}
                  <div className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md",
                    product.inStock !== false ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", product.inStock !== false ? "bg-green-400" : "bg-red-400")} />
                    {product.inStock !== false ? 'स्टॉक में उपलब्ध' : 'स्टॉक खत्म'}
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                  {product.hindiName || product.name}
                </h3>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Variants Section */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#4A3728]">
                    <Tag className="w-4 h-4 text-[#2D5A27]" />
                    उपलब्ध मात्रा चुनें
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v, i) => (
                      <button
                        key={`${v.id}-${i}`}
                        type="button"
                        onClick={() => handleVariantClick(v)}
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
                      <Tag className="w-3.5 h-3.5" /> कीमत
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
                      स्थिति
                    </div>
                    <span className={cn(
                      "text-xs font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1.5",
                      product.inStock !== false ? "bg-[#2D5A27]/10 text-[#2D5A27]" : "bg-red-50 text-red-600"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", product.inStock !== false ? "bg-emerald-600" : "bg-red-600")} />
                      {product.inStock !== false ? 'स्टॉक में उपलब्ध' : 'स्टॉक खत्म'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">कीमत और उपलब्धता</p>
                  <p className="text-sm font-bold text-[#4A3728]">कीमत उपलब्ध नहीं है</p>
                </div>
              )}

              {/* Cart Qty Editor within the modal content list */}
              {currentCartItem && (
                <div className="bg-[#E7F3E1] p-4 rounded-2xl border-2 border-[#2D5A27]/20 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-black text-[#2D5A27] uppercase tracking-wider mb-0.5">यह मात्रा कार्ट में है</h5>
                    <p className="text-[10px] text-[#2D5A27]/70 font-semibold">आप यहाँ से भी मात्रा बदल सकते हैं</p>
                  </div>
                  <div className="flex items-center border border-[#2D5A27]/30 rounded-xl p-0.5 shadow-inner bg-white">
                    <button
                      type="button"
                      onClick={() => updateQuantity(currentCartItem.id, currentCartItem.quantity - 1)}
                      className="p-1.5 hover:bg-gray-50 text-[#2D5A27] rounded active:scale-95 transition-transform"
                      title="Decrease quantity"
                    >
                      <Minus className="w-4 h-4 font-bold" />
                    </button>
                    <span className="px-4 text-xs font-black text-gray-800 antialiased leading-none min-w-[20px] text-center">
                      {currentCartItem.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(currentCartItem.id, currentCartItem.quantity + 1)}
                      className="p-1.5 hover:bg-gray-50 text-[#2D5A27] rounded active:scale-95 transition-transform"
                      title="Increase quantity"
                    >
                      <Plus className="w-4 h-4 font-bold" />
                    </button>
                  </div>
                </div>
              )}

              {/* Crops Section */}
              {product.crops && product.crops.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#4A3728]">
                    <Wheat className="w-4 h-4 text-[#2D5A27]" />
                    उपयोगी फसलें
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
                  उत्पाद विवरण
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
                    खुराक (डोज़)
                  </div>
                  <div className="bg-[#E7F3E1] rounded-2xl border border-[#2D5A27]/10 p-4 leading-relaxed text-[#2D5A27] text-sm whitespace-pre-wrap font-medium">
                    {product.dosage.value}
                  </div>
                </div>
              )}

              {/* Dynamic Category Disclaimer */}
              {(() => {
                const productCategory = categories.find(c => c.id === product.category);
                if (productCategory && productCategory.isInfoEnabled && productCategory.importantInfo) {
                  return (
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 shadow-sm">
                      <p className="text-xs text-orange-800 leading-relaxed">
                        <span className="font-bold flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          महत्वपूर्ण जानकारी ({productCategory.name}):
                        </span>
                        {productCategory.importantInfo}
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2.5 flex-shrink-0 flex-wrap sm:flex-nowrap">
              <button
                onClick={onClose}
                className="py-3 px-4 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform text-xs cursor-pointer"
              >
                बंद करें
              </button>

              {product.hidePrice ? (
                <button
                  type="button"
                  onClick={() => {
                    openProductWhatsAppEnquiry(
                      product.hindiName || product.name,
                      product.brand,
                      displayUnit,
                      product.customId
                    );
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp पर कीमत व जानकारी पूछें</span>
                </button>
              ) : (
                <>
                  <button
                    disabled={product.inStock === false}
                    onClick={() => {
                      addToCart(product, selectedVariant || undefined);
                      setIsAdded(true);
                      setTimeout(() => {
                        setIsAdded(false);
                      }, 1200);
                    }}
                    className={cn(
                      "flex-[1.5] py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-xs cursor-pointer",
                      product.inStock !== false 
                        ? isAdded
                          ? "bg-green-600 text-white shadow-green-600/10"
                          : "bg-[#2D5A27] text-white hover:bg-[#2D5A27]/95 shadow-[#2D5A27]/10" 
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAdded ? 'जोड़ दिया गया' : 'कार्ट में जोड़ें'}
                  </button>
                  <button
                    disabled={product.inStock === false}
                    onClick={() => {
                      onClose();
                      addToCart(product, selectedVariant || undefined);
                      navigate('/cart');
                    }}
                    className={cn(
                      "flex-[1.5] py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-xs cursor-pointer",
                      product.inStock !== false 
                        ? "bg-[#EAB308] text-[#2D5A27] hover:bg-amber-500 shadow-md shadow-amber-500/10" 
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <ShoppingBag className="w-4 h-4" /> 
                    {product.inStock !== false ? 'अभी खरीदें' : 'स्टॉक खत्म'}
                  </button>
                </>
              )}
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
