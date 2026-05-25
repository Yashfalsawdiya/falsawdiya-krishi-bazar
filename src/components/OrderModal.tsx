import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import SmartImage from './SmartImage';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  product: Product | null;
}

const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, onConfirm, product }) => {
  if (!product) return null;

  const displayPrice = product.price || 0;
  const displayUnit = product.unit || '1 unit';
  const displayBrand = product.brand || '';
  const displayHindiName = product.hindiName || product.name;
  const displayEnglishName = product.name;

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
            className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-[#2D5A27] p-5 text-white text-center">
              <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-7 h-7 text-[#EAB308]" />
              </div>
              <h3 className="text-lg font-bold">ऑर्डर की पुष्टि (Confirm Order)</h3>
            </div>
            
            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Product Layout Section */}
              <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-2xl flex gap-3 shadow-inner">
                {/* Product Image */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-white">
                  <SmartImage
                    src={product.image}
                    alt={displayHindiName}
                    className="w-full h-full"
                    objectFit="cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    {/* Brand */}
                    <span className="text-[9px] text-[#2D5A27] font-extrabold uppercase tracking-widest bg-[#2D5A27]/5 px-2 py-0.5 rounded-md border border-[#2D5A27]/10">
                      {displayBrand}
                    </span>
                    {/* Hindi and English Names */}
                    <h4 className="font-bold text-xs.5 text-gray-800 leading-tight mt-1 truncate">
                      {displayHindiName}
                    </h4>
                    <p className="text-[10px] text-gray-400 truncate">{displayEnglishName}</p>
                  </div>
                  
                  {/* Variant Tag */}
                  <div className="mt-1.5">
                    <span className="text-[10px] text-amber-700 font-extrabold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-sm inline-flex items-center">
                      मात्रा (Variant): {displayUnit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing section */}
              <div className="bg-[#F5F2ED] rounded-2xl p-4 border border-[#4A3728]/10 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500 font-semibold">
                  <span>इकाई मूल्य (Per Unit Price):</span>
                  <span className="text-gray-700">
                    {product.hidePrice || !displayPrice ? 'कीमत उपलब्ध नहीं' : `₹${displayPrice}`}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200/50 pt-2">
                  <span className="text-sm font-bold text-[#4A3728]">कुल राशि (Total Amount):</span>
                  <span className="text-lg font-black text-[#2D5A27]">
                    {product.hidePrice || !displayPrice ? 'कीमत उपलब्ध नहीं' : `₹${displayPrice}`}
                  </span>
                </div>
              </div>

              {/* Delivery Warning/Disclaimer */}
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-[10px] text-orange-850 font-bold leading-relaxed">
                  ⚠️ डिस्क्लेमर: यह सामान आपको स्वयं दुकान पर जाकर लेना होगा; होम डिलीवरी की सुविधा और उसके चार्ज की जानकारी के लिए कृपया दुकानदार से संपर्क करें।
                </p>
              </div>

              <p className="text-xs text-center text-gray-500 px-4">
                क्या आप इस ऑर्डर को WhatsApp पर भेजना चाहते हैं?
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 text-xs active:scale-95 transition-transform bg-white"
                >
                  <X className="w-3.5 h-3.5" /> नहीं (No)
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#2D5A27] text-white font-bold text-xs shadow-md shadow-[#2D5A27]/10 active:scale-95 transition-transform"
                >
                  <Check className="w-3.5 h-3.5" /> हाँ (Yes)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderModal;
