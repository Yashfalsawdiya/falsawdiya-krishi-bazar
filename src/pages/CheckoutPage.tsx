import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, ShieldCheck, CheckCircle2, 
  MapPin, Phone, User, AlertCircle, ShoppingBag, 
  CreditCard, Loader2, MessageSquare, Info,
  Store, Clock, EyeOff, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { getCustomerDetails, saveCustomerDetails } from '../utils/customerStorage';
import { createNewOrder } from '../services/orderService';
import { initiateRazorpayPayment, fetchRazorpayPublicConfig } from '../services/razorpayService';
import { OrderItem, RazorpayPublicConfig, OrderDeliverySnapshot } from '../types';
import { calculateCartWeight } from '../utils/deliveryCalculator';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { appContent, deliveryConfig, user } = useAppContext();

  // Customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressCity, setAddressCity] = useState('शामगढ़');
  const [addressHouse, setAddressHouse] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentFailedError, setPaymentFailedError] = useState<string | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<RazorpayPublicConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const totalCartWeightKg = calculateCartWeight(cartItems);

  // Store information
  const storeName = deliveryConfig?.storeOrigin?.name || 'फल्सावदिया कृषि बाजार, शामगढ़';
  const storeAddress = deliveryConfig?.storeOrigin?.address || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़';
  const storeTimings = deliveryConfig?.pickupTimings || 'प्रतिदिन सुबह 08:00 बजे से रात 08:00 बजे तक';
  const storeInstructions = deliveryConfig?.pickupInstructions || 'ऑर्डर कन्फर्म होने के बाद आपका सामान दुकान पर पैक होकर सुरक्षित रख दिया जाएगा। आप कभी भी दुकान पर आकर अपना ऑर्डर नंबर दिखाकर तुरंत माल प्राप्त कर सकते हैं।';
  const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';

  // Load gateway config from server
  useEffect(() => {
    fetchRazorpayPublicConfig()
      .then((cfg) => setGatewayConfig(cfg))
      .catch((err) => console.error('Failed to load gateway config:', err))
      .finally(() => setLoadingConfig(false));
  }, []);

  // Prepopulate saved details or user info
  useEffect(() => {
    const details = getCustomerDetails();
    if (details.name) setName(details.name);
    if (details.phone) setPhone(details.phone);
    if (details.addressCity) setAddressCity(details.addressCity);
    if (details.addressHouse) setAddressHouse(details.addressHouse);

    if (user?.displayName && !details.name) setName(user.displayName);
    if (user?.email) setCustomerEmail(user.email);
  }, [user]);

  const isDeliveryActive = deliveryConfig?.isDeliveryActive !== false && appContent?.isDeliveryActive !== false;
  const isPriceHiddenGlobally = Boolean(appContent?.hideAllProductPrices);
  const hasHiddenPriceItems = isPriceHiddenGlobally || cartItems.some(item => item.product.hidePrice);

  if (hasHiddenPriceItems && !isProcessing) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-8 px-4">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-100/80 shadow-xs">
            <EyeOff className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-black text-gray-800">
              उत्पादों की कीमतें छिपी हुई हैं
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto font-medium">
              वर्तमान में उत्पादों की कीमतें छिपी होने के कारण ऑनलाइन ऑर्डर व चेकआउट अस्थायी रूप से बंद है। किसी भी उत्पाद की कीमत जानने या सीधा ऑर्डर करने के लिए कृपया WhatsApp या फोन पर संपर्क करें।
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-3.5 bg-[#2D5A27] text-white rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-[#2D5A27]/20 hover:bg-[#2D5A27]/90 active:scale-95 transition-all cursor-pointer"
            >
              उत्पाद देखें (Explore Products)
            </button>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="px-6 py-3.5 bg-gray-100 text-gray-700 rounded-2xl text-xs sm:text-sm font-bold hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
            >
              कार्ट पर लौटें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isDeliveryActive && !isProcessing) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-8 px-4">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-100/80 shadow-xs">
            <Store className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-black text-gray-800">
              अभी ऑनलाइन ऑर्डर सेवा बंद है
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto font-medium">
              असुविधा के लिए खेद है। फिलहाल दुकान से ऑनलाइन ऑर्डर व पिकअप सेवा अस्थायी रूप से बंद है। कृपया किसी भी उत्पाद के लिए फोन या WhatsApp पर संपर्क करें।
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="px-6 py-3.5 bg-[#2D5A27] text-white rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-[#2D5A27]/20 hover:bg-[#2D5A27]/90 active:scale-95 transition-all cursor-pointer"
            >
              ठीक है (कार्ट पर लौटें)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && !isProcessing) {
    return (
      <div className="text-center py-12 px-4 space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
        <h3 className="font-bold text-gray-700 text-lg">चेकआउट के लिए कोई उत्पाद नहीं है</h3>
        <p className="text-xs text-gray-400">कृपया पहले कृषि बाजार से उत्पाद अपने कार्ट में जोड़ें।</p>
        <button
          onClick={() => navigate('/products')}
          className="px-6 py-3 bg-[#2D5A27] text-white rounded-2xl text-xs font-bold shadow-md hover:bg-[#2D5A27]/90 active:scale-95 transition-all cursor-pointer"
        >
          उत्पाद देखें (Explore Products)
        </button>
      </div>
    );
  }

  const validateForm = (): boolean => {
    if (hasHiddenPriceItems) {
      setErrorMsg('उत्पादों की कीमतें छिपी होने के कारण ऑनलाइन चेकआउट उपलब्ध नहीं है। कृपया WhatsApp या फोन पर संपर्क करें।');
      return false;
    }

    if (!isDeliveryActive) {
      setErrorMsg('असुविधा के लिए खेद है। फिलहाल ऑनलाइन ऑर्डर सेवा बंद है।');
      return false;
    }

    if (gatewayConfig && gatewayConfig.enabled === false) {
      setErrorMsg('Razorpay Payment Gateway वर्तमान में बंद है। ऑनलाइन चेकआउट अस्थायी रूप से उपलब्ध नहीं है।');
      return false;
    }

    if (!name.trim()) {
      setErrorMsg('कृपया अपना पूरा नाम दर्ज करें।');
      return false;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('कृपया 10-अंकीय मान्य मोबाइल नंबर दर्ज करें।');
      return false;
    }

    setErrorMsg('');
    return true;
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanPhone = phone.trim().replace(/\D/g, '');

    const customerData = {
      name: name.trim(),
      phone: cleanPhone,
      email: customerEmail?.trim() || user?.email?.trim() || undefined,
      addressHouse: addressHouse.trim() || 'दुकान से स्वयं पिकअप',
      addressCity: addressCity.trim() || 'शामगढ़',
      addressDistrict: deliveryConfig?.storeOrigin?.district || 'मंदसौर',
      addressState: deliveryConfig?.storeOrigin?.state || 'मध्यप्रदेश',
      addressPincode: deliveryConfig?.storeOrigin?.pincode || '458883',
    };

    // Save for next session
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

    // Zero-Cost Store Pickup Snapshot
    const storePickupSnapshot: OrderDeliverySnapshot = {
      totalWeightKg: totalCartWeightKg,
      distanceKm: 0,
      vehicleId: 'pickup',
      vehicleName: 'दुकान से स्वयं पिकअप',
      vehicleIcon: 'store',
      vehicleEmoji: 'store',
      vehicleNameHindi: 'दुकान से स्वयं पिकअप (Store Pickup)',
      vehicleType: 'pickup',
      distanceSlabLabel: 'दुकान पर (At Store)',
      weightSlabLabel: `${totalCartWeightKg} kg`,
      calculatedCharge: 0,
      finalCharge: 0,
      isFreeDelivery: true,
      calculatedAt: Date.now(),
    };

    setIsProcessing(true);
    setPaymentFailedError(null);

    initiateRazorpayPayment({
      items: orderItems,
      deliveryCharges: 0,
      customerName: customerData.name,
      customerPhone: customerData.phone,
      customerEmail: customerEmail || user?.email || undefined,
      appTitle: appContent?.branding?.name || 'फल्सावदिया कृषि बाजार',
      isDeliveryActive: true,
      onSuccess: async ({ paymentId, razorpayOrderId, mode }) => {
        try {
          const createdOrder = await createNewOrder({
            userId: user?.uid,
            userEmail: user?.email || customerEmail || undefined,
            customerDetails: customerData,
            items: orderItems,
            itemCount: cartCount,
            itemsTotal: cartTotal,
            deliveryCharges: 0,
            totalAmount: cartTotal,
            deliverySnapshot: storePickupSnapshot,
            paymentMethod: 'online_razorpay',
            paymentStatus: 'paid',
            razorpayPaymentId: paymentId,
            razorpayOrderId: razorpayOrderId,
            razorpayMode: mode,
            status: 'confirmed',
            estimatedDeliveryDate: 'दुकान से कभी भी पिकअप करें (सुबह 8:00 AM - रात 8:00 PM)',
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
    const helpMsg = `नमस्ते फल्सावदिया कृषि बाजार! मुझे चेकआउट / पिकअप ऑर्डर में सहायता चाहिए।\nग्राहक: ${name || 'किसान'}\nमोबाइल: ${phone || ''}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(helpMsg)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-14">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
        <button
          onClick={() => navigate('/cart')}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 text-[#4A3728]"
          title="वापस जाएँ (Back)"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[#4A3728]">सुरक्षित चेकआउट (Checkout)</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            100% Safe Online UPI Payment • Falsawdiya Krishi Bazaar
          </p>
        </div>
      </div>

      {/* Payment Gateway Offline Alert if any */}
      {!loadingConfig && gatewayConfig && !gatewayConfig.enabled && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-3 text-amber-800 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">ऑनलाइन पेमेंट गेटवे अस्थायी रूप से बंद है</p>
            <p className="text-[11px] text-amber-700">कृपया व्यवस्थापक से संपर्क करें या थोड़ी देर बाद प्रयास करें।</p>
          </div>
        </div>
      )}

      {/* Payment Failed / Error alert */}
      {paymentFailedError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 p-4 rounded-2xl space-y-2"
        >
          <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>भुगतान पूरा नहीं हुआ (Payment Failed)</span>
          </div>
          <p className="text-xs text-red-600 font-medium">{paymentFailedError}</p>
          <p className="text-[11px] text-gray-600">
            यदि आपके खाते से पैसे कट गए हैं, तो कृपया चिंता न करें, Razorpay द्वारा 24-48 घंटों में स्वतः रिफंड हो जाएगा या हमें संपर्क करें।
          </p>
        </motion.div>
      )}

      {/* Validation error msg */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customer Details & Store Pickup Card */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Exact Store Pickup Card from Screenshot 2 */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-xs space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-800 shadow-2xs shrink-0">
                  <Store className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    दुकान से स्वयं पिकअप
                  </h3>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">
                    {storeName}
                  </p>
                </div>
              </div>

              <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200 shrink-0">
                ₹0 (नि:शुल्क)
              </span>
            </div>

            <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{storeAddress}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{storeTimings}</span>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-3 text-xs text-emerald-950 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {storeInstructions}
              </span>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#4A3728] text-sm">
                  ग्राहक विवरण (Customer Information)
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                पिकअप व इनवॉइस के लिए
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    पूरा नाम (Full Name) *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="उदा: किशोर पाटीदार"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    मोबाइल नंबर (Mobile Number) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Village / Town (Optional for farmer records) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    गांव / कस्बा (Village / Town)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: शामगढ़ / रूपावली / चंदवासा"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    ईमेल (वैकल्पिक / बिलिंग रसीद के लिए)
                  </label>
                  <input
                    type="email"
                    placeholder="उदा: farmer@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cart Products Review list */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3">
            <h4 className="font-bold text-[#4A3728] text-xs uppercase tracking-wider flex items-center justify-between">
              <span>ऑर्डर किए गए उत्पाद ({cartCount})</span>
              <span className="text-[10px] text-gray-400 font-medium lowercase">कुल वजन: लगभग {totalCartWeightKg} kg</span>
            </h4>

            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center gap-3">
                  <SmartImage
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-gray-800 truncate">
                      {item.product.hindiName}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      मात्रा: {item.unit} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-gray-900">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Price Summary & Payment (Sticky on Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
          {/* Price Summary Card */}
          <div className="bg-[#F5F2ED] rounded-3xl p-4 sm:p-5 border border-[#4A3728]/10 space-y-2.5 text-xs">
            <h4 className="font-bold text-[#4A3728] text-sm border-b border-gray-200/60 pb-2">
              ऑर्डर एवं मूल्य विवरण
            </h4>

            <div className="flex justify-between text-gray-700 font-medium">
              <span>उत्पाद कुल मूल्य:</span>
              <span className="font-bold text-gray-900">₹{cartTotal}</span>
            </div>

            <div className="flex justify-between text-gray-700 font-medium items-center">
              <span>डिलीवरी / पिकअप शुल्क:</span>
              <span className="text-emerald-700 font-black bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                ₹0 (नि:शुल्क पिकअप)
              </span>
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-gray-300/50 text-sm font-bold text-[#4A3728]">
              <span>कुल देय राशि:</span>
              <span className="text-xl font-black text-[#2D5A27]">
                ₹{cartTotal}
              </span>
            </div>

            <div className="pt-2 text-[11px] text-gray-500 flex items-center gap-1.5 border-t border-gray-200/50">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                UPI, कार्ड और नेट बैंकिंग द्वारा 100% सुरक्षित ऑनलाइन भुगतान
              </span>
            </div>
          </div>

          {/* Pay Online Button */}
          <button
            type="submit"
            disabled={isProcessing || !isDeliveryActive}
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              !isDeliveryActive
                ? "bg-gray-400 text-white shadow-none"
                : "bg-[#2D5A27] hover:bg-[#2D5A27]/90 text-white shadow-[#2D5A27]/25"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                सुरक्षित पेमेंट विंडो खुल रही है...
              </>
            ) : !isDeliveryActive ? (
              <>
                <Store className="w-5 h-5" />
                ऑनलाइन ऑर्डर सेवा बंद है
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 text-[#EAB308]" />
                {`₹${cartTotal} का ऑनलाइन भुगतान करें`}
              </>
            )}
          </button>

          {/* Quick Fallback Support Line */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleWhatsAppHelp}
              className="text-xs text-gray-500 hover:text-gray-800 underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              पिकअप में कोई सवाल? व्हाट्सएप पर संपर्क करें
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
