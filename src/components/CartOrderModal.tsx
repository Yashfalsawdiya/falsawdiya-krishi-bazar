import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  X,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Truck,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { CartItem } from '../types';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import {
  getCustomerDetails,
  saveCustomerDetails,
  formatWhatsAppOrderMessage,
  mapCartItemsToOrderProducts,
} from '../utils/whatsappOrder';
import {
  fetchRazorpayConfig,
  loadRazorpaySDK,
  createRazorpayOrder,
  verifyRazorpayPayment,
  RazorpayConfig,
} from '../services/razorpay';

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
  const { clearCart } = useCart();
  const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressHouse, setAddressHouse] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincode, setAddressPincode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [rzpConfig, setRzpConfig] = useState<RazorpayConfig>({
    keyId: '',
    isTestMode: true,
    gstPercentage: 18,
    platformChargePercentage: 0,
    deliveryFee: 0,
    isRazorpayEnabled: true,
  });

  const [paymentMethod] = useState<'razorpay'>('razorpay');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);

  // Load customer details and Razorpay config on open
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
      setPaymentSuccessData(null);

      fetchRazorpayConfig().then((cfg) => {
        setRzpConfig(cfg);
      });
    }
  }, [isOpen]);

  // Calculate taxes and totals
  const subtotal = cartTotal;
  const gstAmount = Math.round((subtotal * (rzpConfig.gstPercentage || 0)) / 100);
  const platformCharge = Math.round((subtotal * (rzpConfig.platformChargePercentage || 0)) / 100);
  const deliveryFee = rzpConfig.deliveryFee || 0;

  const finalTotal = subtotal + gstAmount + platformCharge + deliveryFee;

  const validateForm = () => {
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
      return false;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('कृपया एक वैध 10-अंकीय मोबाइल नंबर डालें।');
      return false;
    }

    const cleanPincode = addressPincode.trim().replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      setErrorMsg('कृपया एक वैध 6-अंकीय पिन कोड डालें।');
      return false;
    }

    return {
      name: name.trim(),
      phone: cleanPhone,
      addressHouse: addressHouse.trim(),
      addressCity: addressCity.trim(),
      addressDistrict: addressDistrict.trim(),
      addressState: addressState.trim(),
      addressPincode: cleanPincode,
    };
  };

  const handleRazorpayPayment = async (details: any) => {
    setIsProcessingPayment(true);
    setErrorMsg('');

    try {
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        throw new Error('Razorpay SDK लोड नहीं हो सका। कृपया अपना नेटवर्क कनेक्शन जांचें।');
      }

      // Step 1: Create Order on backend
      const orderData = await createRazorpayOrder(finalTotal, {
        customerName: details.name,
        customerPhone: details.phone,
      });

      // Step 2: Open Razorpay Checkout Window
      const options = {
        key: orderData.keyId || rzpConfig.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'फल्सावदिया कृषि बाज़ार',
        description: `${cartItems.length} उत्पादों की ऑनलाइन खरीद`,
        order_id: orderData.id,
        prefill: {
          name: details.name,
          contact: details.phone,
        },
        theme: {
          color: '#2D5A27',
        },
        handler: async (response: any) => {
          try {
            // Step 3: Verify Payment Signature on backend
            const verifyRes = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              customerDetails: details,
              items: mapCartItemsToOrderProducts(cartItems),
              subtotal,
              gstAmount,
              platformCharge,
              deliveryFee,
              totalAmount: finalTotal,
            });

            if (verifyRes.success) {
              setPaymentSuccessData({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                totalAmount: finalTotal,
                details,
              });
              clearCart();
            } else {
              setErrorMsg(verifyRes.error || 'भुगतान सत्यापन विफल रहा।');
            }
          } catch (err: any) {
            setErrorMsg(err.message || 'भुगतान सत्यापन में त्रुटि आई।');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', (response: any) => {
        setIsProcessingPayment(false);
        setErrorMsg(`भुगतान विफल: ${response.error.description || 'अज्ञात कारण'}`);
      });
      razorpayInstance.open();
    } catch (err: any) {
      console.error('Razorpay payment error:', err);
      setErrorMsg(err.message || 'ऑनलाइन भुगतान प्रक्रिया शुरू करने में त्रुटि आई।');
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const details = validateForm();
    if (!details) return;

    saveCustomerDetails(details);
    handleRazorpayPayment(details);
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

          {paymentSuccessData ? (
            /* SUCCESS MODAL AFTER PAYMENT VERIFICATION */
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-4 z-10"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  भुगतान सफल (Payment Verified)
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-2">ऑर्डर की पुष्टि हो गई है!</h3>
                <p className="text-xs text-gray-500 mt-1">
                  आपका भुगतान सुरक्षित रूप से प्राप्त हो गया है। दुकान संचालक जल्द आपसे संपर्क करेंगे।
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                  <span className="text-gray-500">Payment ID:</span>
                  <span className="font-mono font-bold text-gray-800">{paymentSuccessData.paymentId}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-1.5">
                  <span className="text-gray-500">कुल भुगतान:</span>
                  <span className="font-black text-[#2D5A27]">₹{paymentSuccessData.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ग्राहक:</span>
                  <span className="font-bold text-gray-800">{paymentSuccessData.details.name} ({paymentSuccessData.details.phone})</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="w-full bg-[#2D5A27] text-white py-3.5 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-transform"
              >
                ठीक है (Done)
              </button>
            </motion.div>
          ) : rzpConfig.isDeliveryActive === false ? (
            /* DELIVERY SUSPENDED POPUP NOTICE */
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4 z-10 border-t-8 border-amber-500"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600 shadow-inner border border-amber-200">
                <Truck className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  डिलीवरी सेवा बंद (Delivery Suspended)
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-2">अस्थायी रूप से डिलीवरी बंद है</h3>
              </div>

              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/80 text-center space-y-1.5 text-xs text-gray-700">
                <p className="font-bold text-gray-800">
                  वर्तमान में ऑनलाइन उत्पाद डिलीवरी सेवा अस्थायी रूप से बंद है।
                </p>
                <p className="text-[11px] text-gray-500">
                  कृपया कुछ समय पश्चात् पुनः प्रयास करें अथवा दुकान से संपर्क करें।
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-[#2D5A27] text-white py-3.5 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-transform"
              >
                ठीक है (Close)
              </button>
            </motion.div>
          ) : (
            /* ORDER FORM & CHECKOUT */
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
                <h3 className="text-base font-bold">ऑनलाइन चेकआउट & पेमेंट</h3>
                <p className="text-[11px] text-white/80 mt-0.5">
                  {cartItems.length} उत्पाद ({cartCount} मात्रा) कार्ट में
                </p>
              </div>

              {/* Scrollable Form */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                  {/* Cart items review */}
                  <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 shrink-0 border border-gray-100/60 rounded-2xl p-1 bg-gray-50/20">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start bg-white border border-gray-105 p-2 rounded-xl text-[11px]"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-gray-800 leading-snug truncate">
                            {item.product.hindiName}
                          </p>
                          <p className="text-[9px] text-gray-400 mt-0.5 truncate">
                            {item.product.name} ({item.product.brand})
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium text-gray-400 text-[10px]">
                            ₹{item.price} x {item.quantity}
                          </p>
                          <p className="font-bold text-[#2D5A27] mt-0.5">
                            ₹{item.price * item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Razorpay Single Method Badge */}
                  <div className="bg-emerald-50/70 border border-[#2D5A27]/20 p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#2D5A27] flex items-center justify-center text-white shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-[#2D5A27] block">Razorpay सुरक्षित ऑनलाइन पेमेंट</span>
                        <span className="text-[9px] text-gray-600 block">UPI / QR, क्रेडिट-डेबिट कार्ड & नेटबैंकिंग</span>
                      </div>
                    </div>
                    {rzpConfig.isTestMode && (
                      <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        TEST MODE
                      </span>
                    )}
                  </div>

                  {/* Summary Section with automatic GST + Charges breakdown */}
                  <div className="bg-[#F5F2ED] rounded-2xl p-3 border border-[#4A3728]/10 space-y-1.5 text-xs shadow-sm">
                    <div className="flex justify-between text-gray-600 font-semibold text-[11px]">
                      <span>उत्पाद मूल्य (Subtotal):</span>
                      <span className="text-gray-800 font-bold">₹{subtotal}</span>
                    </div>

                    {rzpConfig.gstPercentage > 0 && (
                      <div className="flex justify-between text-gray-600 font-semibold text-[11px]">
                        <span>GST ({rzpConfig.gstPercentage}%):</span>
                        <span className="text-gray-800 font-bold">+ ₹{gstAmount}</span>
                      </div>
                    )}

                    {rzpConfig.platformChargePercentage > 0 && (
                      <div className="flex justify-between text-gray-600 font-semibold text-[11px]">
                        <span>प्लेटफ़ॉर्म चार्ज ({rzpConfig.platformChargePercentage}%):</span>
                        <span className="text-gray-800 font-bold">+ ₹{platformCharge}</span>
                      </div>
                    )}

                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-gray-600 font-semibold text-[11px]">
                        <span>डिलीवरी शुल्क:</span>
                        <span className="text-amber-700 font-bold">+ ₹{deliveryFee}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-300/60">
                      <span className="text-xs font-black text-[#4A3728]">कुल देय राशि (Grand Total):</span>
                      <span className="text-lg font-black text-[#2D5A27]">₹{finalTotal}</span>
                    </div>
                  </div>

                  {/* Customer Details Form */}
                  <div className="space-y-3 pt-1 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#2D5A27]" /> डिलीवरी की जानकारी
                    </h4>

                    {errorMsg && (
                      <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold p-2.5 rounded-lg flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="space-y-2.5 text-xs">
                      {/* Customer Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">
                          पूरा नाम (Full Name) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="उदाँ: रमेश कुमार"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-[#2D5A27] outline-none text-gray-800"
                        />
                      </div>

                      {/* Mobile Number */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">
                          मोबाइल नंबर (Mobile No) *
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="उदाँ: 9876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-[#2D5A27] outline-none text-gray-800"
                        />
                      </div>

                      {/* Address Fields */}
                      <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 space-y-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 mb-1">
                          <MapPin className="w-3 h-3 text-red-500" /> डिलीवरी पता (Delivery Address)
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">
                            मकान नंबर, मोहल्ला / गली *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="उदाँ: मकान नं. 15, राम मंदिर गली"
                            value={addressHouse}
                            onChange={(e) => setAddressHouse(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-[#2D5A27] outline-none bg-white text-gray-800"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-gray-500 mb-0.5">
                              शहर / गांव *
                            </label>
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
                            <label className="block text-[9px] font-bold text-gray-500 mb-0.5">
                              जिला *
                            </label>
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

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-gray-500 mb-0.5">
                              राज्य *
                            </label>
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
                            <label className="block text-[9px] font-bold text-gray-500 mb-0.5">
                              पिन कोड *
                            </label>
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
                </div>

                {/* Footer Submit Buttons */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500 text-xs active:scale-95 transition-transform bg-white"
                  >
                    रद्द करें (Cancel)
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="flex-1 py-3 rounded-xl bg-[#2D5A27] text-white font-bold text-xs shadow-md shadow-[#2D5A27]/20 active:scale-95 transition-transform flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        भुगतान विंडो खुल रही है...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" /> ₹{finalTotal} ऑनलाइन पे करें
                      </>
                    )}
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
