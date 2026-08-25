import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, ShieldCheck, Truck, CheckCircle2, 
  MapPin, Phone, User, AlertCircle, ShoppingBag, 
  CreditCard, Loader2, Sparkles, MessageSquare, Info, RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { getCustomerDetails, saveCustomerDetails } from '../utils/customerStorage';
import { createNewOrder } from '../services/orderService';
import { initiateRazorpayPayment, fetchRazorpayPublicConfig } from '../services/razorpayService';
import { OrderItem, RazorpayPublicConfig } from '../types';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { appContent, user } = useAppContext();

  // Customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressHouse, setAddressHouse] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincode, setAddressPincode] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentFailedError, setPaymentFailedError] = useState<string | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<RazorpayPublicConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const deliveryCharges = (appContent?.isDeliveryChargesEnabled && appContent?.deliveryChargesAmount !== undefined)
    ? appContent.deliveryChargesAmount
    : 0;

  const finalPayableTotal = cartTotal + deliveryCharges;
  const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';

  // Load gateway config from server
  useEffect(() => {
    fetchRazorpayPublicConfig()
      .then((cfg) => setGatewayConfig(cfg))
      .catch((err) => console.error('Failed to load gateway config:', err))
      .finally(() => setLoadingConfig(false));
  }, []);

  // Prepopulate saved details or user info
  React.useEffect(() => {
    const details = getCustomerDetails();
    if (details.name) setName(details.name);
    if (details.phone) setPhone(details.phone);
    if (details.addressHouse) setAddressHouse(details.addressHouse);
    if (details.addressCity) setAddressCity(details.addressCity);
    if (details.addressDistrict) setAddressDistrict(details.addressDistrict);
    if (details.addressState) setAddressState(details.addressState);
    if (details.addressPincode) setAddressPincode(details.addressPincode);

    if (user?.displayName && !details.name) setName(user.displayName);
    if (user?.email) setCustomerEmail(user.email);
  }, [user]);

  // If cart is empty and not processing, allow quick redirect
  if (cartItems.length === 0 && !isProcessing) {
    return (
      <div className="text-center py-12 px-4 space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
        <h3 className="font-bold text-gray-700 text-lg">चेकआउट के लिए कोई उत्पाद नहीं है</h3>
        <p className="text-xs text-gray-400">कृपया पहले बाजार से अपने पसंदीदा उत्पाद कार्ट में जोड़ें।</p>
        <button
          onClick={() => navigate('/products')}
          className="px-6 py-3 bg-[#2D5A27] text-white rounded-2xl text-xs font-bold shadow-md hover:bg-[#2D5A27]/90 active:scale-95 transition-all"
        >
          उत्पाद देखें (Explore Products)
        </button>
      </div>
    );
  }

  const validateForm = (): boolean => {
    if (appContent?.isDeliveryActive === false) {
      setErrorMsg('वर्तमान में डिलीवरी सेवा अस्थायी रूप से बंद है। आप अभी ऑर्डर नहीं कर सकते।');
      return false;
    }

    if (gatewayConfig && gatewayConfig.enabled === false) {
      setErrorMsg('Razorpay Payment Gateway वर्तमान में बंद है। ऑनलाइन चेकआउट अस्थायी रूप से उपलब्ध नहीं है।');
      return false;
    }

    if (!name.trim() || !phone.trim() || !addressHouse.trim() || !addressCity.trim() || !addressDistrict.trim() || !addressState.trim() || !addressPincode.trim()) {
      setErrorMsg('कृपया सभी डिलीवरी फ़ील्ड भरें। (All fields are required)');
      return false;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('कृपया वैध 10-अंकीय मोबाइल नंबर दर्ज करें। (Enter valid 10-digit phone)');
      return false;
    }

    const cleanPincode = addressPincode.trim().replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      setErrorMsg('कृपया 6-अंकीय वैध पिन कोड डालें। (Enter valid 6-digit Pincode)');
      return false;
    }

    setErrorMsg('');
    return true;
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanPincode = addressPincode.trim().replace(/\D/g, '');

    const customerData = {
      name: name.trim(),
      phone: cleanPhone,
      addressHouse: addressHouse.trim(),
      addressCity: addressCity.trim(),
      addressDistrict: addressDistrict.trim(),
      addressState: addressState.trim(),
      addressPincode: cleanPincode,
    };

    // Save for next time
    saveCustomerDetails(customerData);

    const orderItems: OrderItem[] = cartItems.map((item) => ({
      productId: item.product.id,
      customId: item.product.customId,
      name: item.product.name,
      hindiName: item.product.hindiName,
      brand: item.product.brand,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      image: item.product.image,
    }));

    setIsProcessing(true);
    setPaymentFailedError(null);

    initiateRazorpayPayment({
      items: orderItems,
      deliveryCharges: deliveryCharges,
      customerName: customerData.name,
      customerPhone: customerData.phone,
      customerEmail: customerEmail || user?.email || undefined,
      appTitle: appContent?.branding?.name || 'फल्सावदिया कृषि बाजार',
      onSuccess: async ({ paymentId, razorpayOrderId, mode }) => {
        try {
          const createdOrder = await createNewOrder({
            userId: user?.uid,
            userEmail: user?.email || customerEmail || undefined,
            customerDetails: customerData,
            items: orderItems,
            itemCount: cartCount,
            itemsTotal: cartTotal,
            deliveryCharges: deliveryCharges,
            totalAmount: finalPayableTotal,
            paymentMethod: 'online_razorpay',
            paymentStatus: 'paid',
            razorpayPaymentId: paymentId,
            razorpayOrderId: razorpayOrderId,
            razorpayMode: mode,
            status: 'confirmed',
            estimatedDeliveryDate: '2-4 कार्य दिवस (2-4 Working Days)',
          });

          clearCart();
          setIsProcessing(false);
          // Navigate to Live Order Details
          navigate(`/orders/${createdOrder.id}`, { state: { justPlaced: true } });
        } catch (err: any) {
          console.error("Order creation failed after payment:", err);
          setIsProcessing(false);
        }
      },
      onFailure: (reason: string) => {
        setIsProcessing(false);
        setPaymentFailedError(reason);
      },
      onDismiss: () => {
        setIsProcessing(false);
      }
    });
  };

  const handleWhatsAppHelp = () => {
    const helpMsg = `नमस्ते फल्सावदिया कृषि बाजार! मुझे चेकआउट / ऑनलाइन भुगतान में समस्या आ रही है, कृपया सहायता करें।\nग्राहक: ${name || 'किसान'}\nमोबाइल: ${phone || ''}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(helpMsg)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Row with Back button */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={() => navigate('/cart')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 text-[#4A3728]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[#4A3728]">सुरक्षित चेकआउट (Checkout)</h2>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              100% Secure Razorpay UPI / Online Payment
            </p>
            {gatewayConfig?.mode === 'test' && (
              <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded border border-amber-300">
                TEST MODE
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-[#2D5A27] bg-[#2D5A27]/10 px-2.5 py-1 rounded-lg text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>सुरक्षित</span>
        </div>
      </div>

      {/* Gateway Disabled Notice */}
      {gatewayConfig && gatewayConfig.enabled === false && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl space-y-2 text-red-900 shadow-sm"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-red-900">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>ऑनलाइन पेमेंट गेटवे अस्थायी रूप से बंद है (Gateway Disabled)</span>
          </div>
          <p className="text-xs text-red-700 leading-relaxed">
            प्रशासक द्वारा Razorpay पेमेंट गेटवे अस्थायी रूप से बंद रखा गया है। कृपया थोड़ी देर बाद पुनः प्रयास करें या सहायता के लिए संपर्क करें।
          </p>
        </motion.div>
      )}

      {/* Delivery Service Suspended Notice */}
      {appContent?.isDeliveryActive === false && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-300 p-4 rounded-2xl space-y-2 text-amber-900 shadow-sm"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
            <Truck className="w-5 h-5 text-amber-700 shrink-0" />
            <span>डिलीवरी सेवा अस्थायी रूप से बंद है (Delivery Suspended)</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            अभी ऑनलाइन चेकआउट और डिलीवरी सेवा अस्थायी रूप से बंद है। कृपया कुछ समय बाद प्रयास करें या सीधे दुकान पर संपर्क करें।
          </p>
        </motion.div>
      )}

      {/* Payment Failure / Status Banner */}
      {paymentFailedError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 p-4 rounded-2xl space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Payment पूरा नहीं हुआ। आपका Order अभी Confirm नहीं हुआ है।</h4>
              <p className="text-xs text-red-700 mt-0.5">{paymentFailedError}</p>
            </div>
          </div>
          
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPaymentFailedError(null)}
              className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              पुनः प्रयास करें (Try Again)
            </button>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="px-3 bg-white border border-red-200 text-red-700 py-2 rounded-xl font-bold text-xs active:scale-95 transition-all"
            >
              वापस कार्ट पर जाएं
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Checkout Form */}
      <form onSubmit={handleProceedToPayment} className="space-y-4">
        {/* Order Items Preview Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-[#2D5A27]" />
              ऑर्डर सारांश ({cartItems.length} उत्पाद, {cartCount} मात्रा)
            </h3>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="text-[11px] text-[#2D5A27] font-bold hover:underline"
            >
              बदलें (Edit)
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                    <SmartImage src={item.product.image} alt={item.product.hindiName} className="w-full h-full" objectFit="cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate">{item.product.hindiName}</p>
                    <p className="text-[10px] text-gray-400">मात्रा: {item.unit} x {item.quantity}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-[#2D5A27]">₹{item.price * item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address Form Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <MapPin className="w-4 h-4 text-[#2D5A27]" />
            डिलीवरी पता एवं विवरण (Delivery Address)
          </h3>

          {errorMsg && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">पूरा नाम (Full Name) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="उदाँ: रमेश पाटीदार"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">मोबाइल नंबर (Mobile No.) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="उदाँ: 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                />
              </div>
            </div>

            {/* House / Farm / Street */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">मकान / खेत का पता / गली (House, Street, Landmark) *</label>
              <input
                type="text"
                required
                placeholder="उदाँ: मकान नं 12, मेन रोड, फल्सावदिया"
                value={addressHouse}
                onChange={(e) => setAddressHouse(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
              />
            </div>

            {/* Village / City & District */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">गांव / शहर (Village/City) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदाँ: शामगढ़"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">जिला (District) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदाँ: मंदसौर"
                  value={addressDistrict}
                  onChange={(e) => setAddressDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                />
              </div>
            </div>

            {/* State & Pincode */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">राज्य (State) *</label>
                <input
                  type="text"
                  required
                  placeholder="उदाँ: मध्यप्रदेश"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">पिन कोड (Pincode) *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="उदाँ: 458883"
                  value={addressPincode}
                  onChange={(e) => setAddressPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Price Breakdown Card */}
        <div className="bg-[#F5F2ED] rounded-2xl p-4 border border-[#4A3728]/10 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600 font-medium">
            <span>उत्पाद कुल (Products Value):</span>
            <span className="font-bold text-gray-800">₹{cartTotal}</span>
          </div>
          <div className="flex justify-between text-gray-600 font-medium">
            <span>डिलीवरी शुल्क (Delivery Charges):</span>
            <span className="font-bold text-amber-700">
              {deliveryCharges > 0 ? `+ ₹${deliveryCharges}` : 'मुफ़्त (FREE)'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-300/40 text-sm font-bold text-[#4A3728]">
            <span>कुल देय राशि (Final Amount):</span>
            <span className="text-xl font-black text-[#2D5A27]">₹{finalPayableTotal}</span>
          </div>
          <div className="pt-2 text-[11px] text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>UPI (GPay / PhonePe / Paytm), कार्ड और नेट बैंकिंग द्वारा 100% सुरक्षित भुगतान</span>
          </div>
        </div>

        {/* Submit / Pay Online Button */}
        <button
          type="submit"
          disabled={isProcessing || appContent?.isDeliveryActive === false}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            appContent?.isDeliveryActive === false
              ? "bg-gray-400 text-white shadow-none"
              : "bg-[#2D5A27] hover:bg-[#2D5A27]/90 text-white shadow-[#2D5A27]/25"
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              सुरक्षित पेमेंट विंडो खुल रही है...
            </>
          ) : appContent?.isDeliveryActive === false ? (
            <>
              <Truck className="w-5 h-5" />
              डिलीवरी सेवा बंद है (Delivery Suspended)
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 text-[#EAB308]" />
              ₹{finalPayableTotal} का ऑनलाइन भुगतान करें (Pay with UPI / Razorpay)
            </>
          )}
        </button>

        {/* Quick Fallback Support Line */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleWhatsAppHelp}
            className="text-xs text-gray-500 hover:text-gray-800 underline font-medium inline-flex items-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
            भुगतान में कोई परेशानी? व्हाट्सएप हेल्पलाइन से मदद लें
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
