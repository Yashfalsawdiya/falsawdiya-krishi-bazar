import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Building2, Tag, Info, Wheat } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onBuy: (product: Product) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product, onBuy }) => {
  if (!product) return null;

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
            <div className="relative h-64 sm:h-80 bg-gray-100 flex-shrink-0">
              <img 
                src={product.image} 
                alt={product.hindiName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-3 mb-2 justify-center sm:justify-start">
                  <span className="bg-[#EAB308] text-[#2D5A27] text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {product.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-white/90">
                    <Building2 className="w-3.5 h-3.5 text-[#EAB308]" />
                    {product.brand}
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold leading-tight">{product.hindiName}</h3>
                <p className="text-sm text-white/80 mt-1">{product.name}</p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Price and Unit Section */}
              <div className="flex items-center justify-between bg-[#F5F2ED] p-4 rounded-2xl border border-[#4A3728]/10">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#4A3728]/60 font-bold uppercase mb-1">
                    <Tag className="w-3.5 h-3.5" /> कीमत (Price)
                  </div>
                  {product.hidePrice ? (
                    <span className="text-sm font-bold text-gray-400">उपलब्ध नहीं</span>
                  ) : (
                    <span className="text-2xl font-bold text-[#2D5A27]">₹{product.price}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-xs text-[#4A3728]/60 font-bold uppercase mb-1 justify-end">
                    इकाई (Unit)
                  </div>
                  <span className="text-lg font-bold text-[#4A3728]">{product.unit || 'N/A'}</span>
                </div>
              </div>

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

              {/* Disclaimer */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="text-xs text-orange-800 leading-relaxed">
                  <span className="font-bold block mb-1">⚠️ महत्वपूर्ण जानकारी:</span>
                  दवाओं का उपयोग कृषि विशेषज्ञ या पैकेट के पीछे लिखे निर्देशों के अनुसार ही करें। अपनी मिट्टी और फसल की स्थिति के अनुसार मात्रा निर्धारित करें।
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
                onClick={() => {
                  onClose();
                  onBuy(product);
                }}
                className="flex-[2] py-4 bg-[#2D5A27] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#2D5A27]/20 active:scale-95 transition-transform"
              >
                <ShoppingBag className="w-5 h-5" /> अभी खरीदें (Buy)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;
