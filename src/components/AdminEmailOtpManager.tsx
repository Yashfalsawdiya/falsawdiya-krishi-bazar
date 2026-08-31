import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Key, ShieldCheck, Send, CheckCircle2, 
  AlertCircle, RefreshCw, Eye, EyeOff, Save, 
  HelpCircle, Sparkles, Clock, Lock, Smartphone,
  Info, Check, ExternalLink, ShieldAlert, AlertTriangle,
  Monitor, Smartphone as PhoneIcon, Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getAdminOtpConfig, 
  saveAdminOtpConfig, 
  sendAdminTestEmail,
  checkBackendHealth,
  BackendHealthStatus,
  toSafeString
} from '../services/deliveryOtpService';
import { EmailOtpServerConfig, DeliveryEmailTemplateConfig } from '../types';
import { useAppContext } from '../context/AppContext';
import { 
  DEFAULT_DELIVERY_EMAIL_TEMPLATE, 
  DUMMY_EMAIL_PREVIEW_DATA, 
  mergeDeliveryEmailTemplate, 
  renderDeliveryEmailTemplateHtml,
  replaceEmailPlaceholders 
} from '../data/defaultDeliveryEmailTemplate';
import { AdminDeliveryEmailTemplateEditor } from './AdminDeliveryEmailTemplateEditor';

