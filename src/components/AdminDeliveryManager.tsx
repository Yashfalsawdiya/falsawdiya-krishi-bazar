import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { DynamicDeliveryConfig } from '../types';
import { 
  Store, Save, MapPin, Clock, Phone, 
  Info, CheckCircle2, AlertCircle, Mail, ShieldCheck,
  Check, FileText, Sparkles
} from 'lucide-react';
import { AdminEmailOtpManager } from './AdminEmailOtpManager';
import { SafeErrorBoundary } from './SafeErrorBoundary';

const AdminDeliveryManager: React.FC = () => {
  const { deliveryConfig, updateDeliveryConfig } = useAppContext();

  // Local draft state for editing
  const [config, setConfig] = useState<DynamicDeliveryConfig>(() => ({
    ...deliveryConfig,
    storeOrigin: { 
      name: deliveryConfig.storeOrigin?.name || 'फल्सावदिया कृषि बाजार, शामगढ़',
      address: deliveryConfig.storeOrigin?.address || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़',
      city: deliveryConfig.storeOrigin?.city || 'शामगढ़',
      district: deliveryConfig.storeOrigin?.district || 'मंदसौर',
      state: deliveryConfig.storeOrigin?.state || 'मध्यप्रदेश',
      pincode: deliveryConfig.storeOrigin?.pincode || '458883',
      latitude: deliveryConfig.storeOrigin?.latitude || 24.1842,
      longitude: deliveryConfig.storeOrigin?.longitude || 75.6431,
    },
    pickupTimings: deliveryConfig.pickupTimings || 'प्रतिदिन सुबह 08:00 बजे से रात 08:00 बजे तक (08:00 AM – 08:00 PM)',
    pickupInstructions: deliveryConfig.pickupInstructions || 'कृपया दुकान पर आकर अपना ऑर्डर नंबर दिखाकर पैक किया हुआ सामान प्राप्त करें।',
    pickupPhone: deliveryConfig.pickupPhone || '8982338046',
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'store_pickup' | 'email_otp'>('store_pickup');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state if context changes externally
  React.useEffect(() => {
    setConfig({
      ...deliveryConfig,
      storeOrigin: { 
        name: deliveryConfig.storeOrigin?.name || 'फल्सावदिया कृषि बाजार, शामगढ़',
        address: deliveryConfig.storeOrigin?.address || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़',
        city: deliveryConfig.storeOrigin?.city || 'शामगढ़',
        district: deliveryConfig.storeOrigin?.district || 'मंदसौर',
        state: deliveryConfig.storeOrigin?.state || 'मध्यप्रदेश',
        pincode: deliveryConfig.storeOrigin?.pincode || '458883',
        latitude: deliveryConfig.storeOrigin?.latitude || 24.1842,
        longitude: deliveryConfig.storeOrigin?.longitude || 75.6431,
      },
      pickupTimings: deliveryConfig.pickupTimings || 'प्रतिदिन सुबह 08:00 बजे से रात 08:00 बजे तक (08:00 AM – 08:00 PM)',
      pickupInstructions: deliveryConfig.pickupInstructions || 'कृपया दुकान पर आकर अपना ऑर्डर नंबर दिखाकर पैक किया हुआ सामान प्राप्त करें।',
      pickupPhone: deliveryConfig.pickupPhone || '8982338046',
    });
  }, [deliveryConfig]);

  const validateConfig = (cfg: DynamicDeliveryConfig): string | null => {
    if (!cfg.storeOrigin.name.trim()) {
      return 'दुकान का नाम दर्ज करना अनिवार्य है।';
    }
    if (!cfg.storeOrigin.address.trim()) {
      return 'दुकान का पूरा पिकअप पता दर्ज करना अनिवार्य है।';
    }
    if (!cfg.storeOrigin.pincode.trim() || cfg.storeOrigin.pincode.trim().length !== 6) {
      return 'मान्य 6-अंकीय पिनकोड दर्ज करें।';
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateConfig(config);
    if (error) {
      setValidationError(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateDeliveryConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Save delivery config failed:", err);
      alert("सेटिंग्स सेव करने में समस्या आई। कृपया पुनः प्रयास करें।");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#2D5A27] shadow-sm">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#4A3728]">
                दुकान से स्वयं पिकअप सेटिंग्स (Store Self Pickup)
              </h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                100% शून्य डिलीवरी झंझट
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              सभी ऑर्डर्स डिंपल चौराहा, शामगढ़ स्थित दुकान से किसान स्वयं पिकअप करेंगे (₹0 निःशुल्क शुल्क)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#2D5A27] text-white hover:bg-[#23461e] shadow-md shadow-emerald-900/10 text-xs font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> सेव हो रहा है...
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-2 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" /> सेटिंग्स सुरक्षित हो गईं!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" /> सेटिंग्स सुरक्षित करें (Save)
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm animate-shake">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-black text-red-900">कृपया निम्नलिखित त्रुटि ठीक करें:</p>
            <p className="text-xs text-red-700 font-medium">{validationError}</p>
          </div>
        </div>
      )}

      {/* Global Master Toggle: Store Pickup Service Active */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="space-y-0.5 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-800 block">
              दुकान से स्वयं पिकअप ऑर्डर सेवा (Master Switch)
            </span>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
              config.isDeliveryActive 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {config.isDeliveryActive ? "सक्रिय (Orders ON)" : "बंद (Orders Paused)"}
            </span>
          </div>
          <span className="text-xs text-gray-500 block">
            चालू रखने पर किसान ऐप पर ऑर्डर बुक करके डिंपल चौराहा स्थित दुकान से स्वयं माल प्राप्त कर सकेंगे।
          </span>
        </div>
        <button
          type="button"
          onClick={async () => {
            const nextVal = !config.isDeliveryActive;
            const updated = { ...config, isDeliveryActive: nextVal };
            setConfig(updated);
            try {
              await updateDeliveryConfig(updated);
            } catch (e) {
              console.error("Failed to auto-save master pickup switch:", e);
            }
          }}
          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            config.isDeliveryActive ? "bg-[#2D5A27]" : "bg-gray-300"
          }`}
        >
          <span 
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              config.isDeliveryActive ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('store_pickup')}
          className={`flex-1 min-w-[180px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'store_pickup' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Store className="w-4 h-4" /> दुकान पिकअप विवरण (Store Details)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('email_otp')}
          className={`flex-1 min-w-[180px] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'email_otp' ? 'bg-[#2D5A27] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Mail className="w-4 h-4" /> ईमेल व ऑर्डर सूचना (SMTP)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: STORE PICKUP SETTINGS & LIVE PREVIEW */}
      {/* ========================================================================= */}
      {activeSection === 'store_pickup' && (
        <div className="space-y-6">
          {/* Live Checkout Preview Card - Exactly matching Screenshot 2 */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-5 sm:p-6 rounded-3xl border border-emerald-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#2D5A27]" />
                ग्राहक चेकआउट स्क्रीन पर ऐसा दिखेगा (Live Preview)
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200">
                100% नि:शुल्क पिकअप
              </span>
            </div>

            {/* The exact Card from Screenshot 2 */}
            <div className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-sm space-y-3.5 max-w-xl mx-auto">
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
                      {config.storeOrigin.name || 'फल्सावदिया कृषि बाजार, शामगढ़'}
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
                  <span>{config.storeOrigin.address || 'डिंपल चौराहा, शामगढ़'}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>सुबह 8:00 से रात 8:00 बजे</span>
                </div>
              </div>
            </div>
          </div>

          {/* Store Origin Details Form */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <MapPin className="w-4 h-4 text-[#2D5A27]" />
              <h3 className="text-sm font-black text-gray-800">
                दुकान का पता व पिकअप विवरण (Store Pickup Location Details)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">दुकान का नाम (Store Name) *</label>
                <input
                  type="text"
                  value={config.storeOrigin.name}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, name: e.target.value } }))}
                  placeholder="फल्सावदिया कृषि बाजार, शामगढ़"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">पिनकोड (Pincode) *</label>
                <input
                  type="text"
                  maxLength={6}
                  value={config.storeOrigin.pincode}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, pincode: e.target.value.replace(/\D/g, '') } }))}
                  placeholder="458883"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">शहर / कस्बा (City / Town)</label>
                <input
                  type="text"
                  value={config.storeOrigin.city}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, city: e.target.value } }))}
                  placeholder="शामगढ़"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">जिला (District)</label>
                <input
                  type="text"
                  value={config.storeOrigin.district}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, district: e.target.value } }))}
                  placeholder="मंदसौर"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="font-bold text-gray-700">दुकान का पूरा पता (Full Pickup Address) *</label>
                <input
                  type="text"
                  value={config.storeOrigin.address}
                  onChange={e => setConfig(prev => ({ ...prev, storeOrigin: { ...prev.storeOrigin, address: e.target.value } }))}
                  placeholder="डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">दुकान खुलने का समय (Store Timings)</label>
                <input
                  type="text"
                  value={config.pickupTimings || ''}
                  onChange={e => setConfig(prev => ({ ...prev, pickupTimings: e.target.value }))}
                  placeholder="प्रतिदिन सुबह 08:00 बजे से रात 08:00 बजे तक (08:00 AM – 08:00 PM)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700">पिकअप सहायता मोबाइल नंबर (Helpline / Phone)</label>
                <input
                  type="text"
                  value={config.pickupPhone || ''}
                  onChange={e => setConfig(prev => ({ ...prev, pickupPhone: e.target.value }))}
                  placeholder="8982338046"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="font-bold text-gray-700">किसान भाइयों के लिए पिकअप निर्देश (Customer Instructions Note)</label>
                <textarea
                  rows={3}
                  value={config.pickupInstructions || ''}
                  onChange={e => setConfig(prev => ({ ...prev, pickupInstructions: e.target.value }))}
                  placeholder="कृपया दुकान पर आकर अपना ऑर्डर नंबर दिखाकर पैक किया हुआ सामान प्राप्त करें।"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-medium text-gray-800 outline-none focus:bg-white focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900/10 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" /> सेटिंग्स सुरक्षित करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: EMAIL SMTP & ORDER OTP MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSection === 'email_otp' && (
        <SafeErrorBoundary fallbackTitle="ईमेल व ऑर्डर OTP सेटिंग्स लोड करने में समस्या">
          <AdminEmailOtpManager />
        </SafeErrorBoundary>
      )}
    </div>
  );
};

export default AdminDeliveryManager;
