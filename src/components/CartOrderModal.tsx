import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';

interface CartOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cartItems: CartItem[];
  cartTotal: number;
  cartCount: number;
}

const CartOrderModal: React.FC<CartOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cartItems,
  cartTotal,
  cartCount,
}) => {
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
            className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-[#2D5A27] p-5 text-white text-center shrink-0">
              <div className="bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-7 h-7 text-[#EAB308]" />
              </div>
              <h3 className="text-lg font-bold">ऑर्डर की पुष्टि (Confirm Order)</h3>
              <p className="text-xs text-white/80 mt-1">{cartItems.length} उत्पाद ({cartCount} मात्रा) कार्ट में</p>
            </div>
            
            {/* Scrollable Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Product items review list */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start bg-gray-50 border border-gray-100 p-2.5 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-gray-800 leading-snug">{item.product.hindiName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.product.name} ({item.product.brand})</p>
                      <p className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 mt-1 rounded inline-block">
                        मात्रा: {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-500">₹{item.price} x {item.quantity}</p>
                      <p className="font-bold text-[#2D5A27] mt-0.5">₹{item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Section */}
              <div className="bg-[#F5F2ED] rounded-2xl p-4 border border-[#4A3728]/10 space-y-1.5 shadow-sm text-xs">
                <div className="flex justify-between text-gray-500 font-semibold">
                  <span>कुल उत्पाद (Total Unique Items):</span>
                  <span>{cartItems.length}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-semibold border-b border-gray-200/50 pb-1.5">
                  <span>कुल मात्रा (Total Units):</span>
                  <span>{cartCount}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-bold text-[#4A3728]">कुल देय राशि (Gross Amount):</span>
                  <span className="text-lg font-black text-[#2D5A27]">₹{cartTotal}</span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-[10px] text-orange-850 font-bold leading-relaxed">
                  ⚠️ डिस्क्लेमर: यह सामान आपको स्वयं दुकान पर जाकर लेना होगा; होम डिलीवरी की सुविधा और उसके चार्ज की जानकारी के लिए कृपया दुकानदार से संपर्क करें।
                </p>
              </div>

              <p className="text-xs text-center text-gray-500 px-4">
                क्या आप इस ऑर्डर को WhatsApp पर भेजना चाहते हैं?
              </p>
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartOrderModal;