export const AdminEmailOtpManager: React.FC = () => {
  const { deliveryEmailTemplate, appContent } = useAppContext();

  const [config, setConfig] = useState<EmailOtpServerConfig>({
    enabled: true,
    senderEmail: 'yashfalsawdiya36@gmail.com',
    appPassword: '',
    senderName: 'फल्सावदिया कृषि बाजार (Falsawdiya Krishi Bazaar)',
    otpLength: 6,
    expiryMinutes: 15,
    resendCooldownSeconds: 60,
    maxAttempts: 3,
    showInAppOtpFallback: true,
    lastUpdated: Date.now(),
  });

  const [appPasswordMasked, setAppPasswordMasked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus | null>(null);

  // Live preview template state synced with AppContext / Editor
  const [previewTemplate, setPreviewTemplate] = useState<DeliveryEmailTemplateConfig>(() => {
    return mergeDeliveryEmailTemplate(deliveryEmailTemplate, {
      storeName: appContent?.branding?.name || 'फल्सावदिया कृषि बाजार',
      contactNumber: appContent?.contactInfo?.whatsapp || '+91 89823 38046',
    });
  });

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewViewMode, setPreviewViewMode] = useState<'visual' | 'html'>('visual');

  // Update preview template when context updates
  useEffect(() => {
    if (deliveryEmailTemplate) {
      setPreviewTemplate(mergeDeliveryEmailTemplate(deliveryEmailTemplate));
    }
  }, [deliveryEmailTemplate]);

  const liveHtmlCode = useMemo(() => {
    return renderDeliveryEmailTemplateHtml(previewTemplate, DUMMY_EMAIL_PREVIEW_DATA);
  }, [previewTemplate]);

  const fetchConfig = async () => {
    try {
      const [healthRes, dataRes] = await Promise.allSettled([
        checkBackendHealth(),
        getAdminOtpConfig()
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value) {
        setBackendHealth(healthRes.value);
      }

      if (dataRes.status === 'fulfilled' && dataRes.value) {
        const fetched = dataRes.value;
        setConfig(prev => ({
          ...prev,
          enabled: fetched.enabled !== undefined ? Boolean(fetched.enabled) : prev.enabled,
          senderEmail: typeof fetched.senderEmail === 'string' ? fetched.senderEmail : (prev.senderEmail || ''),
          senderName: typeof fetched.senderName === 'string' ? fetched.senderName : (prev.senderName || 'फल्सावदिया कृषि बाजार (Falsawdiya Krishi Bazaar)'),
          otpLength: Number(fetched.otpLength) || prev.otpLength || 6,
          expiryMinutes: Number(fetched.expiryMinutes) || prev.expiryMinutes || 15,
          resendCooldownSeconds: Number(fetched.resendCooldownSeconds) || prev.resendCooldownSeconds || 60,
          maxAttempts: Number(fetched.maxAttempts) || prev.maxAttempts || 3,
          showInAppOtpFallback: fetched.showInAppOtpFallback !== undefined ? Boolean(fetched.showInAppOtpFallback) : prev.showInAppOtpFallback,
          lastUpdated: Number(fetched.lastUpdated) || Date.now(),
          appPassword: prev.appPassword || '',
        }));

        setAppPasswordMasked(Boolean(fetched.appPasswordConfigured));
        if (fetched.senderEmail && !testEmailRecipient) {
          setTestEmailRecipient(fetched.senderEmail);
        }
      }
    } catch (err: any) {
      console.error('Failed to load email OTP config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveFeedback(null);

    try {
      const safeSenderEmail = (config.senderEmail || '').trim();
      const safeSenderName = (config.senderName || '').trim();

      const payload: Partial<EmailOtpServerConfig> = {
        enabled: Boolean(config.enabled),
        senderEmail: safeSenderEmail,
        senderName: safeSenderName || 'फल्सावदिया कृषि बाजार (Falsawdiya Krishi Bazaar)',
        otpLength: Number(config.otpLength) || 6,
        expiryMinutes: Number(config.expiryMinutes) || 15,
        resendCooldownSeconds: Number(config.resendCooldownSeconds) || 60,
        maxAttempts: Number(config.maxAttempts) || 3,
        showInAppOtpFallback: Boolean(config.showInAppOtpFallback),
      };

      // Only pass appPassword if user entered a new one
      const rawPassword = (config.appPassword || '').trim();
      if (rawPassword && !rawPassword.includes('••••')) {
        payload.appPassword = rawPassword.replace(/\s+/g, '');
      }

      const res = await saveAdminOtpConfig(payload);
      if (res && res.success) {
        setSaveFeedback({
          type: 'success',
          text: toSafeString(res.message, 'ईमेल एवं OTP सेटिंग्स सफलतापूर्वक सहेजी गईं।'),
        });
        if (rawPassword && !rawPassword.includes('••••')) {
          setAppPasswordMasked(true);
        }
        await fetchConfig();
        setTimeout(() => setSaveFeedback(null), 5000);
      } else {
        setSaveFeedback({
          type: 'error',
          text: toSafeString(res?.error, 'सेटिंग्स सहेजी नहीं जा सकीं। कृपया दोबारा प्रयास करें।'),
        });
      }
    } catch (err: any) {
      console.error('Save error in handleSave:', err);
      setSaveFeedback({
        type: 'error',
        text: toSafeString(err?.message || err, 'सेटिंग्स सहेजी नहीं जा सकीं। कृपया दोबारा प्रयास करें।'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      setTestFeedback({
        type: 'error',
        text: 'कृपया परीक्षण के लिए मान्य ईमेल पता दर्ज करें।',
      });
      return;
    }

    setTesting(true);
    setTestFeedback(null);

    try {
      const res = await sendAdminTestEmail(testEmailRecipient.trim());
      if (res && res.success) {
        setTestFeedback({
          type: 'success',
          text: toSafeString(res.message, 'टेस्ट ईमेल सफलतापूर्वक भेजा गया! कृपया अपना इनबॉक्स या स्पैम फोल्डर देखें।'),
        });
      } else {
        setTestFeedback({
          type: 'error',
          text: toSafeString(res?.error, 'टेस्ट ईमेल भेजने में विफल। कृपया 16-अंकों का Google App Password जांचें।'),
        });
      }
    } catch (err: any) {
      setTestFeedback({
        type: 'error',
        text: toSafeString(err?.message || err, 'परीक्षण में नेटवर्क समस्या।'),
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center space-y-3 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
        <div className="w-8 h-8 border-3 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-medium">ईमेल व डिलीवरी OTP सेटिंग्स लोड हो रही हैं...</p>
      </div>
    );
  }

  const isConfigured = Boolean(config.senderEmail && (appPasswordMasked || config.appPassword));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2D5A27] via-[#24491f] to-[#1c3a18] text-white p-6 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/10 backdrop-blur-xs rounded-xl text-white">
                <Mail className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                ईमेल व डिलीवरी OTP सत्यापन सेटिंग्स (Delivery OTP & SMTP)
              </h2>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">
              डिलीवरी पूर्ण करने से पहले ग्राहक की ईमेल पर 6-अंकों का सुरक्षित OTP भेजें और डिलीवरी सत्यापन सुनिश्चित करें।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {backendHealth?.isReachable ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-400 text-emerald-950 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-900 animate-pulse"></span>
                <span>सर्वर ऑनलाइन (API Active)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-400 text-amber-950 shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>बैकएंड: कनेक्टिविटी जांचें</span>
              </span>
            )}

            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-xs ${
              isConfigured 
                ? 'bg-white/20 text-white backdrop-blur-xs' 
                : 'bg-red-400 text-red-950'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isConfigured ? 'Gmail SMTP एक्टिव' : 'क्रेडेंशियल अधूरे'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Production Serverless/Environment Variables Advisory */}
      {backendHealth && !backendHealth.isReachable && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-900">
            <p className="font-black">प्रोडक्शन एनवायरनमेंट नोट (Production Deployment Notice):</p>
            <p className="leading-relaxed font-medium">
              यदि आप इस प्रोजेक्ट को GitHub से Vercel, Cloud Run या किसी अन्य होस्टिंग पर डिप्लॉय कर रहे हैं, तो अपने डिप्लॉयमेंट सेटिंग्स (Environment Variables) में <code className="bg-amber-100 font-mono px-1 py-0.5 rounded font-bold">GMAIL_SENDER_EMAIL</code> और <code className="bg-amber-100 font-mono px-1 py-0.5 rounded font-bold">GMAIL_APP_PASSWORD</code> अवश्य दर्ज करें।
            </p>
          </div>
        </div>
      )}

      {/* Save Feedback Alerts */}
      <AnimatePresence>
        {saveFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${
              saveFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{toSafeString(saveFeedback.text)}</span>
            </div>
            <button
              onClick={() => setSaveFeedback(null)}
              className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: MASTER OTP SWITCH & SENDER DETAILS */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2D5A27]" />
                <span>डिलीवरी OTP सत्यापन मास्टर स्विच</span>
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                डिलीवरी पूर्ण करने के लिए ग्राहक द्वारा दिए गए OTP की अनिवार्यता
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2D5A27]"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                प्रेषक Gmail ID (Sender Gmail Address):
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={config.senderEmail || ''}
                  onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })}
                  placeholder="उदा. yashfalsawdiya36@gmail.com या falsawdiyakrishibazaar@gmail.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
                  required
                />
                <Mail className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  <b>सुविधा:</b> आप अभी अपनी पर्सनल Gmail ID का इस्तेमाल कर सकते हैं और बाद में आधिकारिक स्टोर ईमेल आईडी बनने पर इसे कभी भी 1-क्लिक में बदल सकते हैं।
                </span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Google App Password (16-अक्षरों का ऐप पासवर्ड):
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpGuide(!showHelpGuide)}
                  className="text-[11px] font-bold text-[#2D5A27] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>पासवर्ड कैसे बनाएं?</span>
                </button>
              </div>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.appPassword || ''}
                  onChange={(e) => {
                    setConfig({ ...config, appPassword: e.target.value });
                    setAppPasswordMasked(false);
                  }}
                  placeholder={appPasswordMasked ? '•••• •••• •••• •••• (सुरक्षित सेव्ड है, बदलने हेतु नया टाइप करें)' : 'उदा. abcd efgh ijkl mnop'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-mono text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10.5px] text-gray-400 mt-1">
                नोट: यह आपका सामान्य जीमेल पासवर्ड नहीं है, बल्कि Google Security से जनरेट किया गया 16-अक्षरों का 'App Password' है।
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                ईमेल प्रेषक का नाम (Sender Display Name):
              </label>
              <input
                type="text"
                value={config.senderName || ''}
                onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                placeholder="उदा. फल्सावदिया कृषि बाजार (Falsawdiya Krishi Bazaar)"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: SECURITY, TIMEOUTS & RURAL FALLBACK */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-5">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 pb-3 border-b border-gray-100">
            <Lock className="w-4 h-4 text-[#2D5A27]" />
            <span>सुरक्षा नियम व समय सीमा (Security & Timeout Rules)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                OTP वैधता समय (Expiry Minutes):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={config.expiryMinutes}
                  onChange={(e) => setConfig({ ...config, expiryMinutes: parseInt(e.target.value) || 15 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-2.5 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">मिनट</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                पुनः भेजने का कूलडाउन (Resend Cooldown):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="15"
                  max="300"
                  value={config.resendCooldownSeconds}
                  onChange={(e) => setConfig({ ...config, resendCooldownSeconds: parseInt(e.target.value) || 60 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-2.5 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">सेकंड</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                अधिकतम गलत प्रयास (Max Attempts):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.maxAttempts}
                  onChange={(e) => setConfig({ ...config, maxAttempts: parseInt(e.target.value) || 3 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-2.5 text-xs font-bold text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">प्रयास</span>
              </div>
            </div>
          </div>

          {/* Fallback Option */}
          <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                <span>गाँव/खेतों के लिए बैकअप: इन-ऐप डिलीवरी कोड (In-App Fallback)</span>
              </span>
              <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                यदि किसान के गाँव में धीमा इंटरनेट होने के कारण Gmail इनबॉक्स नहीं खुल पा रहा है, तो किसान सीधे अपने <b>'मेरे ऑर्डर (My Orders)'</b> पेज से भी लाइव डिलीवरी कोड देखकर डिलीवरी बॉय को बता सकेंगे।
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={config.showInAppOtpFallback}
                onChange={(e) => setConfig({ ...config, showInAppOtpFallback: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D5A27]"></div>
            </label>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white font-black rounded-2xl text-xs flex items-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>सेटिंग्स सहेजी जा रही हैं...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>ईमेल व OTP सेटिंग्स सहेजें (Save Settings)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* SECTION 3: LIVE EMAIL TESTER */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#2D5A27]" />
              <span>लाइव टेस्ट ईमेल भेजें (Test SMTP Dispatch)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              अपनी ईमेल आईडी पर तुरंत एक टेस्ट ईमेल भेजकर जांचें कि SMTP कॉन्फ़िगरेशन काम कर रहा है या नहीं।
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <input
            type="email"
            value={testEmailRecipient}
            onChange={(e) => setTestEmailRecipient(e.target.value)}
            placeholder="परीक्षण ईमेल पता (उदा. your-email@gmail.com)"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
          />
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testing || !isConfigured}
            className="px-6 py-3 bg-[#2D5A27] hover:bg-[#23461e] text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>ईमेल भेजा जा रहा है...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>टेस्ट ईमेल भेजें</span>
              </>
            )}
          </button>
        </div>

        {/* Test Result Display */}
        <AnimatePresence>
          {testFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={`p-4 rounded-2xl border text-xs font-bold shadow-xs ${
                testFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {testFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-black text-xs">
                    {testFeedback.type === 'success' ? 'परीक्षण सफल!' : 'परीक्षण असफल:'}
                  </p>
                  <p className="text-[11px] font-medium mt-0.5 leading-relaxed">{toSafeString(testFeedback.text)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 4: LIVE EMAIL TEMPLATE PREVIEW */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#2D5A27]" />
              <span>डिलीवरी OTP ईमेल पूर्वावलोकन (Live Email Template Preview)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              यह वह आधुनिक, स्वच्छ एवं विश्वसनीय ईमेल डिज़ाइन है जो ग्राहक को डिलीवरी के समय प्राप्त होता है।
            </p>
          </div>
          
          {/* Controls: Device and Mode Switchers */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewDevice === 'desktop' ? 'bg-white text-[#2D5A27] shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="डेस्कटॉप व्यू (580px)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewDevice === 'mobile' ? 'bg-white text-[#2D5A27] shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
                title="मोबाइल व्यू (360px)"
              >
                <PhoneIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setPreviewViewMode('visual')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewViewMode === 'visual' ? 'bg-white text-[#2D5A27] shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visual</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewViewMode('html')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewViewMode === 'html' ? 'bg-white text-[#2D5A27] shadow-xs' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>HTML</span>
              </button>
            </div>
          </div>
        </div>

        {/* Email Visual Mockup / HTML Preview Container */}
        {previewViewMode === 'visual' ? (
          <div className="bg-gray-100 p-3 sm:p-6 rounded-2xl flex justify-center overflow-x-auto">
            <div 
              style={{
                maxWidth: previewDevice === 'mobile' ? '360px' : '540px',
                borderRadius: `${previewTemplate.cardBorderRadius || 12}px`,
                borderColor: previewTemplate.cardBorderColor || '#E2E8F0',
                backgroundColor: previewTemplate.cardBgColor || '#FFFFFF',
              }}
              className="w-full bg-white shadow-md border overflow-hidden font-sans text-gray-800 transition-all duration-300"
            >
              
              {/* Dynamic Header */}
              <div 
                style={{
                  backgroundColor: previewTemplate.headerBgColor || '#2D5A27',
                  borderBottomColor: previewTemplate.headerBorderColor || '#1E3E1A',
                }}
                className="text-white p-5 sm:p-6 text-center border-b-4"
              >
                {previewTemplate.showLogo !== false && (
                  <div className="w-14 h-14 bg-white rounded-full p-1 mx-auto mb-3 shadow-md flex items-center justify-center">
                    <img
                      src={previewTemplate.logoUrl || '/icon-192.png'}
                      alt={previewTemplate.storeName || 'स्टोर'}
                      className="w-12 h-12 rounded-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <h2 
                  style={{
                    color: previewTemplate.headerTextColor || '#FFFFFF',
                    fontSize: `${previewTemplate.headingFontSize || 20}px`,
                  }}
                  className="font-bold tracking-tight m-0 leading-tight"
                >
                  {replaceEmailPlaceholders(previewTemplate.headerTitle || '{{storeName}}', DUMMY_EMAIL_PREVIEW_DATA)}
                </h2>

                {previewTemplate.headerSubtitle && (
                  <p 
                    style={{
                      color: previewTemplate.headerSubtitleColor || '#E8F5E9',
                    }}
                    className="text-xs font-medium mt-1 mb-0 opacity-95"
                  >
                    {replaceEmailPlaceholders(previewTemplate.headerSubtitle, DUMMY_EMAIL_PREVIEW_DATA)}
                  </p>
                )}
              </div>

              {/* Dynamic Email Body */}
              <div 
                style={{
                  backgroundColor: previewTemplate.cardBgColor || '#FFFFFF',
                  fontSize: `${previewTemplate.bodyFontSize || 14}px`,
                }}
                className="p-5 sm:p-6 space-y-4"
              >
                <div>
                  <p className="font-bold text-gray-900 mb-1">
                    {replaceEmailPlaceholders(previewTemplate.greeting || 'नमस्ते {{customerName}},', DUMMY_EMAIL_PREVIEW_DATA)}
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    {replaceEmailPlaceholders(
                      previewTemplate.deliveryInfoText || 'आपके ऑर्डर #{{orderId}} की डिलीवरी के लिए हमारे Delivery Partner {{deliveryPartnerName}} पहुँच गए हैं।', 
                      DUMMY_EMAIL_PREVIEW_DATA
                    )}
                  </p>
                </div>

                {/* OTP Hero Box */}
                <div 
                  style={{
                    backgroundColor: previewTemplate.otpBoxBgColor || '#F8FAF8',
                    borderColor: previewTemplate.otpBoxBorderColor || '#D1E7DD',
                  }}
                  className="border rounded-xl p-4 sm:p-5 text-center"
                >
                  <div 
                    style={{ color: previewTemplate.otpHeadingColor || '#2D5A27' }}
                    className="text-[11px] font-bold uppercase tracking-wider mb-2"
                  >
                    {replaceEmailPlaceholders(previewTemplate.otpHeroTitle || 'डिलीवरी सत्यापन कोड', DUMMY_EMAIL_PREVIEW_DATA)}
                  </div>
                  
                  <div 
                    style={{
                      backgroundColor: previewTemplate.otpCodeBgColor || '#FFFFFF',
                      borderColor: previewTemplate.otpCodeBorderColor || '#2D5A27',
                    }}
                    className="inline-block border-2 rounded-xl px-6 py-2 shadow-xs"
                  >
                    <span 
                      style={{
                        color: previewTemplate.otpCodeTextColor || '#1B4D21',
                        fontSize: previewDevice === 'mobile' ? '26px' : `${previewTemplate.otpFontSize || 34}px`,
                      }}
                      className="font-mono font-extrabold tracking-[6px] pl-1.5"
                    >
                      596018
                    </span>
                  </div>

                  <p 
                    style={{ color: previewTemplate.otpCodeTextColor || '#1B4D21' }}
                    className="text-xs font-bold mt-3 mb-1"
                  >
                    {replaceEmailPlaceholders(previewTemplate.otpExpiryNotice || 'यह कोड {{otpExpiry}} मिनट के लिए मान्य है।', {
                      ...DUMMY_EMAIL_PREVIEW_DATA,
                      otpExpiry: config.expiryMinutes || 15,
                    })}
                  </p>
                  <p className="text-[11px] text-gray-500 m-0">
                    {replaceEmailPlaceholders(previewTemplate.otpInstructions || 'सामान प्राप्त करने और उसकी जाँच करने के बाद ही यह OTP बताएं।', DUMMY_EMAIL_PREVIEW_DATA)}
                  </p>
                </div>

                {/* Security Alert Box */}
                {previewTemplate.securityNoticeText && (
                  <div 
                    style={{
                      backgroundColor: previewTemplate.securityNoticeBgColor || '#FFFBEB',
                      borderColor: previewTemplate.securityNoticeBorderColor || '#FDE68A',
                      borderLeftColor: previewTemplate.securityNoticeAccentColor || '#D97706',
                      color: previewTemplate.securityNoticeTextColor || '#92400E',
                    }}
                    className="border border-l-4 rounded-lg p-3 text-[11.5px] leading-relaxed"
                  >
                    {previewTemplate.securityNoticeTitle && (
                      <b className="font-bold mr-1">
                        {replaceEmailPlaceholders(previewTemplate.securityNoticeTitle, DUMMY_EMAIL_PREVIEW_DATA)}
                      </b>
                    )}
                    {replaceEmailPlaceholders(previewTemplate.securityNoticeText, DUMMY_EMAIL_PREVIEW_DATA)}
                  </div>
                )}

                {/* Order Info Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <div className="flex justify-between p-2.5 bg-gray-50 border-b border-gray-200">
                    <span className="text-gray-500">
                      {replaceEmailPlaceholders(previewTemplate.orderNumberLabel || 'ऑर्डर क्रमांक:', DUMMY_EMAIL_PREVIEW_DATA)}
                    </span>
                    <span className="font-bold text-gray-900">#FKB-2026-123456</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-white border-b border-gray-200">
                    <span className="text-gray-500">
                      {replaceEmailPlaceholders(previewTemplate.deliveryPartnerLabel || 'डिलीवरी साथी:', DUMMY_EMAIL_PREVIEW_DATA)}
                    </span>
                    <span className="font-bold text-gray-900">कमलेश पाटीदार</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-gray-50">
                    <span className="text-gray-500">
                      {replaceEmailPlaceholders(previewTemplate.orderStatusLabel || 'ऑर्डर स्थिति:', DUMMY_EMAIL_PREVIEW_DATA)}
                    </span>
                    <span 
                      style={{ color: previewTemplate.primaryColor || '#2D5A27' }}
                      className="font-bold"
                    >
                      {replaceEmailPlaceholders(previewTemplate.orderStatusValue || 'Delivery in Progress', DUMMY_EMAIL_PREVIEW_DATA)}
                    </span>
                  </div>
                </div>

                {/* Safety Information Box */}
                {(previewTemplate.safetyPoints || []).length > 0 && (
                  <div 
                    style={{
                      backgroundColor: previewTemplate.safetyBoxBgColor || '#F8FAF8',
                      borderColor: previewTemplate.safetyBoxBorderColor || '#E2E8F0',
                      borderLeftColor: previewTemplate.safetyBoxAccentColor || '#2D5A27',
                    }}
                    className="border border-l-4 rounded-lg p-3.5 space-y-1.5"
                  >
                    <div 
                      style={{ color: previewTemplate.safetyBoxAccentColor || '#2D5A27' }}
                      className="font-bold text-xs"
                    >
                      {replaceEmailPlaceholders(previewTemplate.safetySectionTitle || 'कृषि उत्पाद सुरक्षा सूचना', DUMMY_EMAIL_PREVIEW_DATA)}
                    </div>
                    <ul className="list-disc list-inside text-[11px] text-gray-600 space-y-1 pl-1 leading-relaxed">
                      {(previewTemplate.safetyPoints || []).map((pt, idx) => (
                        <li key={idx}>
                          {replaceEmailPlaceholders(pt, DUMMY_EMAIL_PREVIEW_DATA)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Dynamic Email Footer */}
              <div 
                style={{
                  backgroundColor: previewTemplate.footerBgColor || '#F9FAFB',
                  color: previewTemplate.footerTextColor || '#4B5563',
                }}
                className="p-4 text-center border-t border-gray-200 text-[11px] space-y-1"
              >
                {previewTemplate.footerContactText && (
                  <p className="m-0">
                    {replaceEmailPlaceholders(previewTemplate.footerContactText, DUMMY_EMAIL_PREVIEW_DATA)}
                  </p>
                )}
                {previewTemplate.tagline && (
                  <p className="m-0 font-medium text-gray-600">
                    {previewTemplate.storeName || 'फल्सावदिया कृषि बाजार'} • {replaceEmailPlaceholders(previewTemplate.tagline, DUMMY_EMAIL_PREVIEW_DATA)}
                  </p>
                )}
                {previewTemplate.copyrightText && (
                  <p className="m-0 text-[10px] text-gray-400 mt-1">
                    {replaceEmailPlaceholders(previewTemplate.copyrightText, DUMMY_EMAIL_PREVIEW_DATA)}
                  </p>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-4 overflow-x-auto text-emerald-400 font-mono text-xs max-h-96">
            <pre className="whitespace-pre-wrap">{liveHtmlCode}</pre>
          </div>
        )}
      </div>

      {/* SECTION 5: DEDICATED EDIT EMAIL TEMPLATE SECTION */}
      <AdminDeliveryEmailTemplateEditor 
        onTemplateChange={(updated) => setPreviewTemplate(updated)}
        testEmailRecipient={testEmailRecipient}
      />

      {/* SECTION 5: STEP-BY-STEP HELP GUIDE MODAL/COLLAPSIBLE */}
      <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHelpGuide(!showHelpGuide)}>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <HelpCircle className="w-4 h-4 text-[#2D5A27]" />
            <span>Google App Password कैसे बनाएं? (1-मिनट गाइड)</span>
          </div>
          <span className="text-xs font-black text-[#2D5A27]">{showHelpGuide ? 'छुपाएं ▲' : 'देखें ▼'}</span>
        </div>

        {showHelpGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-gray-600 space-y-2 pt-2 border-t border-gray-200"
          >
            <ol className="list-decimal list-inside space-y-1.5 font-medium">
              <li>
                अपने Google खाते की सुरक्षा सेटिंग्स पर जाएँ: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline inline-flex items-center gap-0.5">Google Security <ExternalLink className="w-3 h-3" /></a>
              </li>
              <li>
                सुनिश्चित करें कि <b>2-Step Verification (2-चरणीय सत्यापन)</b> चालू (ON) है।
              </li>
              <li>
                सर्च बार में <b>"App Passwords"</b> टाइप करें या सीधे <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline inline-flex items-center gap-0.5">myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" /></a> खोलें।
              </li>
              <li>
                App Name में <b>"Falsawdiya Krishi Bazaar"</b> लिखें और <b>Create</b> पर क्लिक करें।
              </li>
              <li>
                Google आपको 16-अक्षरों का पीला कोड (उदा. <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold">abcd efgh ijkl mnop</code>) दिखाएगा। उसे कॉपी करके ऊपर वाले इनपुट में पेस्ट कर दें।
              </li>
            </ol>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminEmailOtpManager;
