import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, ShieldCheck, CheckCircle2, 
  MapPin, Phone, User, AlertCircle, ShoppingBag, 
  CreditCard, Loader2, MessageSquare, Info,
  Store, Clock, EyeOff, Sparkles, Truck, Bike,
  Check, Navigation, AlertTriangle, Building2, MapPinned
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SmartImage from '../components/SmartImage';
import { getCustomerDetails, saveCustomerDetails } from '../utils/customerStorage';
import { createNewOrder } from '../services/orderService';
import { initiateRazorpayPayment, fetchRazorpayPublicConfig } from '../services/razorpayService';
import { OrderItem, RazorpayPublicConfig, OrderDeliverySnapshot, VillageDeliveryEntry } from '../types';
import { calculateCartWeight, calculateDynamicDeliveryCharge, formatWeightSlabLabel } from '../utils/deliveryCalculator';
import { 
  getCombinedVillageDirectory, 
  findVillageMatch, 
  getIntelligentVillageSuggestions,
  getCombinedTehsils,
  PRIMARY_TEHSILS 
} from '../data/villageDirectory';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const { appContent, deliveryConfig, user } = useAppContext();

  // Master delivery availability flags: Store Pickup is the Master Online Ordering Switch!
  const isOnlineOrderingActive = (deliveryConfig?.enableStorePickup !== false) && 
                                (deliveryConfig?.isDeliveryActive !== false) && 
                                (appContent?.isDeliveryActive !== false);
  const isMasterActive = isOnlineOrderingActive;
  const isStorePickupAllowed = isOnlineOrderingActive;
  const isLocalDeliveryAllowed = isOnlineOrderingActive && (deliveryConfig?.enableLocalDelivery !== false);

  // Selected delivery method: 'store_pickup' | 'local_delivery'
  const [deliveryMethod, setDeliveryMethod] = useState<'store_pickup' | 'local_delivery'>('store_pickup');

  // Enforce delivery method constraint: if Home Delivery is not allowed, auto-switch to store_pickup
  useEffect(() => {
    if (!isLocalDeliveryAllowed && deliveryMethod === 'local_delivery') {
      setDeliveryMethod('store_pickup');
    }
  }, [isLocalDeliveryAllowed, deliveryMethod]);

  // Customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressHouse, setAddressHouse] = useState('');
  const [addressCity, setAddressCity] = useState('शामगढ़');
  const [addressTehsil, setAddressTehsil] = useState('शामगढ़');
  const [addressDistrict, setAddressDistrict] = useState(deliveryConfig?.storeOrigin?.district || 'मंदसौर');
  const [addressState, setAddressState] = useState(deliveryConfig?.storeOrigin?.state || 'मध्यप्रदेश');
  const [addressPincode, setAddressPincode] = useState(deliveryConfig?.storeOrigin?.pincode || '458883');
  const [customerEmail, setCustomerEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value);
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (errorMsg) {
      setErrorMsg('');
    }
  };

  // Suggestions & Village matching
  const [showVillageSuggestions, setShowVillageSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentFailedError, setPaymentFailedError] = useState<string | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<RazorpayPublicConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const totalCartWeightKg = calculateCartWeight(cartItems);

  // Store information
  const storeName = deliveryConfig?.storeOrigin?.name || 'फल्सावदिया कृषि बाजार';
  const storeLocation = deliveryConfig?.storeOrigin?.city || 'शामगढ़';
  const storeAddress = deliveryConfig?.storeOrigin?.address || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़';
  const storeTimings = deliveryConfig?.pickupTimings || 'प्रतिदिन सुबह 08:00 बजे से रात 08:00 बजे तक';
  const storeInstructions = deliveryConfig?.pickupInstructions || 'ऑर्डर कन्फर्म होने के बाद आपका सामान दुकान पर पैक होकर सुरक्षित रख दिया जाएगा। आप कभी भी दुकान पर आकर अपना ऑर्डर नंबर दिखाकर तुरंत माल प्राप्त कर सकते हैं।';
  const whatsappNumber = appContent?.contactInfo?.whatsapp || '918982338046';

  // Directory resolution
  const allVillages = useMemo(() => {
    return getCombinedVillageDirectory(deliveryConfig?.villageDirectory);
  }, [deliveryConfig?.villageDirectory]);

  // Village Match resolution
  const matchedVillage: VillageDeliveryEntry | null = useMemo(() => {
    if (!addressCity.trim()) return null;
    return findVillageMatch(addressCity, addressTehsil, allVillages);
  }, [addressCity, addressTehsil, allVillages]);

  // Intelligent autocomplete suggestions
  const villageSuggestions = useMemo(() => {
    if (!addressCity.trim() || addressCity.length < 1) return [];
    return getIntelligentVillageSuggestions(addressCity, addressTehsil, allVillages, 6);
  }, [addressCity, addressTehsil, allVillages]);

  // Dynamic Delivery Quote Calculation for Local Delivery
  const deliveryQuote = useMemo(() => {
    if (deliveryMethod === 'store_pickup') {
      return null;
    }
    if (!matchedVillage || matchedVillage.isActive === false) {
      return null;
    }
    return calculateDynamicDeliveryCharge(
      totalCartWeightKg,
      matchedVillage.distanceKm,
      deliveryConfig,
      cartTotal
    );
  }, [deliveryMethod, matchedVillage, totalCartWeightKg, deliveryConfig, cartTotal]);

  const deliveryCharge = deliveryMethod === 'store_pickup' 
    ? 0 
    : (deliveryQuote?.isServiceable ? deliveryQuote.finalDeliveryCharge : 0);

  const finalOrderTotal = cartTotal + deliveryCharge;

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
    if (details.addressTehsil) setAddressTehsil(details.addressTehsil);
    if (details.addressDistrict) setAddressDistrict(details.addressDistrict);
    if (details.addressState) setAddressState(details.addressState);
    if (details.addressPincode) setAddressPincode(details.addressPincode);

    if (user?.displayName && !details.name) setName(user.displayName);
    if (user?.email) setCustomerEmail(user.email);
  }, [user]);

  // Maintain active delivery option consistency: if local delivery is disabled, fallback to store pickup
  useEffect(() => {
    if (!isLocalDeliveryAllowed && deliveryMethod === 'local_delivery') {
      setDeliveryMethod('store_pickup');
    }
  }, [isLocalDeliveryAllowed, deliveryMethod]);

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

  if (!isMasterActive && !isProcessing) {
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
              असुविधा के लिए खेद है। फिलहाल दुकान से ऑनलाइन ऑर्डर सेवा अस्थायी रूप से बंद है। कृपया किसी भी उत्पाद के लिए फोन या WhatsApp पर संपर्क करें।
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
    const errors: Record<string, string> = {};

    if (hasHiddenPriceItems) {
      setErrorMsg('उत्पादों की कीमतें छिपी होने के कारण ऑनलाइन चेकआउट उपलब्ध नहीं है। कृपया WhatsApp या फोन पर संपर्क करें।');
      return false;
    }

    if (!isOnlineOrderingActive) {
      setErrorMsg('ऑनलाइन ऑर्डरिंग सेवा वर्तमान में अस्थायी रूप से बंद है। नया ऑर्डर दर्ज नहीं किया जा सकता।');
      return false;
    }

    if (deliveryMethod === 'local_delivery' && !isLocalDeliveryAllowed) {
      setErrorMsg('होम डिलीवरी सेवा वर्तमान में बंद है। कृपया "दुकान से स्वयं पिकअप" विकल्प चुनें।');
      return false;
    }

    if (gatewayConfig && gatewayConfig.enabled === false) {
      setErrorMsg('Razorpay Payment Gateway वर्तमान में बंद है। ऑनलाइन चेकआउट अस्थायी रूप से उपलब्ध नहीं है।');
      return false;
    }

    // 1. पूरा नाम (Full Name) - अनिवार्य
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'कृपया अपना पूरा नाम दर्ज करें।';
    } else if (trimmedName.length < 2) {
      errors.name = 'कृपया कम से कम 2 अक्षरों का मान्य नाम दर्ज करें।';
    }

    // 2. मोबाइल नंबर (Mobile Number) - अनिवार्य (10 अंक, 6-9 से शुरू)
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'कृपया अपना 10-अंकीय मोबाइल नंबर दर्ज करें।';
    } else if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errors.phone = 'कृपया 10-अंकीय मान्य मोबाइल नंबर दर्ज करें (उदा: 9876543210)।';
    }

    // 3. मकान / खेत का पता / गली / मोहल्ला (Address / Landmark) - अनिवार्य (सभी मोड के लिए)
    const trimmedHouse = addressHouse.trim();
    if (!trimmedHouse) {
      errors.addressHouse = 'कृपया मकान / खेत का पता, गली, मोहल्ला या Landmark दर्ज करें।';
    } else if (trimmedHouse.length < 3) {
      errors.addressHouse = 'कृपया कम से कम 3 अक्षरों का स्पष्ट पता दर्ज करें।';
    }

    // 4. गाँव / शहर (Village / Town) - अनिवार्य (सभी मोड के लिए)
    const trimmedCity = addressCity.trim();
    if (!trimmedCity) {
      errors.addressCity = 'कृपया अपना गाँव अथवा शहर का नाम दर्ज करें।';
    }

    // 5. तहसील (Tehsil) - अनिवार्य
    const trimmedTehsil = addressTehsil.trim();
    if (!trimmedTehsil) {
      errors.addressTehsil = 'कृपया अपनी तहसील का चयन करें।';
    }

    // 6. जिला (District) - अनिवार्य
    const trimmedDistrict = addressDistrict.trim();
    if (!trimmedDistrict) {
      errors.addressDistrict = 'कृपया अपना जिला दर्ज करें।';
    }

    // 7. राज्य (State) - अनिवार्य
    const trimmedState = addressState.trim();
    if (!trimmedState) {
      errors.addressState = 'कृपया अपना राज्य दर्ज करें।';
    }

    // 8. पिन कोड (Pincode) - अनिवार्य (6 अंक)
    const cleanPin = addressPincode.trim().replace(/\D/g, '');
    if (!cleanPin) {
      errors.addressPincode = 'कृपया अपना 6-अंकीय पिन कोड दर्ज करें।';
    } else if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      errors.addressPincode = 'कृपया 6-अंकीय मान्य पिन कोड दर्ज करें (उदा: 458883)।';
    }

    // ईमेल (Email) - एकमात्र वैकल्पिक (Optional) फील्ड, यदि दर्ज हो तो फॉर्मेट जांचें
    if (customerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail.trim())) {
        errors.customerEmail = 'कृपया मान्य ईमेल आईडी दर्ज करें अथवा इसे खाली छोड़ दें।';
      }
    }

    // होम डिलीवरी के लिए गाँव डायरेक्टरी व रेट मैट्रिक्स सत्यापन
    if (deliveryMethod === 'local_delivery') {
      if (!trimmedCity) {
        errors.addressCity = 'कृपया डिलीवरी के लिए अपना गाँव / शहर दर्ज करें।';
      } else if (!matchedVillage) {
        errors.addressCity = `गाँव "${trimmedCity}" स्थानीय डिलीवरी सेवा क्षेत्र में नहीं मिला। सूची से अधिकृत गाँव चुनें या पिकअप चुनें।`;
      } else if (matchedVillage.isActive === false) {
        errors.addressCity = `गाँव "${matchedVillage.nameHi}" के लिए डिलीवरी सेवा अस्थायी रूप से बंद है।`;
      } else if (!deliveryQuote || deliveryQuote.isServiceable === false) {
        errors.addressCity = deliveryQuote?.calculationNote || 'इस दूरी व वजन के लिए डिलीवरी दर निर्धारित नहीं है। कृपया स्टोर से संपर्क करें या पिकअप चुनें।';
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setErrorMsg(firstError || 'कृपया फॉर्म में सभी अनिवार्य विवरण (*) सही-सही भरें।');
      return false;
    }

    setErrorMsg('');
    return true;
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanPin = addressPincode.trim().replace(/\D/g, '');

    const customerData = {
      name: name.trim(),
      phone: cleanPhone,
      email: customerEmail?.trim() || user?.email?.trim() || undefined,
      addressHouse: addressHouse.trim(),
      addressCity: addressCity.trim(),
      addressTehsil: addressTehsil.trim(),
      addressDistrict: addressDistrict.trim(),
      addressState: addressState.trim(),
      addressPincode: cleanPin,
    };

    // Save details for future autofill
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

    // Build Delivery Snapshot
    let orderDeliverySnapshot: OrderDeliverySnapshot;

    if (deliveryMethod === 'store_pickup') {
      orderDeliverySnapshot = {
        totalWeightKg: totalCartWeightKg,
        distanceKm: 0,
        vehicleId: 'pickup',
        vehicleName: 'दुकान से स्वयं पिकअप',
        vehicleIcon: 'store',
        vehicleEmoji: 'store',
        vehicleNameHindi: 'दुकान से स्वयं पिकअप (Store Pickup)',
        vehicleType: 'pickup',
        distanceSlabLabel: 'दुकान पर (At Store)',
        weightSlabLabel: `${totalCartWeightKg.toFixed(2)} kg`,
        calculatedCharge: 0,
        finalCharge: 0,
        isFreeDelivery: true,
        calculatedAt: Date.now(),
      };
    } else {
      orderDeliverySnapshot = {
        totalWeightKg: totalCartWeightKg,
        distanceKm: matchedVillage?.distanceKm || 0,
        vehicleId: deliveryQuote?.vehicle?.id || 'bike',
        vehicleName: deliveryQuote?.vehicle?.name || 'स्थानीय डिलीवरी वाहन',
        vehicleIcon: deliveryQuote?.vehicle?.id === 'bike' ? 'bike' : 'truck',
        vehicleEmoji: deliveryQuote?.vehicle?.icon || 'truck',
        vehicleNameHindi: deliveryQuote?.vehicleNameHindi || deliveryQuote?.vehicle?.name || 'स्थानीय डिलीवरी वाहन',
        vehicleType: deliveryQuote?.vehicleType || deliveryQuote?.vehicle?.shortName || 'Local',
        distanceSlabLabel: deliveryQuote?.distanceSlab?.label || `${matchedVillage?.distanceKm} किमी`,
        weightSlabLabel: formatWeightSlabLabel(
          deliveryQuote?.weightSlab?.minWeightKg,
          deliveryQuote?.weightSlab?.maxWeightKg,
          deliveryQuote?.weightSlab?.label
        ),
        calculatedCharge: deliveryQuote?.baseCharge || 0,
        finalCharge: deliveryCharge,
        isFreeDelivery: Boolean(deliveryQuote?.isFreeDelivery),
        calculatedAt: Date.now(),
      };
    }

    setIsProcessing(true);
    setPaymentFailedError(null);

    initiateRazorpayPayment({
      items: orderItems,
      deliveryCharges: deliveryCharge,
      customerName: customerData.name,
      customerPhone: customerData.phone,
      customerEmail: customerEmail || user?.email || undefined,
      appTitle: appContent?.branding?.name || 'फल्सावदिया कृषि बाजार',
      isDeliveryActive: isOnlineOrderingActive,
      deliveryType: deliveryMethod,
      onSuccess: async ({ paymentId, razorpayOrderId, mode }) => {
        try {
          const createdOrder = await createNewOrder({
            userId: user?.uid,
            userEmail: user?.email || customerEmail || undefined,
            customerDetails: customerData,
            items: orderItems,
            itemCount: cartCount,
            itemsTotal: cartTotal,
            deliveryCharges: deliveryCharge,
            totalAmount: finalOrderTotal,
            deliverySnapshot: orderDeliverySnapshot,
            deliveryType: deliveryMethod,
            isStorePickup: deliveryMethod === 'store_pickup',
            paymentMethod: 'online_razorpay',
            paymentStatus: 'paid',
            razorpayPaymentId: paymentId,
            razorpayOrderId: razorpayOrderId,
            razorpayMode: mode,
            status: 'confirmed',
            estimatedDeliveryDate: deliveryMethod === 'store_pickup' 
              ? 'दुकान से कभी भी पिकअप करें (सुबह 8:00 AM - रात 8:00 PM)'
              : '24-48 घंटों में घर पर सुरक्षित स्थानीय डिलीवरी',
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
    const helpMsg = `नमस्ते फल्सावदिया कृषि बाजार! मुझे चेकआउट में सहायता चाहिए।\nविकल्प: ${deliveryMethod === 'store_pickup' ? 'दुकान से स्वयं पिकअप' : 'घर तक स्थानीय डिलीवरी'}\nग्राहक: ${name || 'किसान'}\nमोबाइल: ${phone || ''}\nगाँव: ${addressCity || ''}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(helpMsg)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-14 max-w-5xl mx-auto">
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

      {/* Service Unavailable Banner if Online Ordering is OFF */}
      {!isOnlineOrderingActive && (
        <div className="bg-amber-50 border border-amber-200/90 p-5 rounded-3xl flex items-start gap-3.5 shadow-sm">
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0 text-amber-700 mt-0.5 shadow-2xs">
            <Store className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-amber-950 text-sm">
              ऑनलाइन ऑर्डरिंग सेवा वर्तमान में बंद है (Online Ordering Suspended)
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              असुविधा के लिए खेद है। वर्तमान में दुकान द्वारा ऑनलाइन ऑर्डरिंग सेवा अस्थायी रूप से बंद रखी गई है। किसी भी उत्पाद को खरीदने के लिए कृपया सीधे हमारी दुकान (डिंपल चौराहा, शामगढ़) पर पधारें अथवा हेल्पलाइन नंबर पर संपर्क करें।
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Delivery Selector & Form Details */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">

          {/* ========================================================================= */}
          {/* 1. CUSTOMER ADDRESS FORM (PART A.2) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#4A3728] text-sm">
                  ग्राहक का पता एवं संपर्क विवरण (Customer Address)
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                सुरक्षित एवं गोपनीय
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Row 1: Full Name & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    पूरा नाम (Full Name) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="उदा: किशोर पाटीदार"
                      value={name}
                      onChange={(e) => handleFieldChange('name', e.target.value, setName)}
                      className={`w-full pl-9 pr-3 py-2.5 border rounded-xl outline-none text-gray-800 transition-colors ${
                        fieldErrors.name
                          ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                          : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                      }`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    मोबाइल नंबर (Mobile Number) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value.replace(/\D/g, ''), setPhone)}
                      className={`w-full pl-9 pr-3 py-2.5 border rounded-xl outline-none text-gray-800 transition-colors ${
                        fieldErrors.phone
                          ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                          : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                      }`}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: House / Farm / Street / Landmark */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  घर का पता / गली / मोहल्ला <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="उदाः शिव मंदिर के पास, मेन रोड, शामगढ़"
                    value={addressHouse}
                    onChange={(e) => handleFieldChange('addressHouse', e.target.value, setAddressHouse)}
                    className={`w-full pl-9 pr-3 py-2.5 border rounded-xl outline-none text-gray-800 transition-colors ${
                      fieldErrors.addressHouse
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                        : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                    }`}
                  />
                </div>
                {fieldErrors.addressHouse && (
                  <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.addressHouse}
                  </p>
                )}
              </div>

              {/* Row 3: Village / Town & Tehsil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                <div className="relative">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>गाँव / शहर (Village / Town) <span className="text-red-500">*</span></span>
                    {matchedVillage && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> दूरी: {matchedVillage.distanceKm} किमी
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: फल्सावदिया, शामगढ़, मेलखेड़ा..."
                    value={addressCity}
                    onFocus={() => setShowVillageSuggestions(true)}
                    onChange={(e) => {
                      handleFieldChange('addressCity', e.target.value, setAddressCity);
                      setShowVillageSuggestions(true);
                    }}
                    className={`w-full px-3 py-2.5 border rounded-xl outline-none text-gray-800 transition-colors ${
                      fieldErrors.addressCity
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                        : matchedVillage 
                        ? 'border-emerald-300 bg-emerald-50/20 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                    }`}
                  />

                  {/* Autocomplete Suggestions Dropdown */}
                  {showVillageSuggestions && villageSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                      {villageSuggestions.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleFieldChange('addressCity', v.nameHi, setAddressCity);
                            handleFieldChange('addressTehsil', v.tehsil, setAddressTehsil);
                            if (v.pincode) handleFieldChange('addressPincode', v.pincode, setAddressPincode);
                            setShowVillageSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/60 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <p className="font-bold text-gray-800 text-xs">
                              {v.nameHi} <span className="text-[10px] text-gray-500 font-normal">({v.nameEn})</span>
                            </p>
                            <p className="text-[10px] text-gray-400">
                              तहसील: {v.tehsil} • पिन: {v.pincode || '458883'}
                            </p>
                          </div>
                          <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
                            {v.distanceKm} किमी
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {fieldErrors.addressCity && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.addressCity}
                    </p>
                  )}
                </div>

                {/* Tehsil dropdown / selection (Dynamic from deliveryConfig.tehsilDirectory) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    तहसील (Tehsil) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addressTehsil}
                    onChange={(e) => handleFieldChange('addressTehsil', e.target.value, setAddressTehsil)}
                    className={`w-full px-3 py-2.5 border rounded-xl outline-none text-gray-800 bg-white font-medium cursor-pointer transition-colors ${
                      fieldErrors.addressTehsil
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                        : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                    }`}
                  >
                    {(() => {
                      const dynamicTehsils = getCombinedTehsils(deliveryConfig?.tehsilDirectory).filter(t => t.isActive !== false);
                      // Deduplicate by nameHi
                      const seen = new Set<string>();
                      const unique = dynamicTehsils.filter(t => {
                        if (seen.has(t.nameHi)) return false;
                        seen.add(t.nameHi);
                        return true;
                      });

                      // If currently selected addressTehsil isn't in unique, add it so user value is preserved
                      const hasSelected = unique.some(t => t.nameHi === addressTehsil || t.nameEn === addressTehsil);

                      return (
                        <>
                          {!hasSelected && addressTehsil && (
                            <option value={addressTehsil}>
                              {addressTehsil}
                            </option>
                          )}
                          {unique.map((t) => (
                            <option key={t.id} value={t.nameHi}>
                              {t.nameHi} {t.nameEn && t.nameEn !== t.nameHi ? `(${t.nameEn})` : ''}
                            </option>
                          ))}
                        </>
                      );
                    })()}
                  </select>
                  {fieldErrors.addressTehsil && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.addressTehsil}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 4: District, State, Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    जिला (District) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: मंदसौर"
                    value={addressDistrict}
                    onChange={(e) => handleFieldChange('addressDistrict', e.target.value, setAddressDistrict)}
                    className={`w-full px-3 py-2.5 border rounded-xl outline-none text-gray-800 transition-colors ${
                      fieldErrors.addressDistrict
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                        : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                    }`}
                  />
                  {fieldErrors.addressDistrict && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.addressDistrict}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    राज्य (State) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: मध्यप्रदेश"
                    value={addressState}
                    onChange={(e) => handleFieldChange('addressState', e.target.value, setAddressState)}
                    className={`w-full px-3 py-2.5 border rounded-xl outline-none text-gray-800 transition-colors ${
                      fieldErrors.addressState
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                        : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                    }`}
                  />
                  {fieldErrors.addressState && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.addressState}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    पिन कोड (Pincode) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="458883"
                    value={addressPincode}
                    onChange={(e) => handleFieldChange('addressPincode', e.target.value.replace(/\D/g, ''), setAddressPincode)}
                    className={`w-full px-3 py-2.5 border rounded-xl outline-none text-gray-800 transition-colors ${
                      fieldErrors.addressPincode
                        ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                        : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                    }`}
                  />
                  {fieldErrors.addressPincode && (
                    <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.addressPincode}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 5: Optional Customer Email */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  ईमेल (वैकल्पिक / डिजिटल इनवॉइस रसीद के लिए)
                </label>
                <input
                  type="email"
                  placeholder="उदा: farmer@gmail.com (वैकल्पिक)"
                  value={customerEmail}
                  onChange={(e) => handleFieldChange('customerEmail', e.target.value, setCustomerEmail)}
                  className={`w-full px-3 py-2.5 border rounded-xl outline-none text-gray-800 transition-colors ${
                    fieldErrors.customerEmail
                      ? 'border-red-500 bg-red-50/20 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                      : 'border-gray-200 focus:border-[#2D5A27] focus:ring-1 focus:ring-[#2D5A27]'
                  }`}
                />
                {fieldErrors.customerEmail && (
                  <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.customerEmail}
                  </p>
                )}
              </div>

              {/* Professional Information Note (Part 3) */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 shadow-2xs mt-2">
                <div className="w-5 h-5 rounded-lg bg-emerald-100 text-[#2D5A27] flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-3.5 h-3.5 text-[#2D5A27]" />
                </div>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  कृपया ऑर्डर करने से पहले अपने संपर्क एवं पते की जानकारी एक बार अच्छी तरह जाँच लें। सही विवरण होने से आपके ऑर्डर की पिकअप या डिलीवरी में किसी प्रकार की असुविधा नहीं होगी।
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. DELIVERY OPTION SELECTION CARD (MODERN REDESIGN) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-5">
            {/* Header Section */}
            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-emerald-500/15 to-emerald-500/5 text-[#2D5A27] border border-emerald-500/20 flex items-center justify-center shadow-2xs shrink-0">
                  <Truck className="w-5 h-5 text-[#2D5A27]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2 flex-wrap">
                    <span>डिलीवरी का विकल्प चुनें</span>
                    <span className="text-xs font-semibold text-gray-500 hidden sm:inline">(Select Delivery Option)</span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    अपनी सुविधानुसार दुकान से स्वयं पिकअप अथवा घर तक स्थानीय डिलीवरी चुनें
                  </p>
                </div>
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 self-start sm:self-auto shadow-2xs ${
                !isOnlineOrderingActive
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : !isLocalDeliveryAllowed
                  ? 'bg-emerald-50 text-[#2D5A27] border-emerald-300'
                  : 'bg-[#2D5A27]/10 text-[#2D5A27] border-[#2D5A27]/20'
              }`}>
                {!isOnlineOrderingActive ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    ऑनलाइन ऑर्डरिंग सेवा बंद
                  </>
                ) : !isLocalDeliveryAllowed ? (
                  <>
                    <Store className="w-3.5 h-3.5 text-[#2D5A27]" />
                    1 विकल्प (केवल दुकान पिकअप)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#2D5A27]" />
                    2 विकल्प उपलब्ध
                  </>
                )}
              </span>
            </div>

            {/* Two Modern Option Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Store Pickup Card */}
              <button
                type="button"
                disabled={!isStorePickupAllowed}
                onClick={() => setDeliveryMethod('store_pickup')}
                className={`group relative p-5 rounded-3xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 overflow-hidden select-none ${
                  deliveryMethod === 'store_pickup'
                    ? 'border-[#2D5A27] bg-linear-to-b from-emerald-50/50 via-white to-white shadow-md shadow-emerald-950/5 ring-4 ring-[#2D5A27]/10'
                    : 'border-gray-200/90 hover:border-emerald-300 hover:bg-emerald-50/15 hover:shadow-sm bg-white'
                } ${!isStorePickupAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* Top highlight bar on active */}
                {deliveryMethod === 'store_pickup' && (
                  <div className="absolute top-0 left-6 right-6 h-1 bg-[#2D5A27] rounded-b-full" />
                )}

                {/* Card Top: Icon + Price Tag + Radio Indicator */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500/15 to-emerald-500/5 text-[#2D5A27] border border-emerald-500/20 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Store className="w-6 h-6 text-[#2D5A27]" />
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 shadow-2xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-700" />
                      ₹0 (निःशुल्क)
                    </span>

                    {/* Dedicated Radio Selector */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        deliveryMethod === 'store_pickup'
                          ? 'bg-[#2D5A27] text-white shadow-xs ring-2 ring-emerald-200'
                          : 'border-2 border-gray-300 group-hover:border-[#2D5A27]/60 bg-white'
                      }`}
                    >
                      {deliveryMethod === 'store_pickup' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                {/* Card Middle: Titles & Highlights */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                    स्टोर से स्वयं प्राप्त करें
                  </span>
                  <h4 className="text-base font-black text-gray-900 tracking-tight group-hover:text-[#2D5A27] transition-colors">
                    दुकान से स्वयं पिकअप
                  </h4>
                  <p className="text-xs font-semibold text-gray-600">
                    {storeName} • {storeLocation}
                  </p>

                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>डिंपल चौराहा (शामगढ़) दुकान पर तैयार मिलेगा</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>सुबह 8:00 AM – रात 8:00 PM तक कभी भी लें</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Summary Strip */}
                <div className="pt-3 border-t border-emerald-100/80 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A27]" />
                    पिकअप शुल्क:
                  </span>
                  <span className="font-black text-[#2D5A27] bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                    ₹0 (Free Pickup)
                  </span>
                </div>
              </button>

              {/* Option 2: Local Home Delivery Card */}
              <button
                type="button"
                disabled={!isLocalDeliveryAllowed}
                onClick={() => setDeliveryMethod('local_delivery')}
                className={`group relative p-5 rounded-3xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 overflow-hidden select-none ${
                  deliveryMethod === 'local_delivery'
                    ? 'border-blue-700 bg-linear-to-b from-blue-50/50 via-white to-white shadow-md shadow-blue-950/5 ring-4 ring-blue-600/10'
                    : 'border-gray-200/90 hover:border-blue-300 hover:bg-blue-50/15 hover:shadow-sm bg-white'
                } ${!isLocalDeliveryAllowed ? 'opacity-60 cursor-not-allowed bg-gray-50/80' : ''}`}
              >
                {/* Top highlight bar on active */}
                {deliveryMethod === 'local_delivery' && (
                  <div className="absolute top-0 left-6 right-6 h-1 bg-blue-700 rounded-b-full" />
                )}

                {/* Card Top: Icon + Price Tag + Radio Indicator */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-transform shrink-0 ${
                    isLocalDeliveryAllowed
                      ? 'bg-linear-to-br from-blue-500/15 to-blue-500/5 text-blue-700 border border-blue-500/20 group-hover:scale-105'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}>
                    <Truck className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {isLocalDeliveryAllowed ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100/90 text-blue-900 border border-blue-300/80 shadow-2xs flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-blue-700" />
                        स्थान आधारित शुल्क
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 shadow-2xs flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        अस्थायी रूप से बंद
                      </span>
                    )}

                    {/* Dedicated Radio Selector */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        deliveryMethod === 'local_delivery'
                          ? 'bg-blue-700 text-white shadow-xs ring-2 ring-blue-200'
                          : 'border-2 border-gray-300 group-hover:border-blue-400 bg-white'
                      }`}
                    >
                      {deliveryMethod === 'local_delivery' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>

                {/* Card Middle: Titles & Highlights */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                    सीधा आपके पते पर डिलीवरी
                  </span>
                  <h4 className="text-base font-black text-gray-900 tracking-tight group-hover:text-blue-900 transition-colors">
                    घर तक स्थानीय डिलीवरी
                  </h4>
                  <p className="text-xs font-semibold text-gray-600">
                    Local Home Delivery (दुकान के वाहनों द्वारा)
                  </p>

                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>दुकान के अपने वाहन (बाइक/ऑटो/पिकअप) से सुरक्षित</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>150+ अधिकृत गांवों में सीधा आपके खेत/घर तक</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Summary Strip */}
                <div className="pt-3 border-t border-blue-100/80 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    डिलीवरी उपलब्धता:
                  </span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-lg border ${
                    isLocalDeliveryAllowed 
                      ? 'text-blue-800 bg-blue-50 border-blue-200/60' 
                      : 'text-amber-800 bg-amber-50 border-amber-200/60'
                  }`}>
                    {isLocalDeliveryAllowed ? 'केवल अधिकृत गाँवों में' : 'वर्तमान में बंद (केवल पिकअप उपलब्ध)'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. STORE PICKUP SELECTED: STORE DETAILS CARD (MODERN DESIGN) */}
          {/* ========================================================================= */}
          {deliveryMethod === 'store_pickup' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500/15 to-emerald-500/5 text-[#2D5A27] border border-emerald-500/20 flex items-center justify-center shadow-xs shrink-0">
                    <Store className="w-6 h-6 text-[#2D5A27]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 tracking-tight">
                      दुकान से स्वयं पिकअप विवरण
                    </h3>
                    <p className="text-xs text-gray-600 font-semibold mt-0.5">
                      {storeName} • {storeLocation}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-emerald-900 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-300/80 shrink-0 shadow-2xs">
                  ₹0 (नि:शुल्क पिकअप)
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <MapPin className="w-4 h-4 text-[#2D5A27] shrink-0" />
                  <span>{storeAddress}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-xl shrink-0">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{storeTimings}</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-semibold">
                  {storeInstructions}
                </span>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 4. LOCAL HOME DELIVERY SELECTED: DISTANCE & VEHICLE CARDS (PART A.5) */}
          {/* ========================================================================= */}
          {deliveryMethod === 'local_delivery' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Case 1: Village Verified and Active */}
              {matchedVillage && matchedVillage.isActive !== false && deliveryQuote && (
                <>
                  {/* Card 1: Road Distance from Store Origin */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#2D5A27] flex items-center justify-center">
                          <Navigation className="w-4 h-4" />
                        </div>
                        <h4 className="font-black text-gray-900 text-sm">
                          दुकान से डिलीवरी की दूरी (Road Distance)
                        </h4>
                      </div>
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200">
                        {matchedVillage.distanceKm} किमी
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          दुकान का पता (Store Origin)
                        </span>
                        <p className="font-black text-gray-800">
                          फल्सावदिया कृषि बाजार
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                          डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर – (458883)
                        </p>
                      </div>

                      <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                          किसान का डिलीवरी गाँव (Destination)
                        </span>
                        <p className="font-black text-emerald-950">
                          {matchedVillage.nameHi} ({matchedVillage.nameEn})
                        </p>
                        <p className="text-[11px] text-emerald-800/80 font-medium">
                          तहसील: {matchedVillage.tehsil} • Four-Wheeler Road: {matchedVillage.distanceKm} किमी
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Delivery Vehicle & Rate Calculation */}
                  {deliveryQuote.isServiceable !== false ? (
                    <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-xs space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs shrink-0">
                            {deliveryQuote.vehicle?.id === 'bike' ? (
                              <Bike className="w-6 h-6" />
                            ) : (
                              <Truck className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-gray-900">
                                डिलीवरी वाहन: {deliveryQuote.vehicle?.name || 'डिलीवरी वाहन'}
                              </h3>
                              <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                                Active
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                              कुल ऑर्डर वजन: ~{totalCartWeightKg.toFixed(2)} किग्रा (पैकिंग सहित)
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-[#2D5A27]">
                            {deliveryQuote.isFreeDelivery ? '₹0 (मुफ़्त)' : `₹${deliveryCharge}`}
                          </span>
                          <p className="text-[10px] text-gray-400 font-medium">डिलीवरी शुल्क</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-gray-50 p-2.5 rounded-xl">
                          <span className="text-gray-400 block text-[10px]">वजन स्लैब</span>
                          <span className="font-bold text-gray-800">
                            {formatWeightSlabLabel(
                              deliveryQuote.weightSlab?.minWeightKg,
                              deliveryQuote.weightSlab?.maxWeightKg,
                              deliveryQuote.weightSlab?.label
                            )}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl">
                          <span className="text-gray-400 block text-[10px]">दूरी स्लैब</span>
                          <span className="font-bold text-gray-800">{deliveryQuote.distanceSlab?.label || `${matchedVillage.distanceKm} किमी`}</span>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl col-span-2 sm:col-span-1">
                          <span className="text-gray-400 block text-[10px]">डिलीवरी समय</span>
                          <span className="font-bold text-emerald-700">24-48 घंटे</span>
                        </div>
                      </div>

                      <div className="bg-blue-50/70 border border-blue-100/80 rounded-2xl p-3 text-xs text-blue-950 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">
                          {deliveryQuote.calculationNote || 'सामान सीधे दुकान से आपके गाँव तक सुरक्षित पहुँचाया जाएगा। डिलीवरी बॉय ऑर्डर रवाना होने पर फोन पर संपर्क करेगा।'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-3xl space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-amber-950">
                            स्थानीय होम डिलीवरी अनुपलब्ध
                          </h4>
                          <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                            {deliveryQuote.calculationNote || 'इस वजन या दूरी के लिए रेट मैट्रिक्स में डिलीवरी दर निर्धारित नहीं है।'}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-amber-100 flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('store_pickup')}
                          className="px-4 py-2.5 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#23461e] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Store className="w-4 h-4" /> दुकान से स्वयं पिकअप चुनें (₹0 निःशुल्क)
                        </button>
                        <button
                          type="button"
                          onClick={handleWhatsAppHelp}
                          className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4 text-[#25D366]" /> व्हाट्सएप पर सहायता लें
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Case 2: Village Not Yet Entered */}
              {!addressCity.trim() && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-start gap-3 text-amber-900 text-xs">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">कृपया ऊपर अपना गाँव / शहर दर्ज करें</p>
                    <p className="text-[11px] text-amber-800/90 mt-0.5">
                      गाँव का नाम दर्ज करने पर दुकान (शामगढ़) से आपके गाँव की सड़क दूरी और वाहन डिलीवरी शुल्क स्वतः दिखाई देगा।
                    </p>
                  </div>
                </div>
              )}

              {/* Case 3: Village Entered but Not Available in Directory or Inactive */}
              {addressCity.trim() && (!matchedVillage || matchedVillage.isActive === false) && (
                <div className="bg-red-50 border-2 border-red-200 p-5 rounded-3xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-red-950">
                        {matchedVillage && matchedVillage.isActive === false 
                          ? `गाँव "${matchedVillage.nameHi}" में डिलीवरी सेवा अस्थायी रूप से बंद है`
                          : `गाँव "${addressCity}" में स्थानीय होम डिलीवरी उपलब्ध नहीं है`}
                      </h4>
                      <p className="text-xs text-red-800/90 leading-relaxed font-medium">
                        होम डिलीवरी वर्तमान में केवल शामगढ़, गरोठ, सुवासरा, सीतामऊ व आसपास के अधिकृत गाँवों के लिए उपलब्ध है।
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-red-100 flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('store_pickup')}
                      className="px-4 py-2.5 bg-[#2D5A27] text-white rounded-xl text-xs font-bold hover:bg-[#23461e] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Store className="w-4 h-4" /> दुकान से स्वयं पिकअप चुनें (₹0 निःशुल्क)
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsAppHelp}
                      className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-[#25D366]" /> व्हाट्सएप पर सहायता लें
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 5. ORDERED PRODUCTS REVIEW LIST (PART A.4 Card 1) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3">
            <h4 className="font-bold text-[#4A3728] text-xs uppercase tracking-wider flex items-center justify-between">
              <span>ऑर्डर किए गए उत्पाद ({cartCount})</span>
              <span className="text-[10px] text-gray-400 font-medium lowercase">कुल वजन: लगभग {totalCartWeightKg.toFixed(2)} kg</span>
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

        {/* Right Column: Order & Price Summary (PART A.4 Card 2) (Sticky on Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
          <div className="bg-[#F5F2ED] rounded-3xl p-4 sm:p-5 border border-[#4A3728]/10 space-y-2.5 text-xs">
            <h4 className="font-bold text-[#4A3728] text-sm border-b border-gray-200/60 pb-2">
              ऑर्डर एवं मूल्य विवरण (Price Details)
            </h4>

            <div className="flex justify-between text-gray-700 font-medium">
              <span>उत्पाद कुल मूल्य:</span>
              <span className="font-bold text-gray-900">₹{cartTotal}</span>
            </div>

            <div className="flex justify-between text-gray-700 font-medium items-center">
              <span>
                {deliveryMethod === 'store_pickup' ? 'पिकअप शुल्क:' : 'स्थानीय डिलीवरी शुल्क:'}
              </span>
              {deliveryMethod === 'store_pickup' ? (
                <span className="text-emerald-700 font-black bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  ₹0 (नि:शुल्क पिकअप)
                </span>
              ) : deliveryQuote ? (
                deliveryQuote.isServiceable !== false ? (
                  <span className="font-bold text-gray-900">
                    {deliveryQuote.isFreeDelivery ? '₹0 (मुफ़्त)' : `₹${deliveryCharge}`}
                  </span>
                ) : (
                  <span className="text-red-600 font-bold text-[11px] bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    दर अनुपलब्ध
                  </span>
                )
              ) : (
                <span className="text-gray-400 italic">गाँव चयन प्रतीक्षित</span>
              )}
            </div>

            <div className="flex justify-between items-center pt-2.5 border-t border-gray-300/50 text-sm font-bold text-[#4A3728]">
              <span>कुल देय राशि:</span>
              <span className="text-xl font-black text-[#2D5A27]">
                ₹{finalOrderTotal}
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
            disabled={
              isProcessing || 
              !isMasterActive || 
              (deliveryMethod === 'local_delivery' && (!matchedVillage || matchedVillage.isActive === false || !deliveryQuote || deliveryQuote.isServiceable === false))
            }
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              !isMasterActive || (deliveryMethod === 'local_delivery' && (!matchedVillage || matchedVillage.isActive === false || !deliveryQuote || deliveryQuote.isServiceable === false))
                ? "bg-gray-400 text-white shadow-none"
                : "bg-[#2D5A27] hover:bg-[#2D5A27]/90 text-white shadow-[#2D5A27]/25"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                सुरक्षित पेमेंट विंडो खुल रही है...
              </>
            ) : !isMasterActive ? (
              <>
                <Store className="w-5 h-5" />
                ऑनलाइन ऑर्डर सेवा बंद है
              </>
            ) : deliveryMethod === 'local_delivery' && (!matchedVillage || matchedVillage.isActive === false) ? (
              <>
                <AlertTriangle className="w-5 h-5" />
                मान्य गाँव चुनें या पिकअप चुनें
              </>
            ) : deliveryMethod === 'local_delivery' && (!deliveryQuote || deliveryQuote.isServiceable === false) ? (
              <>
                <AlertTriangle className="w-5 h-5" />
                डिलीवरी दर अनुपलब्ध (पिकअप चुनें)
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 text-[#EAB308]" />
                {`₹${finalOrderTotal} का ऑनलाइन भुगतान करें`}
              </>
            )}
          </button>

          {/* WhatsApp Support Help Line */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleWhatsAppHelp}
              className="text-xs text-gray-500 hover:text-gray-800 underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              ऑर्डर या डिलीवरी में कोई सवाल? व्हाट्सएप पर संपर्क करें
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
