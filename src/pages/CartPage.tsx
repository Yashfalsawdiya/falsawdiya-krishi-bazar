import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAppContext } from '../context/AppContext';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingCart, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import CartOrderModal from '../components/CartOrderModal';

const CartPage: React.FC = () => {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, cartCount, clearCart } = useCart();
  const { appContent } = useAppContext();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const whatsappNumber = appContent?.contactInfo.whatsapp || '918982338046';

  const handleBack = () => {
    navigate('/products');
  };

  const handleSendOrder = () => {
    if (cartItems.length === 0) return;
    setIsConfirmOpen(true);
  };

  const handleConfirmOrder = () => {
    setIsConfirmOpen(false);
    clearCart();
  };

  return (
    <div className="space-y-4">
      {/* Top Header Row with Back button */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 text-[#4A3728]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[#4A3728]">मेरा कार्ट (My Cart)</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{cartCount} Items Selected</p>
        </div>
        {cartItems.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-red-500 font-bold hover:underline px-3 py-1 bg-red-50 rounded-lg"
          >
            साफ करें (Empty)
          </button>
        )}
      </div>

      {/* Cart Page Content */}
      <AnimatePresence mode="popLayout">
        {cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-12 px-6 bg-white rounded-3xl border border-dashed border-gray-200 mt-4 space-y-4"
          >
            <div className="w-20 h-20 bg-[#2D5A27]/5 rounded-full flex items-center justify-center mx-auto text-[#2D5A27]/30">
              <ShoppingCart className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-bold text-gray-700 text-lg">आपका कार्ट खाली है</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                कृपया कृषि बाज़ार से बीज, खाद या दवाइयां अपने कार्ट में जोड़ें।
              </p>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="px-6 py-3 bg-[#2D5A27] text-white rounded-2xl text-xs font-bold shadow-md hover:bg-[#2D5A27]/90 transition-colors active:scale-95"
            >
              उत्पाद देखें (Go to Shop)
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Cart Items List */}
            <div className="space-y-3">
              {cartItems.map((item) => {
                const itemTotal = item.price * item.quantity;
                return (
                  <motion.div
                    key={item.id}
                    layoutId={`cart-item-${item.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex gap-3 relative"
                  >
                    {/* Product Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative border border-gray-100 bg-gray-50">
                      <SmartImage
                        src={item.product.image}
                        alt={item.product.hindiName}
                        className="w-full h-full"
                        objectFit="cover"
                      />
                    </div>

                    {/* Details and Controls */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Brand, Quantity Badge and Custom Id */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="text-[9px] text-[#2D5A27] font-bold uppercase tracking-wider bg-[#2D5A27]/5 px-2 py-0.5 rounded-md border border-[#2D5A27]/10">
                            {item.product.brand}
                          </span>
                          <span className="text-[10px] text-amber-700 font-black bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-sm flex items-center justify-center">
                            मात्रा (Variant): {item.unit}
                          </span>
                          {item.product.customId && (
                            <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 border border-amber-100 rounded">
                              {item.product.customId}
                            </span>
                          )}
                        </div>

                        {/* Product Names */}
                        <h4 className="font-bold text-sm text-gray-800 leading-tight">
                          {item.product.hindiName}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5 mb-1.5">{item.product.name}</p>

                        {/* Pricing details nicely laid out */}
                        <div className="text-[11px] text-gray-500 font-medium">
                          एक इकाई मूल्य (Per Unit): <span className="font-bold text-gray-700">₹{item.price}</span>
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                        {/* Quantity controls */}
                        <div className="flex items-center border border-gray-200 rounded-lg p-0.5 shadow-inner bg-gray-50">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-200 text-gray-500 rounded active:scale-95 transition-transform"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5 font-bold" />
                          </button>
                          <span className="px-3 text-xs font-black text-gray-800 antialiased leading-none min-w-[20px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-200 text-gray-500 rounded active:scale-95 transition-transform"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5 font-bold" />
                          </button>
                        </div>

                        {/* Price and total labels */}
                        <div className="text-right flex flex-col justify-end">
                          <span className="text-[10px] text-gray-400 font-semibold leading-none mb-1">
                            कुल (₹{item.price} x {item.quantity})
                          </span>
                          <span className="text-base font-black text-[#2D5A27] leading-none">
                            ₹{itemTotal}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Trash Button */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors active:scale-90"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Quote details */}
            <div className="bg-[#F5F2ED] border border-[#4A3728]/10 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                <span>कुल उत्पाद (Total Unique Items)</span>
                <span>{cartItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold border-b border-gray-200/50 pb-2">
                <span>कुल मात्रा (Total Units)</span>
                <span>{cartCount}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-[#4A3728]">कुल देय राशि (Gross Amount)</span>
                <span className="text-xl font-black text-[#2D5A27]">₹{cartTotal}</span>
              </div>
            </div>

            {/* Checkout via WhatsApp Floating / Sticky Button */}
            <button
              onClick={handleSendOrder}
              className="w-full bg-[#25D366] text-white py-4.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-green-500/20 active:scale-95 transition-all mt-4"
            >
              <MessageSquare className="w-5 h-5 fill-white text-[#25D366]" />
              Cart से Order करें (Order via WhatsApp)
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Confirmation Popup */}
      <CartOrderModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmOrder}
        cartItems={cartItems}
        cartTotal={cartTotal}
        cartCount={cartCount}
        orderSource="Cart"
      />
    </div>
  );
};

export default CartPage;
