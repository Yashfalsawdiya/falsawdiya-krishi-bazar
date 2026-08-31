import React, { useState, useEffect, useMemo } from 'react';
import { 
  Palette, Type, FileText, ShieldAlert, CheckCircle2, 
  AlertCircle, Save, RotateCcw, Send, Plus, Trash2, 
  HelpCircle, Sparkles, Copy, Check, Layout, 
  MessageSquare, Layers, Eye, RefreshCw, Shield,
  Smartphone, Phone, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { DeliveryEmailTemplateConfig } from '../types';
import { 
  DEFAULT_DELIVERY_EMAIL_TEMPLATE, 
  DUMMY_EMAIL_PREVIEW_DATA, 
  mergeDeliveryEmailTemplate, 
  renderDeliveryEmailTemplateHtml,
  replaceEmailPlaceholders 
} from '../data/defaultDeliveryEmailTemplate';
import { toSafeString } from '../services/deliveryOtpService';

type EditorTab = 'branding' | 'content' | 'otpSecurity' | 'orderLabels' | 'safety' | 'footer' | 'design';

const COLOR_PRESETS = [
  '#2D5A27', '#1b4317', '#15803d', '#047857', '#0f766e',
  '#1e3a8a', '#1e293b', '#374151', '#b45309', '#b91c1c',
  '#f8faf8', '#fffbeb', '#fef2f2', '#f0fdf4', '#ffffff'
];

const DYNAMIC_PLACEHOLDERS = [
  { tag: '{{customerName}}', label: 'ग्राहक का नाम', desc: 'उदा. रमेश पाटीदार' },
  { tag: '{{orderId}}', label: 'ऑर्डर क्रमांक', desc: 'उदा. FKB-2026-123456' },
  { tag: '{{otp}}', label: 'डिलीवरी OTP', desc: 'उदा. 596018' },
  { tag: '{{otpExpiry}}', label: 'वैधता समय (मिनट)', desc: 'उदा. 15' },
  { tag: '{{deliveryPartnerName}}', label: 'डिलीवरी साथी का नाम', desc: 'उदा. कमलेश पाटीदार' },
  { tag: '{{orderStatus}}', label: 'ऑर्डर स्थिति', desc: 'उदा. Delivery in Progress' },
  { tag: '{{storeName}}', label: 'दुकान का नाम', desc: 'उदा. फल्सावदिया कृषि बाजार' },
  { tag: '{{storePhone}}', label: 'दुकान का फोन/व्हाट्सएप', desc: 'उदा. +91 89823 38046' },
  { tag: '{{currentYear}}', label: 'वर्तमान वर्ष', desc: 'उदा. 2026' },
];

interface AdminDeliveryEmailTemplateEditorProps {
  onTemplateChange?: (template: DeliveryEmailTemplateConfig) => void;
  testEmailRecipient?: string;
}

export const AdminDeliveryEmailTemplateEditor: React.FC<AdminDeliveryEmailTemplateEditorProps> = ({
  onTemplateChange,
  testEmailRecipient = '',
}) => {
  const { 
    deliveryEmailTemplate, 
    updateDeliveryEmailTemplate, 
    resetDeliveryEmailTemplate,
    appContent 
  } = useAppContext();

  // Local draft state initialized with merged values
  const [template, setTemplate] = useState<DeliveryEmailTemplateConfig>(() => {
    return mergeDeliveryEmailTemplate(deliveryEmailTemplate, {
      storeName: appContent?.branding?.name || 'फल्सावदिया कृषि बाजार',
      contactNumber: appContent?.contactInfo?.whatsapp || '+91 89823 38046',
    });
  });

  const [activeTab, setActiveTab] = useState<EditorTab>('branding');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [customTestEmail, setCustomTestEmail] = useState(testEmailRecipient);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Sync external changes if form is pristine
  useEffect(() => {
    if (deliveryEmailTemplate) {
      const merged = mergeDeliveryEmailTemplate(deliveryEmailTemplate);
      setTemplate(merged);
      if (onTemplateChange) {
        onTemplateChange(merged);
      }
    }
  }, [deliveryEmailTemplate]);

  // Track if there are unsaved changes
  const isDirty = useMemo(() => {
    const original = JSON.stringify(deliveryEmailTemplate || DEFAULT_DELIVERY_EMAIL_TEMPLATE);
    const current = JSON.stringify(template);
    return original !== current;
  }, [template, deliveryEmailTemplate]);

  // Helper to update flat fields
  const updateField = <K extends keyof DeliveryEmailTemplateConfig>(
    key: K, 
    value: DeliveryEmailTemplateConfig[K]
  ) => {
    setTemplate(prev => {
      const next = { ...prev, [key]: value };
      if (onTemplateChange) onTemplateChange(next);
      return next;
    });
  };

  // Safety Points Handlers
  const handleAddSafetyPoint = () => {
    setTemplate(prev => {
      const updated = [...(prev.safetyPoints || []), 'नई कृषि सुरक्षा निर्देश बिंदु यहाँ लिखें...'];
      const next = { ...prev, safetyPoints: updated };
      if (onTemplateChange) onTemplateChange(next);
      return next;
    });
  };

  const handleUpdateSafetyPoint = (index: number, text: string) => {
    setTemplate(prev => {
      const updated = [...(prev.safetyPoints || [])];
      updated[index] = text;
      const next = { ...prev, safetyPoints: updated };
      if (onTemplateChange) onTemplateChange(next);
      return next;
    });
  };

  const handleRemoveSafetyPoint = (index: number) => {
    setTemplate(prev => {
      const updated = (prev.safetyPoints || []).filter((_, i) => i !== index);
      const next = { ...prev, safetyPoints: updated };
      if (onTemplateChange) onTemplateChange(next);
      return next;
    });
  };

  // Copy placeholder tag
  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // Save template to Firestore & Server
  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateDeliveryEmailTemplate(template);
      setFeedback({
        type: 'success',
        message: 'ईमेल टेम्पलेट सफलतापूर्वक सहेजा गया और लाइव अपडेट हो गया!',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Failed to save email template:', err);
      setFeedback({
        type: 'error',
        message: toSafeString(err?.message || err, 'टेम्पलेट सहेजने में विफल। कृपया पुनः प्रयास करें।'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      await resetDeliveryEmailTemplate();
      setTemplate({ ...DEFAULT_DELIVERY_EMAIL_TEMPLATE });
      if (onTemplateChange) onTemplateChange({ ...DEFAULT_DELIVERY_EMAIL_TEMPLATE });
      setShowConfirmReset(false);
      setFeedback({
        type: 'success',
        message: 'ईमेल टेम्पलेट मूल डिफ़ॉल्ट सेटिंग्स पर रीस्टोर हो गया।',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Failed to reset email template:', err);
      setFeedback({
        type: 'error',
        message: 'डिफ़ॉल्ट सेटिंग्स रीस्टोर करने में त्रुटि आई।',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Send Test Email using current template draft
  const handleSendTest = async () => {
    const target = (customTestEmail || testEmailRecipient || '').trim();
    if (!target || !target.includes('@')) {
      setFeedback({
        type: 'error',
        message: 'कृपया परीक्षण ईमेल भेजने के लिए मान्य ईमेल पता दर्ज करें।',
      });
      return;
    }

    setIsTesting(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/delivery/test-template-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: target,
          template: template,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: toSafeString(data.message, `परीक्षण ईमेल ${target} पर सफलतापूर्वक भेजा गया!`),
        });
      } else {
        setFeedback({
          type: 'error',
          message: toSafeString(data.error, 'परीक्षण ईमेल भेजने में विफल। SMTP सेटिंग्स जाँचें।'),
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: toSafeString(err?.message || err, 'परीक्षण ईमेल सर्वर त्रुटि।'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-sm space-y-6">
      
      {/* Editor Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-[#2D5A27] rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <span>ईमेल टेम्पलेट संपादक (Edit Email Template)</span>
                {isDirty && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full">
                    असंरक्षित बदलाव (Unsaved)
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                डिलीवरी OTP ईमेल का संपूर्ण कंटेंट, विषय, रंग, कृषि सुरक्षा बिंदु एवं लेआउट कस्टमाइज़ करें।
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowConfirmReset(true)}
            disabled={isSaving}
            className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:text-red-700 bg-gray-100 hover:bg-red-50 border border-gray-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="मूल डिफ़ॉल्ट सेटिंग्स रीस्टोर करें"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>डिफ़ॉल्ट रीस्टोर</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-black text-white bg-[#2D5A27] hover:bg-[#23461e] shadow-xs active:scale-98 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>टेम्पलेट सहेजें (Save)</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`p-3.5 rounded-2xl border text-xs font-bold shadow-xs flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <p className="leading-snug">{feedback.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Placeholders Quick-Copy Ribbon */}
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#1B4D21]">
            <Info className="w-3.5 h-3.5" />
            <span>डायनामिक प्लेसहोल्डर्स (Dynamic Placeholders) - किसी भी टेक्स्ट में इस्तेमाल करें:</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline">क्लिक करके कॉपी करें</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {DYNAMIC_PLACEHOLDERS.map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => handleCopyTag(item.tag)}
              title={`${item.label} (${item.desc}) - कॉपी करने के लिए क्लिक करें`}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 hover:border-[#2D5A27] rounded-lg text-[11px] font-mono text-emerald-900 hover:bg-emerald-100/60 transition-all cursor-pointer shadow-2xs"
            >
              <span className="font-bold">{item.tag}</span>
              <span className="text-[10px] text-gray-500 font-sans">({item.label})</span>
              {copiedTag === item.tag ? (
                <Check className="w-3 h-3 text-emerald-600 ml-0.5" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-gray-400 opacity-60 ml-0.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200 scrollbar-none">
        {[
          { id: 'branding', label: 'ब्रांडिंग व हेडर', icon: Sparkles },
          { id: 'content', label: 'विषय व अभिवादन', icon: MessageSquare },
          { id: 'otpSecurity', label: 'OTP व सुरक्षा', icon: Shield },
          { id: 'orderLabels', label: 'ऑर्डर लेबल्स', icon: FileText },
          { id: 'safety', label: 'कृषि सुरक्षा बिंदु', icon: ShieldAlert },
          { id: 'footer', label: 'फुटर व संपर्क', icon: Phone },
          { id: 'design', label: 'रंग व डिज़ाइन', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as EditorTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#2D5A27] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="space-y-4 pt-1">
        
        {/* TAB 1: BRANDING & HEADER */}
        {activeTab === 'branding' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  दुकान / ब्रांड का नाम (Store Name)
                </label>
                <input
                  type="text"
                  value={template.storeName || ''}
                  onChange={(e) => updateField('storeName', e.target.value)}
                  placeholder="फल्सावदिया कृषि बाजार"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ईमेल मुख्य हेडर शीर्षक (Header Title)
                </label>
                <input
                  type="text"
                  value={template.headerTitle || ''}
                  onChange={(e) => updateField('headerTitle', e.target.value)}
                  placeholder="{{storeName}}"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-mono"
                />
                <p className="text-[10.5px] text-gray-400 mt-1">आप <code>{'{{storeName}}'}</code> या कोई भी कस्टम टेक्स्ट लिख सकते हैं।</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                हेडर उप-शीर्षक (Header Subtitle)
              </label>
              <input
                type="text"
                value={template.headerSubtitle || ''}
                onChange={(e) => updateField('headerSubtitle', e.target.value)}
                placeholder="सुरक्षित ऑर्डर डिलीवरी सत्यापन प्रणाली"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">ब्रांड लोगो दिखाएं (Show Brand Logo)</h4>
                  <p className="text-[11px] text-gray-500">हेडर में गोल व्हाइट बैज के अंदर स्टोर लोगो प्रदर्शित करें।</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.showLogo !== false}
                    onChange={(e) => updateField('showLogo', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2D5A27]"></div>
                </label>
              </div>

              {template.showLogo !== false && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    कस्टम लोगो इमेज URL (वैकल्पिक / Default: /icon-192.png)
                  </label>
                  <input
                    type="text"
                    value={template.logoUrl || ''}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    placeholder="https://your-domain.com/logo.png (खाली रखने पर डिफ़ॉल्ट लोगो उपयोग होगा)"
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:border-[#2D5A27] outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT & GREETING */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ईमेल विषय (Email Subject Line)
              </label>
              <input
                type="text"
                value={template.subject || ''}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="डिलीवरी सत्यापन कोड [{{otp}}] - ऑर्डर #{{orderId}} | {{storeName}}"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-mono"
              />
              <p className="text-[10.5px] text-gray-400 mt-1">
                ग्राहक के इनबॉक्स में दिखने वाला ईमेल का मुख्य टाइटल।
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                अभिवादन संदेश (Greeting Message)
              </label>
              <input
                type="text"
                value={template.greeting || ''}
                onChange={(e) => updateField('greeting', e.target.value)}
                placeholder="नमस्ते {{customerName}},"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                डिलीवरी सूचना पैराग्राफ (Delivery Information Text)
              </label>
              <textarea
                rows={3}
                value={template.deliveryInfoText || ''}
                onChange={(e) => updateField('deliveryInfoText', e.target.value)}
                placeholder="आपके ऑर्डर #{{orderId}} की डिलीवरी के लिए हमारे Delivery Partner {{deliveryPartnerName}} आपके दिए गए पते पर सामान लेकर पहुँच गए हैं।"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-mono leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* TAB 3: OTP & SECURITY BOX */}
        {activeTab === 'otpSecurity' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/70 space-y-3">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2D5A27]" />
                <span>OTP कार्ड सेटिंग्स (OTP Card Content)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    OTP कार्ड शीर्षक (OTP Heading)
                  </label>
                  <input
                    type="text"
                    value={template.otpHeroTitle || ''}
                    onChange={(e) => updateField('otpHeroTitle', e.target.value)}
                    placeholder="डिलीवरी सत्यापन कोड"
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:border-[#2D5A27] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    OTP एक्सपायरी संदेश (Expiry Notice)
                  </label>
                  <input
                    type="text"
                    value={template.otpExpiryNotice || ''}
                    onChange={(e) => updateField('otpExpiryNotice', e.target.value)}
                    placeholder="यह कोड {{otpExpiry}} मिनट के लिए मान्य है।"
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:border-[#2D5A27] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  OTP निर्देश (Instructions below OTP)
                </label>
                <input
                  type="text"
                  value={template.otpInstructions || ''}
                  onChange={(e) => updateField('otpInstructions', e.target.value)}
                  placeholder="सामान प्राप्त करने और उसकी जाँच करने के बाद ही यह OTP Delivery Partner को बताएं।"
                  className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:border-[#2D5A27] outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
              <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>सुरक्षा सूचना बॉक्स (Security Notice Box)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    सुरक्षा बॉक्स शीर्षक (Security Title)
                  </label>
                  <input
                    type="text"
                    value={template.securityNoticeTitle || ''}
                    onChange={(e) => updateField('securityNoticeTitle', e.target.value)}
                    placeholder="सुरक्षा सूचना:"
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:border-[#2D5A27] outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    सुरक्षा चेतावनी टेक्स्ट (Security Text)
                  </label>
                  <input
                    type="text"
                    value={template.securityNoticeText || ''}
                    onChange={(e) => updateField('securityNoticeText', e.target.value)}
                    placeholder="सामान प्राप्त किए बिना OTP किसी व्यक्ति के साथ साझा न करें।"
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:border-[#2D5A27] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ORDER INFO LABELS */}
        {activeTab === 'orderLabels' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              ईमेल के ऑर्डर समरी टेबल में उपयोग होने वाले लेबल्स को संपादित करें:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ऑर्डर नंबर लेबल (Order Number Label)
                </label>
                <input
                  type="text"
                  value={template.orderNumberLabel || ''}
                  onChange={(e) => updateField('orderNumberLabel', e.target.value)}
                  placeholder="ऑर्डर क्रमांक:"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  डिलीवरी पार्टनर लेबल (Delivery Partner Label)
                </label>
                <input
                  type="text"
                  value={template.deliveryPartnerLabel || ''}
                  onChange={(e) => updateField('deliveryPartnerLabel', e.target.value)}
                  placeholder="डिलीवरी साथी:"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ऑर्डर स्थिति लेबल (Order Status Label)
                </label>
                <input
                  type="text"
                  value={template.orderStatusLabel || ''}
                  onChange={(e) => updateField('orderStatusLabel', e.target.value)}
                  placeholder="ऑर्डर स्थिति:"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  स्थिति मान टेम्पलेट (Status Value Template)
                </label>
                <input
                  type="text"
                  value={template.orderStatusValue || ''}
                  onChange={(e) => updateField('orderStatusValue', e.target.value)}
                  placeholder="{{orderStatus}}"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AGRICULTURE SAFETY POINTS */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                सुरक्षा अनुभाग शीर्षक (Safety Section Title)
              </label>
              <input
                type="text"
                value={template.safetySectionTitle || ''}
                onChange={(e) => updateField('safetySectionTitle', e.target.value)}
                placeholder="कृषि उत्पाद सुरक्षा सूचना"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700">
                  कृषि सुरक्षा निर्देश बिंदु (Safety Points List)
                </label>
                <button
                  type="button"
                  onClick={handleAddSafetyPoint}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#2D5A27] border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>नया बिंदु जोड़ें</span>
                </button>
              </div>

              {(template.safetyPoints || []).map((point, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="w-6 h-9 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                    {index + 1}.
                  </span>
                  <textarea
                    rows={2}
                    value={point}
                    onChange={(e) => handleUpdateSafetyPoint(index, e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSafetyPoint(index)}
                    disabled={(template.safetyPoints || []).length <= 1}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 cursor-pointer shrink-0 mt-1"
                    title="इस बिंदु को हटाएं"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: FOOTER & CONTACT */}
        {activeTab === 'footer' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  स्टोर हेल्पलाइन / WhatsApp नंबर
                </label>
                <input
                  type="text"
                  value={template.contactNumber || ''}
                  onChange={(e) => updateField('contactNumber', e.target.value)}
                  placeholder="+91 89823 38046"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ब्रांड टैगलाइन (Tagline)
                </label>
                <input
                  type="text"
                  value={template.tagline || ''}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="किसान का भरोसा, हमारी पहचान"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                फुटर संपर्क टेक्स्ट (Footer Help Text)
              </label>
              <input
                type="text"
                value={template.footerContactText || ''}
                onChange={(e) => updateField('footerContactText', e.target.value)}
                placeholder="कृषि से संबंधित जानकारी के लिए संपर्क करें: WhatsApp {{storePhone}}"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                कॉपीराइट टेक्स्ट (Copyright Text)
              </label>
              <input
                type="text"
                value={template.copyrightText || ''}
                onChange={(e) => updateField('copyrightText', e.target.value)}
                placeholder="© {{currentYear}} {{storeName}}. सर्वाधिकार सुरक्षित।"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* TAB 7: DESIGN & COLORS */}
        {activeTab === 'design' && (
          <div className="space-y-5">
            
            {/* Color Palette Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Header BG */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  हेडर बैकग्राउंड रंग (Header BG)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.headerBgColor || '#2D5A27'}
                    onChange={(e) => updateField('headerBgColor', e.target.value)}
                    className="w-9 h-9 rounded-xl border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={template.headerBgColor || '#2D5A27'}
                    onChange={(e) => updateField('headerBgColor', e.target.value)}
                    className="flex-1 bg-white border border-gray-200 rounded-xl p-2 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Header Accent Border */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  हेडर बॉटम बॉर्डर (Header Accent)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.headerBorderColor || '#1E3E1A'}
                    onChange={(e) => updateField('headerBorderColor', e.target.value)}
                    className="w-9 h-9 rounded-xl border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={template.headerBorderColor || '#1E3E1A'}
                    onChange={(e) => updateField('headerBorderColor', e.target.value)}
                    className="flex-1 bg-white border border-gray-200 rounded-xl p-2 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* OTP Box BG */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  OTP बॉक्स बैकग्राउंड (OTP Box BG)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.otpBoxBgColor || '#F8FAF8'}
                    onChange={(e) => updateField('otpBoxBgColor', e.target.value)}
                    className="w-9 h-9 rounded-xl border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={template.otpBoxBgColor || '#F8FAF8'}
                    onChange={(e) => updateField('otpBoxBgColor', e.target.value)}
                    className="flex-1 bg-white border border-gray-200 rounded-xl p-2 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* OTP Text Color */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  OTP कोड टेक्स्ट रंग (OTP Text Color)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.otpCodeTextColor || '#1B4D21'}
                    onChange={(e) => updateField('otpCodeTextColor', e.target.value)}
                    className="w-9 h-9 rounded-xl border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={template.otpCodeTextColor || '#1B4D21'}
                    onChange={(e) => updateField('otpCodeTextColor', e.target.value)}
                    className="flex-1 bg-white border border-gray-200 rounded-xl p-2 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Outer Background */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  ईमेल बाहरी बैकग्राउंड (Outer Canvas BG)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.outerBgColor || '#F4F6F4'}
                    onChange={(e) => updateField('outerBgColor', e.target.value)}
                    className="w-9 h-9 rounded-xl border border-gray-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={template.outerBgColor || '#F4F6F4'}
                    onChange={(e) => updateField('outerBgColor', e.target.value)}
                    className="flex-1 bg-white border border-gray-200 rounded-xl p-2 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Card Radius */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                  <span>कार्ड कोना गोलाई (Border Radius)</span>
                  <span className="text-[#2D5A27]">{template.cardBorderRadius || 12}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="2"
                  value={template.cardBorderRadius || 12}
                  onChange={(e) => updateField('cardBorderRadius', Number(e.target.value))}
                  className="w-full accent-[#2D5A27] cursor-pointer"
                />
              </div>

            </div>

            {/* Typography Scale */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#2D5A27]" />
                <span>टाइपोग्राफी और फॉन्ट साइज़ (Typography Scaling)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between items-center text-xs font-medium text-gray-700 mb-1">
                    <span>हेडिंग साइज़ (Heading Size)</span>
                    <span className="font-bold">{template.headingFontSize || 22}px</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="28"
                    value={template.headingFontSize || 22}
                    onChange={(e) => updateField('headingFontSize', Number(e.target.value))}
                    className="w-full accent-[#2D5A27] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-medium text-gray-700 mb-1">
                    <span>बॉडी टेक्स्ट साइज़ (Body Size)</span>
                    <span className="font-bold">{template.bodyFontSize || 14}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="18"
                    value={template.bodyFontSize || 14}
                    onChange={(e) => updateField('bodyFontSize', Number(e.target.value))}
                    className="w-full accent-[#2D5A27] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-medium text-gray-700 mb-1">
                    <span>OTP कोड साइज़ (OTP Size)</span>
                    <span className="font-bold">{template.otpFontSize || 38}px</span>
                  </div>
                  <input
                    type="range"
                    min="28"
                    max="48"
                    value={template.otpFontSize || 38}
                    onChange={(e) => updateField('otpFontSize', Number(e.target.value))}
                    className="w-full accent-[#2D5A27] cursor-pointer"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Live Test & Save Bottom Bar */}
      <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Test Email Input */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="email"
            value={customTestEmail}
            onChange={(e) => setCustomTestEmail(e.target.value)}
            placeholder="परीक्षण ईमेल पता दर्ज करें..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:bg-white focus:border-[#2D5A27] outline-none font-medium"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isTesting}
            className="px-4 py-2.5 bg-gray-100 hover:bg-emerald-50 text-[#2D5A27] border border-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            title="वर्तमान ड्राफ्ट का लाइव परीक्षण ईमेल भेजें"
          >
            {isTesting ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>टेस्ट भेजें</span>
          </button>
        </div>

        {/* Save CTA */}
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 text-xs font-black text-white bg-[#2D5A27] hover:bg-[#23461e] shadow-xs active:scale-98 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>टेम्पलेट सहेजें (Save Template)</span>
          </button>
        </div>

      </div>

      {/* Confirmation Modal for Reset */}
      <AnimatePresence>
        {showConfirmReset && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-200 shadow-xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900">डिफ़ॉल्ट सेटिंग्स रीस्टोर करें?</h4>
                <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                  क्या आप सुनिश्चित हैं? आपके द्वारा किए गए सभी कस्टम टेक्स्ट एवं रंग बदलाव मूल डिफ़ॉल्ट टेम्पलेट में बदल दिए जाएंगे।
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer"
                >
                  हाँ, रीस्टोर करें
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminDeliveryEmailTemplateEditor;
