import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ShoppingBag, User, Phone, MapPin, Truck } from 'lucide-react';
import { CartItem } from '../types';
import { useAppContext } from '../context/AppContext';
import { 
  getCustomerDetails, 
  saveCustomerDetails, 
  formatWhatsAppOrderMessage, 
  mapCartItemsToOrderProducts 
} from '../utils/whatsappOrder';

interface CartOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cartItems: CartItem[];
  cartTotal: number;
  cartCount: number;
  orderSource?: string;
}

const CartOrderModal: React.FC<CartOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  cartItems,
  cartTotal,
  cartCount,
  orderSource,
}) => {
  const { appContent } = useAppContext();
  const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressHouse, setAddressHouse] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincode, setAddressPincode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load stored customer details on open
  useEffect(() => {
    if (isOpen) {
      const details = getCustomerDetails();
      setName(details.name || '');
      setPhone(details.phone || '');
      setAddressHouse(details.addressHouse || '');
      setAddressCity(details.addressCity || '');
      setAddressDistrict(details.addressDistrict || '');
      setAddressState(details.addressState || '');
      setAddressPincode(details.addressPincode || '');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !name.trim() || 
      !phone.trim() || 
      !addressHouse.trim() || 
      !addressCity.trim() || 
      !addressDistrict.trim() || 
      !addressState.trim() || 
      !addressPincode.trim()
    ) {
      setErrorMsg('कृपया सभी डिलीवरी फ़ील्ड भरें। (Please fill all fields)');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('कृपया एक वैध 10-अंकीय मोबाइल नंबर डालें। (Please enter valid 10-digit number)');
      return;
    }

    const cleanPincode = addressPincode.trim().replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      setErrorMsg('कृपया एक वैध 6-अंकीय पिन कोड डालें। (Please enter valid 6-digit Pincode)');
      return;
    }

    const details = {
      name: name.trim(),
      phone: cleanPhone,
      addressHouse: addressHouse.trim(),
      addressCity: addressCity.trim(),
      addressDistrict: addressDistrict.trim(),
      addressState: addressState.trim(),
      addressPincode: cleanPincode,
    };

    // Save details for future orders
    saveCustomerDetails(details);

    // Format & send the premium multi-product WhatsApp order message
    const items = mapCartItemsToOrderProducts(cartItems);
    const message = formatWhatsAppOrderMessage(items, details, cartTotal, orderSource || "Cart Order");

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
    onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 animate-fade-in">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          {appContent?.isDeliveryActive === false ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 text-center border-t-8 border-amber-500 z-10"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
                <Truck className="w-8 h-8 text-amber-600" />
              </div>

              <h3 className="text-base font-bold text-gray-800 mb-3">अस्थायी रूप से बंद (Delivery Suspended)</h3>
              
              <div className="space-y-2 text-xs.5 text-gray-500 leading-relaxed font-semibold bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-gray-700 font-bold">अभी उत्पाद डिलीवरी सेवा अस्थायी रूप से बंद है।</p>
                <p>कृपया कुछ समय बाद पुनः प्रयास करें।</p>
                <p className="text-amber-700 text-[11px] mt-2 font-bold">असुविधा के लिए खेद है। (Sorry for inconvenience)</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full bg-gray-100 text-gray-600 hover:bg-gray-200 py-3 rounded-2xl font-bold active:scale-95 transition-all text-xs outline-none border border-gray-205"
              >
                बंद करें (Close)
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
            {/* Header */}
            <div className="bg-[#2D5A27] p-4 text-white text-center shrink-0">
              <div className="bg-white/20 w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShoppingBag className="w-5 h-5 text-[#EAB308]" />
              </div>
              <h3 className="text-base font-bold">ऑर्डर की पुष्टि (Confirm Order)</h3>
              <p className="text-[11px] text-white/80 mt-0.5">{cartItems.length} उत्पाद ({cartCount} मात्रा) कार्ट में</p>
            </div>
            
            {/* Scrollable Content */}
            <form onSubmit={handleOrderSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {/* Product items review list */}
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 shrink-0 border border-gray-100/60 rounded-2xl p-1 bg-gray-50/20">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start bg-white border border-gray-105 p-2 rounded-xl text-[11px]">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-gray-800 leading-snug truncate">{item.product.hindiName}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5 truncate">{item.product.name} ({item.product.brand})</p>
                        <p className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1 py-0.2 mt-0.5 rounded inline-block">
                          मात्रा: {item.unit}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-medium text-gray-400 text-[10px]">₹{item.price} x {item.quantity}</p>
                        <p className="font-bold text-[#2D5A27] mt-0.5">₹{item.price * item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Section */}
                <div className="bg-[#F5F2ED] rounded-xl p-3 border border-[#4A3728]/10 space-y-1 shadow-sm text-xs shrink-0">
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>कुल उत्पाद (Total Unique Items):</span>
                    <span>{cartItems.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold border-b border-gray-200/50 pb-1">
                    <span>कुल मात्रा (Total Units):</span>
                    <span>{cartCount}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-sm font-bold text-[#4A3728]">कुल देय राशि (Gross Amount):</span>
                    <span className="text-base font-black text-[#2D5A27]">₹{cartTotal}</span>
                  </div>
                </div>

                {/* Delivery details form */}
                <div className="space-y-3 pt-1 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#2D5A27]" /> डिलीवरी की जानकारी (Delivery & Customer Details)
                  </h4>

                  {errorMsg && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold p-2.5 rounded-lg">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-2.5 text-xs">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-550 mb-1">पूरा नाम (Full Name) *</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-gray-400">
                          <User className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="उदाँ: रमेश कुमार"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                        />
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-550 mb-1">मोबाइल नंबर (Mobile No) *</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-gray-400">
                          <Phone className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="उदाँ: 9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                        />
                      </div>
                    </div>

                    {/* Address Fields with icons */}
                    <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 space-y-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 mb-1">
                        <MapPin className="w-3 h-3 text-red-500" /> डिलीवरी पता (Delivery Address)
                      </div>

                      {/* House No / Street name */}
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 mb-0.5">मकान नंबर, मोहल्ले/गली का नाम (House/Street) *</label>
                        <input
                          type="text"
                          required
                          placeholder="उदाँ: मकान नं. 15, राम मंदिर गली"
                          value={addressHouse}
                          onChange={(e) => setAddressHouse(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-[#2D5A27] outline-none bg-white text-gray-800"
                        />
                      </div>

                      {/* City/Village & District */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">शहर/गांव (City/Village) *</label>
                          <input
                            type="text"
                            required
                            placeholder="उदाँ: शामगढ़"
                            value={addressCity}
                            onChange={(e) => setAddressCity(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-[#2D5A27] outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">जिला (District) *</label>
                          <input
                            type="text"
                            required
                            placeholder="उदाँ: मंदसौर"
                            value={addressDistrict}
                            onChange={(e) => setAddressDistrict(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-[#2D5A27] outline-none bg-white"
                          />
                        </div>
                      </div>

                      {/* State & Pincode */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">राज्य (State) *</label>
                          <input
                            type="text"
                            required
                            placeholder="उदाँ: मध्य प्रदेश"
                            value={addressState}
                            onChange={(e) => setAddressState(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-[#2D5A27] outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">पिन कोड (Pincode) *</label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="उदाँ: 458441"
                            value={addressPincode}
                            onChange={(e) => setAddressPincode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-[#2D5A27] outline-none bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5 shrink-0">
                  <p className="text-[9px] text-orange-850 font-medium leading-relaxed">
                    ⚠️ डिस्क्लेमर: सामान आप स्वयं दुकान पर आकर भी ले सकते हैं; होम डिलीवरी की उपलब्धता की जानकारी हेतु कृपया दुकानदार से व्हाट्सएप चैट पर पुष्टि करें।
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-500 text-xs active:scale-95 transition-transform bg-white"
                >
                  <X className="w-3.5 h-3.5" /> नहीं (No)
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2D5A27] text-white font-bold text-xs shadow-md shadow-[#2D5A27]/10 active:scale-95 transition-transform"
                >
                  <Check className="w-3.5 h-3.5" /> हाँ, ऑर्डर करें (Order Now)
                </button>
              </div>
            </form>
          </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

export default CartOrderModal;
