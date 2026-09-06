import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, ShieldCheck, Truck, CheckCircle2, 
  MapPin, Phone, User, AlertCircle, ShoppingBag, 
  CreditCard, Loader2, Sparkles, MessageSquare, Info, RefreshCw,
  Scale, Navigation, Zap, LocateFixed, ChevronDown, ChevronUp, PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { getCustomerDetails, saveCustomerDetails } from '../utils/customerStorage';
import { createNewOrder } from '../services/orderService';
import { initiateRazorpayPayment, fetchRazorpayPublicConfig } from '../services/razorpayService';
import { OrderItem, RazorpayPublicConfig } from '../types';
import { 
  calculateCartWeight, 
  calculateDynamicDeliveryCharge, 
  createDeliverySnapshot, 
  detectDeliveryDistance,
  getSmartProductWeightDetail,
  STORE_ORIGIN,
  DistanceDetectionResult
} from '../utils/deliveryCalculator';
import { 
  requestHighAccuracyGps, 
  fetchDrivingRoadDistance, 
  UserCoordsWithAccuracy 
} from '../services/deliveryDistanceService';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { appContent, deliveryConfig, user } = useAppContext();

  // Customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressHouse, setAddressHouse] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressDistrict, setAddressDistrict] = useState('');
  const [addressState, setAddressState] = useState('मध्यप्रदेश');
  const [addressPincode, setAddressPincode] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Location & Distance state
  const [userCoords, setUserCoords] = useState<UserCoordsWithAccuracy | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<DistanceDetectionResult | null>(null);
  const [showWeightBreakdown, setShowWeightBreakdown] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentFailedError, setPaymentFailedError] = useState<string | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<RazorpayPublicConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // System-calculated distance (strictly non-editable by user)
  const distanceKm = useMemo(() => {
    if (distanceInfo && distanceInfo.isValidLocation && distanceInfo.distanceKm > 0) {
      return distanceInfo.distanceKm;
    }
    return 0;
  }, [distanceInfo]);

  // Check if minimum address information is filled
  const isAddressSufficient = useMemo(() => {
    const cleanPin = (addressPincode || '').trim().replace(/\D/g, '');
    const hasCity = (addressCity || '').trim().length >= 2;
    const hasStreet = (addressHouse || '').trim().length >= 2;
    const hasDistrict = (addressDistrict || '').trim().length >= 2;
    const hasName = (name || '').trim().length >= 2;
    const hasPhone = (phone || '').trim().replace(/\D/g, '').length >= 10;
    
    return cleanPin.length === 6 && (hasCity || hasDistrict || hasStreet) && (hasName || hasPhone);
  }, [addressPincode, addressCity, addressDistrict, addressHouse, name, phone]);

  // AI Smart Product Weights Breakdown
  const itemsWeightBreakdown = useMemo(() => {
    return cartItems.map((item) => {
      const detail = getSmartProductWeightDetail(item.unit, item.product);
      return {
        item,
        detail,
        totalItemWeight: Math.round(detail.totalItemWeightKg * item.quantity * 100) / 100,
      };
    });
  }, [cartItems]);

  const totalCartWeightKg = useMemo(() => {
    return calculateCartWeight(cartItems);
  }, [cartItems]);

  // Recalculate Distance strictly via System Detection (Address, Pincode, GPS, Geocoding)
  const runDistanceDetection = useCallback(() => {
    const result = detectDeliveryDistance({
      pincode: addressPincode,
      city: addressCity,
      district: addressDistrict,
      state: addressState,
      street: addressHouse,
      coords: userCoords ? { lat: userCoords.lat, lng: userCoords.lng } : null,
    }, deliveryConfig);

    setDistanceInfo(result);
  }, [addressPincode, addressCity, addressDistrict, addressState, addressHouse, userCoords, deliveryConfig]);

  // Trigger system detection whenever address inputs change
  useEffect(() => {
    runDistanceDetection();
  }, [addressPincode, addressCity, addressDistrict, addressHouse, addressState, userCoords, runDistanceDetection]);

  // Dynamic Delivery Calculations (Vehicle + System Distance + Weight)
  const deliveryQuote = useMemo(() => {
    if (!distanceInfo?.isValidLocation || distanceKm <= 0) {
      return calculateDynamicDeliveryCharge(
        totalCartWeightKg,
        0,
        deliveryConfig,
        cartTotal
      );
    }

    return calculateDynamicDeliveryCharge(
      totalCartWeightKg,
      distanceKm,
      deliveryConfig,
      cartTotal
    );
  }, [totalCartWeightKg, distanceKm, distanceInfo, deliveryConfig, cartTotal]);

  const isLocationValid = Boolean(distanceInfo?.isValidLocation && distanceKm > 0);
  const finalDeliveryCharges = isLocationValid ? deliveryQuote.finalDeliveryCharge : 0;
  const finalPayableTotal = isLocationValid ? (cartTotal + finalDeliveryCharges) : cartTotal;
  const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';

  // High-Accuracy Geolocation Trigger with Live Road Route Calculation
  const handleDetectGpsLocation = async () => {
    setIsDetectingGps(true);
    setGpsError(null);

    try {
      const { coords } = await requestHighAccuracyGps();
      setUserCoords(coords);

      // Immediately query real road driving distance from Store Origin
      const originLat = deliveryConfig?.storeOrigin?.latitude || STORE_ORIGIN.lat;
      const originLng = deliveryConfig?.storeOrigin?.longitude || STORE_ORIGIN.lng;
      
      const routeRes = await fetchDrivingRoadDistance(originLat, originLng, coords.lat, coords.lng);
      const calculatedKm = routeRes?.distanceKm || detectDeliveryDistance({ coords }, deliveryConfig).distanceKm;

      setDistanceInfo({
        distanceKm: calculatedKm,
        formattedDistance: `लगभग ${calculatedKm} km`,
        isValidLocation: true,
        confidence: 'exact',
        locationLabel: `GPS वास्तविक लोकेशन (सड़क मार्ग दूरी: लगभग ${calculatedKm} km, सटीकता ±${coords.accuracy || 10}m)`,
        source: 'gps',
        isLocal: calculatedKm <= 10,
        accuracyMeters: coords.accuracy,
      });

      // Auto-fill Shamgarh if within local zone
      if (calculatedKm <= 5 && (!addressCity || !addressDistrict)) {
        if (!addressCity) setAddressCity('शामगढ़');
        if (!addressDistrict) setAddressDistrict('मंदसौर');
        if (!addressPincode) setAddressPincode('458883');
      }
    } catch (err: any) {
      console.warn('High accuracy GPS error:', err);
      setGpsError(err.message || 'आपकी सटीक Location नहीं मिल पाई। कृपया GPS/Location चालू करें और पुनः प्रयास करें।');
    } finally {
      setIsDetectingGps(false);
    }
  };

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
    if (details.addressHouse) setAddressHouse(details.addressHouse);
    if (details.addressCity) setAddressCity(details.addressCity);
    if (details.addressDistrict) setAddressDistrict(details.addressDistrict);
    if (details.addressState) setAddressState(details.addressState);
    if (details.addressPincode) setAddressPincode(details.addressPincode);

    if (user?.displayName && !details.name) setName(user.displayName);
    if (user?.email) setCustomerEmail(user.email);
  }, [user]);

  // If delivery is suspended, show courteous master control unavailable screen
  const isDeliveryActive = deliveryConfig?.isDeliveryActive !== false && appContent?.isDeliveryActive !== false;

  if (!isDeliveryActive && !isProcessing) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-8 px-4">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-100/80 shadow-xs">
            <Truck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-black text-gray-800">
              अभी होम डिलीवरी सेवा उपलब्ध नहीं है
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto font-medium">
              असुविधा के लिए खेद है। फिलहाल होम डिलीवरी सेवा अस्थायी रूप से बंद है। जल्द ही सेवा पुनः शुरू की जाएगी। कृपया कुछ समय बाद दोबारा प्रयास करें। आपके सहयोग के लिए धन्यवाद।
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="px-6 py-3.5 bg-[#2D5A27] text-white rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-[#2D5A27]/20 hover:bg-[#2D5A27]/90 active:scale-95 transition-all"
            >
              ठीक है (कार्ट पर लौटें)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If cart is empty and not processing, allow quick redirect
  if (cartItems.length === 0 && !isProcessing) {
    return (
      <div className="text-center py-12 px-4 space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
        <h3 className="font-bold text-gray-700 text-lg">चेकआउट के लिए कोई उत्पाद नहीं है</h3>
        <p className="text-xs text-gray-400">कृपया पहले कृषि बाजार से उत्पाद अपने कार्ट में जोड़ें।</p>
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
    if (!isDeliveryActive) {
      setErrorMsg('असुविधा के लिए खेद है। फिलहाल होम डिलीवरी सेवा अस्थायी रूप से बंद है। जल्द ही सेवा पुनः शुरू की जाएगी।');
      return false;
    }

    if (gatewayConfig && gatewayConfig.enabled === false) {
      setErrorMsg('Razorpay Payment Gateway वर्तमान में बंद है। ऑनलाइन चेकआउट अस्थायी रूप से उपलब्ध नहीं है।');
      return false;
    }

    if (!name.trim() || !phone.trim() || !addressHouse.trim() || !addressCity.trim() || !addressDistrict.trim() || !addressState.trim() || !addressPincode.trim()) {
      setErrorMsg('कृपया सभी डिलीवरी फ़ील्ड (नाम, फोन, पता, गांव, जिला, राज्य, पिनकोड) भरें।');
      return false;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('कृपया 10-अंकीय मान्य मोबाइल नंबर दर्ज करें।');
      return false;
    }

    const cleanPincode = addressPincode.trim().replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      setErrorMsg('कृपया 6-अंकीय वैध पिन कोड दर्ज करें।');
      return false;
    }

    if (!isLocationValid || distanceKm <= 0) {
      setErrorMsg(distanceInfo?.errorMessage || 'डिलीवरी दूरी निर्धारित नहीं हो सकी। कृपया मान्य 6-अंकीय पिनकोड दर्ज करें या GPS लोकेशन अनुमति दें।');
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
      email: customerEmail?.trim() || user?.email?.trim() || undefined,
      addressHouse: addressHouse.trim(),
      addressCity: addressCity.trim(),
      addressDistrict: addressDistrict.trim(),
      addressState: addressState.trim(),
      addressPincode: cleanPincode,
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

    const deliverySnapshot = createDeliverySnapshot(deliveryQuote);

    setIsProcessing(true);
    setPaymentFailedError(null);

    initiateRazorpayPayment({
      items: orderItems,
      deliveryCharges: finalDeliveryCharges,
      customerName: customerData.name,
      customerPhone: customerData.phone,
      customerEmail: customerEmail || user?.email || undefined,
      appTitle: appContent?.branding?.name || 'फल्सावदिया कृषि बाजार',
      isDeliveryActive,
      onSuccess: async ({ paymentId, razorpayOrderId, mode }) => {
        try {
          const createdOrder = await createNewOrder({
            userId: user?.uid,
            userEmail: user?.email || customerEmail || undefined,
            customerDetails: customerData,
            items: orderItems,
            itemCount: cartCount,
            itemsTotal: cartTotal,
            deliveryCharges: finalDeliveryCharges,
            totalAmount: finalPayableTotal,
            deliverySnapshot: deliverySnapshot,
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
    const helpMsg = `नमस्ते फल्सावदिया कृषि बाजार! मुझे चेकआउट / ऑनलाइन भुगतान में सहायता चाहिए।\nग्राहक: ${name || 'किसान'}\nमोबाइल: ${phone || ''}`;
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
        {/* Left Column: Delivery Address & Vehicle Details */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Step 1: Customer & Delivery Address Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#4A3728] text-sm">
                  डिलीवरी पता एवं विवरण (Delivery Address)
                </h3>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                * सभी विवरण अनिवार्य
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">पूरा नाम (Full Name) *</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="उदा: किशोर पाटीदार / Kishore Patidar"
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
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="उदा: 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800"
                    />
                  </div>
                </div>
              </div>

            {/* House / Street / Landmark */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                मकान / खेत का पता / गली (House, Street, Landmark) *
              </label>
              <input
                type="text"
                required
                placeholder="उदा: मकान नं. 01, पाटीदार मोहल्ला"
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
                  placeholder="उदा: शामगढ़ / गरोठ / सुवासरा"
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
                  placeholder="उदा: मंदसौर"
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
                  placeholder="उदा: मध्य प्रदेश"
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
                  placeholder="उदा: 458883"
                  value={addressPincode}
                  onChange={(e) => setAddressPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27] outline-none text-gray-800 font-bold"
                />
              </div>
            </div>

            {/* Live GPS Auto-detect Button */}
            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDetectGpsLocation}
                disabled={isDetectingGps}
                className="text-[11px] text-[#2D5A27] font-bold bg-[#2D5A27]/8 hover:bg-[#2D5A27]/15 py-1.5 px-3 rounded-xl inline-flex items-center gap-1.5 transition-colors active:scale-95"
              >
                {isDetectingGps ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5 text-[#2D5A27]" />
                )}
                <span>वर्तमान GPS लोकेशन से सटीक दूरी निकालें</span>
              </button>

              {userCoords && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ✓ GPS सक्रिय
                </span>
              )}
            </div>

            {gpsError && (
              <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                {gpsError}
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Smart Delivery Location & Calculation Section */}
        {isAddressSufficient ? (
          isLocationValid ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Delivery Location & Distance Card - Pure System Auto-calculated */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                        <span>दुकान से डिलीवरी दूरी</span>
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        Store Origin: फल्सावदिया कृषि बाजार ({STORE_ORIGIN.pincode})
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-[#2D5A27] bg-[#ECFDF5] px-3 py-1.5 rounded-xl border border-emerald-200 inline-block shadow-2xs">
                      Delivery Distance: लगभग {distanceKm} km
                    </span>
                  </div>
                </div>

                {/* Calculation Source Badge */}
                <div className="text-[11px] text-gray-700 bg-gray-50/80 p-2.5 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      लोकेशन आधार: <strong className="text-gray-900">{distanceInfo?.locationLabel || `पिनकोड ${addressPincode}`}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-100">
                    {distanceInfo?.source === 'gps' ? '📍 GPS सड़क मार्ग' : distanceInfo?.source === 'town_match' ? 'सटीक क्षेत्रीय दूरी' : 'पिनकोड मैट्रिक्स'}
                  </span>
                </div>
              </div>

              {/* Smart Vehicle & Weight Transparent Calculation Card */}
              <div className="bg-gradient-to-br from-emerald-50/90 to-teal-50/70 rounded-3xl p-4 sm:p-5 border border-emerald-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{deliveryQuote.vehicleEmoji}</span>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <span>डिलीवरी वाहन: {deliveryQuote.vehicleNameHindi}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-white/90 px-1.5 py-0.2 rounded border border-emerald-200">
                          {deliveryQuote.vehicleType}
                        </span>
                      </h4>
                      <p className="text-[10px] text-emerald-800">
                        कुल वजन ({totalCartWeightKg} kg) व दूरी ({deliveryQuote.distanceKm} km) अनुसार स्वतः चयनित
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-900">
                      {deliveryQuote.isFreeDelivery ? (
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-black text-[11px]">
                          मुफ़्त (FREE)
                        </span>
                      ) : (
                        `₹${deliveryQuote.finalDeliveryCharge}`
                      )}
                    </span>
                  </div>
                </div>

                {/* 3 Metric Badges */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-emerald-200/60 text-[10px]">
                  <div className="bg-white/85 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-gray-500 font-bold">
                      <Scale className="w-3 h-3 text-[#2D5A27]" />
                      <span>कुल वजन</span>
                    </div>
                    <p className="font-black text-xs text-gray-800 mt-0.5">लगभग {totalCartWeightKg} kg</p>
                  </div>

                  <div className="bg-white/85 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-gray-500 font-bold">
                      <Navigation className="w-3 h-3 text-[#2D5A27]" />
                      <span>दूरी</span>
                    </div>
                    <p className="font-black text-xs text-gray-800 mt-0.5">{deliveryQuote.distanceKm} km</p>
                  </div>

                  <div className="bg-white/85 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-gray-500 font-bold">
                      <Zap className="w-3 h-3 text-[#2D5A27]" />
                      <span>डिलीवरी शुल्क</span>
                    </div>
                    <p className="font-black text-xs text-emerald-700 mt-0.5">
                      {deliveryQuote.isFreeDelivery ? '₹0 (मुफ़्त)' : `₹${deliveryQuote.finalDeliveryCharge}`}
                    </p>
                  </div>
                </div>

                {/* Weight Details Expandable Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowWeightBreakdown(!showWeightBreakdown)}
                    className="w-full text-left flex items-center justify-between text-[11px] font-bold text-emerald-900 bg-white/70 hover:bg-white/90 p-2 rounded-xl border border-emerald-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>उत्पाद पैकिंग व वजन विवरण देखें ({itemsWeightBreakdown.length} उत्पाद)</span>
                    </div>
                    {showWeightBreakdown ? (
                      <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showWeightBreakdown && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 pt-2 text-[10px] text-gray-700"
                      >
                        {itemsWeightBreakdown.map((row, idx) => (
                          <div key={idx} className="bg-white/90 p-2 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-gray-800">{row.item.product.hindiName}</p>
                              <p className="text-gray-500 text-[9px]">
                                मात्रा: {row.item.unit} × {row.item.quantity} • {row.detail.packagingLabelHindi} (नेट {row.detail.netWeightKg}kg + पैकिंग {row.detail.packagingAllowanceKg}kg)
                              </p>
                            </div>
                            <span className="font-black text-gray-800 text-xs">
                              {row.totalItemWeight} kg
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Free delivery or Note */}
                {deliveryQuote.calculationNote && (
                  <p className="text-[10px] text-emerald-900 bg-white/75 p-2 rounded-xl border border-emerald-100">
                    💡 <strong>गणना विवरण:</strong> {deliveryQuote.calculationNote}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Invalid / Indeterminate Location Alert */
            <div className="bg-red-50 border border-red-200 rounded-3xl p-4 sm:p-5 text-xs text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>⚠️ डिलीवरी दूरी निर्धारित नहीं हो सकी (Location Unresolved)</span>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                {distanceInfo?.errorMessage || 'दर्ज किए गए पते या पिनकोड से सटीक लोकेशन नहीं मिल पाई है। गलत डिलीवरी शुल्क से बचने के लिए कृपया मान्य 6-अंकीय पिनकोड और पूरा पता दर्ज करें या ऊपर दिए गए "वर्तमान GPS लोकेशन से सटीक दूरी निकालें" बटन को दबाएं।'}
              </p>
            </div>
          )
        ) : (
          /* When address is not yet filled */
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-4 sm:p-5 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>📍 डिलीवरी गणना प्रतीक्षा (Address Required)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              कृपया ऊपर अपना <strong>पूरा पता, गांव/शहर और 6-अंकीय पिनकोड</strong> भरें। आपके पते के आधार पर फल्सावदिया स्टोर से वास्तविक दूरी (km), आटोमेटिक कार्ट वजन और डिलीवरी वाहन (बाइक, ई-रिक्शा, टेम्पो या ट्रक) का चयन होकर वास्तविक डिलीवरी शुल्क तय होगा।
            </p>
          </div>
        )}
        </div>

        {/* Right Column: Price Summary & Payment (Sticky on Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
          {/* Step 3: Transparent Price Summary Card */}
          <div className="bg-[#F5F2ED] rounded-3xl p-4 sm:p-5 border border-[#4A3728]/10 space-y-2.5 text-xs">
            <h4 className="font-bold text-[#4A3728] text-sm border-b border-gray-200/60 pb-2">
              ऑर्डर एवं मूल्य विवरण (Price Breakdown)
            </h4>

            <div className="flex justify-between text-gray-700 font-medium">
              <span>उत्पाद कुल मूल्य (Product Total):</span>
              <span className="font-bold text-gray-900">₹{cartTotal}</span>
            </div>

            <div className="flex justify-between text-gray-700 font-medium">
              <span>
                डिलीवरी शुल्क ({isLocationValid ? `${deliveryQuote.vehicleType} • ${deliveryQuote.distanceKm} km` : 'पते अनुसार'}):
              </span>
              <span className="font-bold text-emerald-800">
                {isLocationValid ? (
                  deliveryQuote.isFreeDelivery || finalDeliveryCharges === 0 ? (
                    <span className="text-emerald-700 font-black">मुफ़्त (FREE)</span>
                  ) : (
                    `+ ₹${finalDeliveryCharges}`
                  )
                ) : (
                  <span className="text-amber-700 font-bold text-[11px]">स्थान सत्यापन आवश्यक</span>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-gray-300/50 text-sm font-bold text-[#4A3728]">
              <span>कुल देय राशि (Grand Total):</span>
              <span className="text-xl font-black text-[#2D5A27]">
                ₹{isLocationValid ? finalPayableTotal : cartTotal}
              </span>
            </div>

            <div className="pt-2 text-[11px] text-gray-500 flex items-center gap-1.5 border-t border-gray-200/50">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>UPI (PhonePe / GPay / Paytm), कार्ड और नेट बैंकिंग द्वारा 100% सुरक्षित ऑनलाइन भुगतान</span>
            </div>
          </div>

          {/* Step 4: Pay Online Button */}
          <button
            type="submit"
            disabled={isProcessing || !isDeliveryActive || !isLocationValid}
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              !isDeliveryActive || !isLocationValid
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
                <Truck className="w-5 h-5" />
                डिलीवरी सेवा बंद है (Delivery Suspended)
              </>
            ) : !isLocationValid ? (
              <>
                <MapPin className="w-5 h-5" />
                मान्य डिलीवरी पता व पिनकोड दर्ज करें (Address Required)
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 text-[#EAB308]" />
                ₹{finalPayableTotal} का ऑनलाइन भुगतान करें (Pay with UPI / Razorpay)
              </>
            )}
          </button>

          {/* Quick Fallback Support Line */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleWhatsAppHelp}
              className="text-xs text-gray-500 hover:text-gray-800 underline font-medium inline-flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              चेकआउट में कोई समस्या? व्हाट्सएप हेल्पलाइन से सहायता लें
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
