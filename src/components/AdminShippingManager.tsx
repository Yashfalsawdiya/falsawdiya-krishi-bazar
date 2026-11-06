import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, Save, CheckCircle2, AlertCircle, 
  ExternalLink, Loader2, ShieldCheck, Key, MapPin, 
  IndianRupee, Scale, Info, Check, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { 
  fetchShiprocketAdminSettings, 
  saveShiprocketAdminSettings, 
  testShiprocketConnection 
} from '../services/shippingService';
import { ShiprocketAdminSettings } from '../types';

export const AdminShippingManager: React.FC = () => {
  const [settings, setSettings] = useState<ShiprocketAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'test' | 'live'>('live');
  const [enabled, setEnabled] = useState(true);

  // Pickup Details
  const [pickupLocation, setPickupLocation] = useState('Falsawdiya Krishi Bazaar Shamgarh');
  const [pickupPincode, setPickupPincode] = useState('458883');
  const [pickupCity, setPickupCity] = useState('Shamgarh');
  const [pickupState, setPickupState] = useState('Madhya Pradesh');
  const [pickupAddress, setPickupAddress] = useState('डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर');
  const [pickupPhone, setPickupPhone] = useState('918982338046');

  // Rate rules
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(1999);
  const [baseWeightKg, setBaseWeightKg] = useState(1);
  const [baseChargeMp, setBaseChargeMp] = useState(50);
  const [additionalPerKgMp, setAdditionalPerKgMp] = useState(25);
  const [baseChargeNeighbor, setBaseChargeNeighbor] = useState(65);
  const [additionalPerKgNeighbor, setAdditionalPerKgNeighbor] = useState(30);
  const [baseChargeRestOfIndia, setBaseChargeRestOfIndia] = useState(80);
  const [additionalPerKgRestOfIndia, setAdditionalPerKgRestOfIndia] = useState(40);
  const [localShamgarhDeliveryCharge, setLocalShamgarhDeliveryCharge] = useState(20);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const data = await fetchShiprocketAdminSettings();
    if (data) {
      setSettings(data);
      setEmail(data.email || '');
      setMode(data.mode || 'live');
      setEnabled(data.enabled !== false);
      setPickupLocation(data.pickupLocation || 'Falsawdiya Krishi Bazaar Shamgarh');
      setPickupPincode(data.pickupPincode || '458883');
      setPickupCity(data.pickupCity || 'Shamgarh');
      setPickupState(data.pickupState || 'Madhya Pradesh');
      setPickupAddress(data.pickupAddress || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर');
      setPickupPhone(data.pickupPhone || '918982338046');
      setFreeDeliveryThreshold(data.freeDeliveryThreshold ?? 1999);
      setBaseWeightKg(data.baseWeightKg ?? 1);
      setBaseChargeMp(data.baseChargeMp ?? 50);
      setAdditionalPerKgMp(data.additionalPerKgMp ?? 25);
      setBaseChargeNeighbor(data.baseChargeNeighbor ?? 65);
      setAdditionalPerKgNeighbor(data.additionalPerKgNeighbor ?? 30);
      setBaseChargeRestOfIndia(data.baseChargeRestOfIndia ?? 80);
      setAdditionalPerKgRestOfIndia(data.additionalPerKgRestOfIndia ?? 40);
      setLocalShamgarhDeliveryCharge(data.localShamgarhDeliveryCharge ?? 20);
      if (data.lastTestResult) {
        setTestResult(data.lastTestResult);
      }
    }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    if (!email.trim()) {
      setErrorMessage('कृपया Shiprocket खाता ईमेल दर्ज करें।');
      return;
    }
    if (!password.trim() && !settings?.hasPassword) {
      setErrorMessage('कृपया Shiprocket खाता पासवर्ड दर्ज करें।');
      return;
    }

    setIsTesting(true);
    setErrorMessage(null);
    setTestResult(null);

    const res = await testShiprocketConnection({
      email: email.trim(),
      password: password.trim() || undefined,
    });

    setIsTesting(false);
    setTestResult({
      success: res.success,
      message: res.message,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    const res = await saveShiprocketAdminSettings({
      enabled,
      mode,
      email: email.trim(),
      password: password.trim() || undefined,
      pickupLocation: pickupLocation.trim(),
      pickupPincode: pickupPincode.trim(),
      pickupCity: pickupCity.trim(),
      pickupState: pickupState.trim(),
      pickupAddress: pickupAddress.trim(),
      pickupPhone: pickupPhone.trim(),
      freeDeliveryThreshold: Number(freeDeliveryThreshold) || 1999,
      baseWeightKg: Number(baseWeightKg) || 1,
      baseChargeMp: Number(baseChargeMp) || 50,
      additionalPerKgMp: Number(additionalPerKgMp) || 25,
      baseChargeNeighbor: Number(baseChargeNeighbor) || 65,
      additionalPerKgNeighbor: Number(additionalPerKgNeighbor) || 30,
      baseChargeRestOfIndia: Number(baseChargeRestOfIndia) || 80,
      additionalPerKgRestOfIndia: Number(additionalPerKgRestOfIndia) || 40,
      localShamgarhDeliveryCharge: Number(localShamgarhDeliveryCharge) || 20,
    });

    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      await loadSettings();
    } else {
      setErrorMessage(res.error || 'सेटिंग्स सुरक्षित करने में विफलता।');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D5A27]" />
      </div>
    );
  }

  const isConnected = Boolean(settings?.isTokenActive || (settings?.email && settings?.hasPassword));

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#2D5A27] to-[#1e3f1a] text-white p-6 rounded-3xl shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <Truck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                कूरियर पार्टनर व शिपिंग इंटीग्रेशन (Shiprocket Integration)
              </h2>
              <p className="text-xs text-emerald-200">
                ऑल-इंडिया ऑटोमेटेड कूरियर सेवा: AWB जनरेशन, शिपिंग लेबल प्रिंटिंग व पिनकोड आधारित डिलीवरी
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              isConnected 
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' 
                : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {isConnected ? 'Shiprocket कनेक्टेड' : 'कॉन्फ़िगरेशन प्रतीक्षारत'}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>कूरियर सेटिंग्स सफलतापूर्वक सुरक्षित की गईं।</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {testResult && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 border ${
          testResult.success
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Shiprocket API Credentials */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#2D5A27]" />
              <h3 className="font-bold text-gray-900 text-sm">
                1. Shiprocket क्रेडेंशियल्स (Account Credentials)
              </h3>
            </div>
            <a
              href="https://app.shiprocket.in/login"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#2D5A27] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Shiprocket पोर्टल खोलें</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">
                Shiprocket ईमेल (Account Email) *
              </label>
              <input
                type="email"
                required
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 block">
                  Shiprocket पासवर्ड (Account Password) *
                </label>
                {settings?.hasPassword && !password && (
                  <span className="text-[10px] text-emerald-700 font-bold">
                    ✓ पहले से सुरक्षित है
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={settings?.hasPassword ? '•••••••• (परिवर्तित करने हेतु नया पासवर्ड दर्ज करें)' : 'पासवर्ड दर्ज करें'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium outline-none focus:bg-white focus:border-[#2D5A27] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-700">मोड (Mode):</label>
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMode('live')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    mode === 'live' ? 'bg-[#2D5A27] text-white shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Live (वास्तविक)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('test')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    mode === 'test' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Test (परीक्षण)
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#2D5A27] rounded-xl text-xs font-black border border-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>जांच जारी है...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Shiprocket कनेक्शन जांचें (Test Connection)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 2: Store Warehouse / Pickup Origin */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <MapPin className="w-4 h-4 text-[#2D5A27]" />
            <h3 className="font-bold text-gray-900 text-sm">
              2. पिकअप एवं दुकान वेयरहाउस विवरण (Store Pickup Location)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-gray-700">पिकअप स्थान नाम (Location Nickname)</label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">पिन कोड (Origin Pincode)</label>
              <input
                type="text"
                maxLength={6}
                value={pickupPincode}
                onChange={(e) => setPickupPincode(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-[#2D5A27] outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-gray-700">मोबाइल नंबर (Pickup Phone)</label>
              <input
                type="text"
                value={pickupPhone}
                onChange={(e) => setPickupPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3 space-y-1">
              <label className="font-bold text-gray-700">दुकान का पूरा पता (Pickup Address)</label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium outline-none focus:bg-white focus:border-[#2D5A27]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Pricing, Free Shipping & Surface Fallback Rates */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <IndianRupee className="w-4 h-4 text-[#2D5A27]" />
            <h3 className="font-bold text-gray-900 text-sm">
              3. डिलीवरी दरें एवं मुफ़्त शिपिंग सीमा (Rates & Free Shipping Rules)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* Free Delivery Threshold */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700">मुफ़्त कूरियर डिलीवरी न्यूनतम ऑर्डर (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-3 font-black text-[#2D5A27] outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>
              <p className="text-[10px] text-gray-400">इस मूल्य से अधिक के ऑर्डर पर ग्राहक को शिपिंग शुल्क नहीं लगेगा।</p>
            </div>

            {/* Base Weight */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700">बेस वजन स्लैब (Base Weight)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={baseWeightKg}
                  onChange={(e) => setBaseWeightKg(parseFloat(e.target.value) || 1)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black outline-none focus:bg-white focus:border-[#2D5A27]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">kg</span>
              </div>
              <p className="text-[10px] text-gray-400">प्रारंभिक वजन जिस पर बेस रेट लागू होता है।</p>
            </div>

            {/* Local Shamgarh Rate */}
            <div className="space-y-1">
              <label className="font-bold text-gray-700">लोकल शामगढ़ होम डिलीवरी शुल्क (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  value={localShamgarhDeliveryCharge}
                  onChange={(e) => setLocalShamgarhDeliveryCharge(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-8 pr-3 font-black outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>
              <p className="text-[10px] text-gray-400">दुकान से स्वयं पिकअप हमेशा ₹0 (मुफ़्त) रहेगा।</p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <h4 className="font-black text-gray-800 text-xs mb-3">
              ज़ोन अनुसार सरफेस कूरियर दरें (Zone-based Surface Rates)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* MP Intra-State */}
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2 text-xs">
                <span className="font-black text-[#2D5A27] block">मध्यप्रदेश (MP Intra-State)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">पहला 1 kg (₹)</label>
                    <input
                      type="number"
                      value={baseChargeMp}
                      onChange={(e) => setBaseChargeMp(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">अतिरिक्त प्रति kg (₹)</label>
                    <input
                      type="number"
                      value={additionalPerKgMp}
                      onChange={(e) => setAdditionalPerKgMp(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Neighbor States */}
              <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2 text-xs">
                <span className="font-black text-blue-900 block">पड़ोसी राज्य (RJ, GUJ, MH, UP)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">पहला 1 kg (₹)</label>
                    <input
                      type="number"
                      value={baseChargeNeighbor}
                      onChange={(e) => setBaseChargeNeighbor(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">अतिरिक्त प्रति kg (₹)</label>
                    <input
                      type="number"
                      value={additionalPerKgNeighbor}
                      onChange={(e) => setAdditionalPerKgNeighbor(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rest of India */}
              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2 text-xs">
                <span className="font-black text-purple-900 block">शेष भारत (Rest of India)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">पहला 1 kg (₹)</label>
                    <input
                      type="number"
                      value={baseChargeRestOfIndia}
                      onChange={(e) => setBaseChargeRestOfIndia(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500">अतिरिक्त प्रति kg (₹)</label>
                    <input
                      type="number"
                      value={additionalPerKgRestOfIndia}
                      onChange={(e) => setAdditionalPerKgRestOfIndia(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Agricultural Regulatory Notice */}
        <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-1.5 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-black text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>कृषि रसायन एवं तरल उत्पादों हेतु कूरियर गाइडलाइन्स (Surface Transport Only)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-900/90 font-medium">
            हवाई मार्ग (Air Express) में कीटनाशक व तरल उत्पाद प्रतिबंधित होते हैं। हमारा सिस्टम स्वतः <strong>सरफेस कूरियर (Surface Mode)</strong> का चयन करता है। सभी तरल उत्पादों की पैकिंग में लीक-प्रूफ सील व बबल रैप का उपयोग सुनिश्चित करें।
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-[#2D5A27]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>सेव हो रहा है...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>कूरियर सेटिंग्स सुरक्षित करें (Save Settings)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
