import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ShoppingBag } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  price: number;
  hidePrice?: boolean;
}

const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, onConfirm, productName, price, hidePrice }) => {
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
            <div className="bg-[#2D5A27] p-6 text-white text-center">
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-[#EAB308]" />
              </div>
              <h3 className="text-xl font-bold">ऑर्डर की पुष्टि (Confirm Order)</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-[#F5F2ED] rounded-2xl p-4 border border-[#4A3728]/10">
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">उत्पाद (Product)</p>
                <p className="font-bold text-[#4A3728] text-lg">{productName}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#4A3728]/10">
                  <p className="text-sm font-bold text-gray-600">कुल राशि (Total):</p>
                  <p className="text-xl font-bold text-[#2D5A27]">
                    {hidePrice || !price ? 'कीमत उपलब्ध नहीं' : `₹${price}`}
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-[10px] text-orange-800 font-bold leading-relaxed">
                  ⚠️ डिस्क्लेमर: यह सामान आपको स्वयं दुकान पर जाकर लेना होगा; होम डिलीवरी की सुविधा और उसके चार्ज की जानकारी के लिए कृपया दुकानदार से संपर्क करें।
                </p>
              </div>

              <p className="text-sm text-center text-gray-500 px-4">
                क्या आप इस ऑर्डर को WhatsApp पर भेजना चाहते हैं?
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-100 font-bold text-gray-500 active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4" /> नहीं (No)
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2D5A27] text-white font-bold shadow-lg shadow-[#2D5A27]/20 active:scale-95 transition-transform"
                >
                  <Check className="w-4 h-4" /> हाँ (Yes)
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
