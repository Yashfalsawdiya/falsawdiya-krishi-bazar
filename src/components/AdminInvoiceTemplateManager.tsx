import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Save, RotateCcw, Download, Eye, Check, AlertCircle, 
  Sparkles, Palette, Building, UserCheck, Table, DollarSign, 
  FileCheck, Shield, HelpCircle, ChevronRight, Plus, Trash2,
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { InvoiceTemplateConfig, Order } from '../types';
import { DEFAULT_INVOICE_TEMPLATE, SAMPLE_INVOICE_ORDER, mergeInvoiceTemplate } from '../data/defaultInvoiceTemplate';
import { renderInvoiceHtml, generateOrderInvoicePDF, loadLogoBase64 } from '../utils/invoiceGenerator';
import { getHighResImageURL } from '../lib/utils';

type EditorTab = 'header' | 'layout' | 'customerPayment' | 'table' | 'totals' | 'terms' | 'footer';

const COLOR_PRESETS = [
  '#2D5A27', '#1b4317', '#15803d', '#047857', '#0f766e',
  '#1e3a8a', '#1e293b', '#374151', '#b45309', '#b91c1c',
  '#fde047', '#fef08a', '#ffffff', '#faf8f5', '#f3f4f6'
];

export const AdminInvoiceTemplateManager: React.FC = () => {
  const { 
    invoiceTemplate, 
    updateInvoiceTemplate, 
    resetInvoiceTemplate, 
    appContent 
  } = useAppContext();

  // Working template form state
  const [config, setConfig] = useState<InvoiceTemplateConfig>(() => {
    return mergeInvoiceTemplate(invoiceTemplate, {
      name: appContent?.branding?.name,
      tagline: appContent?.branding?.tagline,
      phone: appContent?.contactInfo?.whatsapp,
      address: appContent?.contactInfo?.address,
    });
  });

  const [activeTab, setActiveTab] = useState<EditorTab>('header');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingPdf, setIsTestingPdf] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [previewScale, setPreviewScale] = useState<number>(0.82);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state if external invoiceTemplate loads/changes and form is pristine
  useEffect(() => {
    if (invoiceTemplate) {
      setConfig(prev => ({
        ...DEFAULT_INVOICE_TEMPLATE,
        ...invoiceTemplate,
      }));
    }
  }, [invoiceTemplate]);

  // Track if there are unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(invoiceTemplate || DEFAULT_INVOICE_TEMPLATE);
  }, [config, invoiceTemplate]);

  // Update a single nested or flat config property
  const updateField = <K extends keyof InvoiceTemplateConfig>(key: K, value: InvoiceTemplateConfig[K]) => {
    setConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Terms Lines Handlers
  const handleAddTerm = () => {
    const nextIndex = (config.termsLines || []).length + 1;
    setConfig(prev => ({
      ...prev,
      termsLines: [...(prev.termsLines || []), `${nextIndex}. नई शर्त या सूचना यहाँ दर्ज करें।`],
    }));
  };

  const handleUpdateTerm = (index: number, text: string) => {
    const updated = [...(config.termsLines || [])];
    updated[index] = text;
    setConfig(prev => ({
      ...prev,
      termsLines: updated,
    }));
  };

  const handleRemoveTerm = (index: number) => {
    const updated = (config.termsLines || []).filter((_, i) => i !== index);
    setConfig(prev => ({
      ...prev,
      termsLines: updated,
    }));
  };

  // Save template configuration to Firestore
  const handleSave = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      await updateInvoiceTemplate(config);
      setNotification({
        type: 'success',
        message: 'इनवॉइस डिज़ाइन सफलतापूर्वक सहेज लिया गया है! सभी नए इनवॉइस इसी टेम्पलेट के अनुसार डाउनलोड होंगे।',
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      console.error('Failed to save invoice template:', err);
      setNotification({
        type: 'error',
        message: err?.message || 'टेम्पलेट सुरक्षित करने में समस्या आई। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleConfirmReset = async () => {
    setIsSaving(true);
    setShowResetModal(false);
    try {
      await resetInvoiceTemplate();
      setConfig(DEFAULT_INVOICE_TEMPLATE);
      setNotification({
        type: 'success',
        message: 'इनवॉइस टेम्पलेट को डिफ़ॉल्ट सेटिंग्स पर रीसेट कर दिया गया है।',
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'रीसेट करने में समस्या आई।',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate test PDF with current live config
  const handleDownloadTestPdf = async () => {
    setIsTestingPdf(true);
    try {
      const result = await generateOrderInvoicePDF(SAMPLE_INVOICE_ORDER, {
        storeName: config.businessName || appContent?.branding?.name,
        tagline: config.tagline || appContent?.branding?.tagline,
        phone: config.phone || appContent?.contactInfo?.whatsapp,
        address: config.address || appContent?.contactInfo?.address,
        logo: appContent?.branding?.logo,
      }, config);

      if (result.success) {
        setNotification({
          type: 'success',
          message: `टेस्ट PDF (${result.fileName}) सफलतापूर्वक जनरेट व डाउनलोड हो गया!`,
        });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'टेस्ट PDF डाउनलोड करने में समस्या आई।',
        });
      }
    } catch (err: any) {
      console.error('Test PDF generation failed:', err);
      setNotification({
        type: 'error',
        message: 'PDF जनरेट करने में त्रुटि हुई।',
      });
    } finally {
      setIsTestingPdf(false);
    }
  };

  // Render HTML String for live preview
  const previewHtml = useMemo(() => {
    const storeInfo = {
      storeName: config.businessName || appContent?.branding?.name,
      tagline: config.tagline || appContent?.branding?.tagline,
      phone: config.phone || appContent?.contactInfo?.whatsapp,
      address: config.address || appContent?.contactInfo?.address,
      logo: appContent?.branding?.logo,
    };
    return renderInvoiceHtml(
      SAMPLE_INVOICE_ORDER,
      config,
      storeInfo,
      getHighResImageURL(appContent?.branding?.logo) || '/icon-192.png'
    );
  }, [config, appContent]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                इनवॉइस डिज़ाइनर (Invoice Template)
                {isDirty && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                    बदलाव बाकी हैं
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                बिना कोड बदले अपनी ग्राहक PDF रसीद का पूरा रंग, लेआउट, हेडर, टेक्स्ट व कॉलम अनुकूलित करें।
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowResetModal(true)}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="डिफ़ॉल्ट सेटिंग्स पर वापस जाएँ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>डिफ़ॉल्ट रीसेट</span>
          </button>

          <button
            onClick={handleDownloadTestPdf}
            disabled={isTestingPdf}
            className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="वर्तमान डिज़ाइन का PDF डाउनलोड करके देखें"
          >
            {isTestingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>टेस्ट PDF</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-[#2D5A27] hover:bg-[#23481f] rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>बदलाव सहेजें</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="flex-1">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold underline cursor-pointer"
            >
              बंद करें
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Two-Column Layout: Controls on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & Settings (7 Cols on desktop) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-4">
          {/* Navigation Category Tabs */}
          <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'header', label: 'हेडर व ब्रांड', icon: Building },
              { id: 'layout', label: 'थीम व लेआउट', icon: Palette },
              { id: 'customerPayment', label: 'ग्राहक व भुगतान', icon: UserCheck },
              { id: 'table', label: 'उत्पाद तालिका', icon: Table },
              { id: 'totals', label: 'योग व डिलीवरी', icon: DollarSign },
              { id: 'terms', label: 'शर्तें व नियम', icon: FileCheck },
              { id: 'footer', label: 'बैज व फ़ूटर', icon: Shield },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2D5A27] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: HEADER & BRANDING */}
          {activeTab === 'header' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Building className="w-4 h-4 text-[#2D5A27]" />
                हेडर व ब्रांडिंग सेटिंग्स (Header & Branding)
              </h3>

              {/* Logo Visibility & Size */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">लोगो दिखाएँ (Show Logo)</label>
                  <input
                    type="checkbox"
                    checked={config.showLogo}
                    onChange={(e) => updateField('showLogo', e.target.checked)}
                    className="w-4 h-4 accent-[#2D5A27] cursor-pointer rounded"
                  />
                </div>

                {config.showLogo && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        लोगो साइज़: {config.logoSize}px
                      </label>
                      <input
                        type="range"
                        min="36"
                        max="84"
                        value={config.logoSize}
                        onChange={(e) => updateField('logoSize', Number(e.target.value))}
                        className="w-full accent-[#2D5A27] cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        कॉर्नर रेडियस: {config.logoBorderRadius}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        value={config.logoBorderRadius}
                        onChange={(e) => updateField('logoBorderRadius', Number(e.target.value))}
                        className="w-full accent-[#2D5A27] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">दुकान / व्यापार का नाम (Business Name)</label>
                <input
                  type="text"
                  value={config.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  placeholder="जैसे: फल्सावदिया कृषि बाजार"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27]"
                />
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      फ़ॉन्ट साइज़: {config.businessNameFontSize}px
                    </label>
                    <input
                      type="range"
                      min="16"
                      max="28"
                      value={config.businessNameFontSize}
                      onChange={(e) => updateField('businessNameFontSize', Number(e.target.value))}
                      className="w-full accent-[#2D5A27] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">फ़ॉन्ट कलर</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.businessNameColor}
                        onChange={(e) => updateField('businessNameColor', e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={config.businessNameColor}
                        onChange={(e) => updateField('businessNameColor', e.target.value)}
                        className="w-24 px-2 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">टैगलाइन / स्लोगन (Tagline)</label>
                <input
                  type="text"
                  value={config.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="जैसे: किसान का भरोसा, हमारी पहचान"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27]"
                />
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      साइज़: {config.taglineFontSize}px
                    </label>
                    <input
                      type="range"
                      min="9"
                      max="15"
                      value={config.taglineFontSize}
                      onChange={(e) => updateField('taglineFontSize', Number(e.target.value))}
                      className="w-full accent-[#2D5A27] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">कलर</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.taglineColor}
                        onChange={(e) => updateField('taglineColor', e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={config.taglineColor}
                        onChange={(e) => updateField('taglineColor', e.target.value)}
                        className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">हेल्पलाइन फोन</label>
                    <input
                      type="checkbox"
                      checked={config.showPhone}
                      onChange={(e) => updateField('showPhone', e.target.checked)}
                      className="w-3.5 h-3.5 accent-[#2D5A27] cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">दुकान का पता (Address)</label>
                    <input
                      type="checkbox"
                      checked={config.showAddress}
                      onChange={(e) => updateField('showAddress', e.target.checked)}
                      className="w-3.5 h-3.5 accent-[#2D5A27] cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={config.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Header Background */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-700 block">हेडर बैकग्राउंड (Header Background)</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="headerBgType"
                      checked={config.headerBgType === 'gradient'}
                      onChange={() => updateField('headerBgType', 'gradient')}
                      className="accent-[#2D5A27]"
                    />
                    <span>ग्रेडिएंट (Gradient)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="headerBgType"
                      checked={config.headerBgType === 'solid'}
                      onChange={() => updateField('headerBgType', 'solid')}
                      className="accent-[#2D5A27]"
                    />
                    <span>सॉलिड सिंगल कलर</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      {config.headerBgType === 'gradient' ? 'स्टार्ट कलर' : 'बैकग्राउंड कलर'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.headerBgColor}
                        onChange={(e) => updateField('headerBgColor', e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={config.headerBgColor}
                        onChange={(e) => updateField('headerBgColor', e.target.value)}
                        className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {config.headerBgType === 'gradient' && (
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">एंड कलर</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.headerBgGradientEnd}
                          onChange={(e) => updateField('headerBgGradientEnd', e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                        />
                        <input
                          type="text"
                          value={config.headerBgGradientEnd}
                          onChange={(e) => updateField('headerBgGradientEnd', e.target.value)}
                          className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                    हेडर पैडिंग (ऊंचाई/स्पेस): {config.headerPadding}px
                  </label>
                  <input
                    type="range"
                    min="14"
                    max="36"
                    value={config.headerPadding}
                    onChange={(e) => updateField('headerPadding', Number(e.target.value))}
                    className="w-full accent-[#2D5A27] cursor-pointer"
                  />
                </div>
              </div>

              {/* Tax Invoice Badge */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">टैक्स इनवॉइस बैज (Receipt Badge)</label>
                  <input
                    type="checkbox"
                    checked={config.showReceiptBadge}
                    onChange={(e) => updateField('showReceiptBadge', e.target.checked)}
                    className="w-4 h-4 accent-[#2D5A27] cursor-pointer rounded"
                  />
                </div>

                {config.showReceiptBadge && (
                  <div className="space-y-2.5 pt-1">
                    <input
                      type="text"
                      value={config.receiptBadgeText}
                      onChange={(e) => updateField('receiptBadgeText', e.target.value)}
                      placeholder="ई-रसीद / TAX INVOICE"
                      className="w-full px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-xl"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">बैज बैकग्राउंड</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={config.receiptBadgeBg}
                            onChange={(e) => updateField('receiptBadgeBg', e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                          />
                          <input
                            type="text"
                            value={config.receiptBadgeBg}
                            onChange={(e) => updateField('receiptBadgeBg', e.target.value)}
                            className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">टेक्स्ट कलर</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={config.receiptBadgeTextColor}
                            onChange={(e) => updateField('receiptBadgeTextColor', e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                          />
                          <input
                            type="text"
                            value={config.receiptBadgeTextColor}
                            onChange={(e) => updateField('receiptBadgeTextColor', e.target.value)}
                            className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LAYOUT & GLOBAL STYLING */}
          {activeTab === 'layout' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Palette className="w-4 h-4 text-[#2D5A27]" />
                थीम, बॉर्डर व स्पेसिंग सेटिंग्स (Layout & Styling)
              </h3>

              {/* Primary & Accent Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">प्राइमरी थीम कलर</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={config.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="w-24 px-2 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">एक्सेंट / हाइलाइट कलर</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.accentColor}
                      onChange={(e) => updateField('accentColor', e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={config.accentColor}
                      onChange={(e) => updateField('accentColor', e.target.value)}
                      className="w-24 px-2 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Outer Border Settings */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-700 block">मुख्य बाहरी बॉर्डर (Outer Border)</label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      बॉर्डर मोटाई: {config.outerBorderWidth}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      value={config.outerBorderWidth}
                      onChange={(e) => updateField('outerBorderWidth', Number(e.target.value))}
                      className="w-full accent-[#2D5A27] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      कॉर्नर गोलाई (Radius): {config.outerBorderRadius}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="28"
                      value={config.outerBorderRadius}
                      onChange={(e) => updateField('outerBorderRadius', Number(e.target.value))}
                      className="w-full accent-[#2D5A27] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">बॉर्डर स्टाइल</label>
                    <select
                      value={config.outerBorderStyle}
                      onChange={(e) => updateField('outerBorderStyle', e.target.value as any)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="solid">सॉलिड (Solid Line)</option>
                      <option value="dashed">डैशड (Dashed Line)</option>
                      <option value="double">डबल (Double Line)</option>
                      <option value="none">कोई बॉर्डर नहीं (None)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">बॉर्डर कलर</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.outerBorderColor}
                        onChange={(e) => updateField('outerBorderColor', e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={config.outerBorderColor}
                        onChange={(e) => updateField('outerBorderColor', e.target.value)}
                        className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards & Inner Padding */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-700 block">आंतरिक कार्ड्स व स्पेसिंग (Cards & Padding)</label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      कार्ड कॉर्नर रेडियस: {config.cardBorderRadius}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={config.cardBorderRadius}
                      onChange={(e) => updateField('cardBorderRadius', Number(e.target.value))}
                      className="w-full accent-[#2D5A27] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      पेज बाहरी पैडिंग: {config.containerPadding}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="40"
                      value={config.containerPadding}
                      onChange={(e) => updateField('containerPadding', Number(e.target.value))}
                      className="w-full accent-[#2D5A27] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">कार्ड बैकग्राउंड</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.cardBgColor}
                        onChange={(e) => updateField('cardBgColor', e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={config.cardBgColor}
                        onChange={(e) => updateField('cardBgColor', e.target.value)}
                        className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">सेक्शन बैकग्राउंड</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.detailsSectionBg}
                        onChange={(e) => updateField('detailsSectionBg', e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={config.detailsSectionBg}
                        onChange={(e) => updateField('detailsSectionBg', e.target.value)}
                        className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER & PAYMENT DETAILS */}
          {activeTab === 'customerPayment' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <UserCheck className="w-4 h-4 text-[#2D5A27]" />
                ग्राहक एवं भुगतान विवरण (Customer & Payment)
              </h3>

              {/* Customer Details Box */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">ग्राहक विवरण सेक्शन (Customer Details)</label>
                  <input
                    type="checkbox"
                    checked={config.showCustomerDetails}
                    onChange={(e) => updateField('showCustomerDetails', e.target.checked)}
                    className="w-4 h-4 accent-[#2D5A27] cursor-pointer rounded"
                  />
                </div>

                {config.showCustomerDetails && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">हेडिंग टेक्स्ट</label>
                      <input
                        type="text"
                        value={config.customerDetailsHeading}
                        onChange={(e) => updateField('customerDetailsHeading', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">हेडिंग कलर</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={config.customerHeadingColor}
                            onChange={(e) => updateField('customerHeadingColor', e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                          />
                          <input
                            type="text"
                            value={config.customerHeadingColor}
                            onChange={(e) => updateField('customerHeadingColor', e.target.value)}
                            className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">मोबाइल लेबल</label>
                        <input
                          type="text"
                          value={config.customerPhoneLabel}
                          onChange={(e) => updateField('customerPhoneLabel', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Details Box */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">भुगतान विवरण सेक्शन (Payment Info)</label>
                  <input
                    type="checkbox"
                    checked={config.showPaymentDetails}
                    onChange={(e) => updateField('showPaymentDetails', e.target.checked)}
                    className="w-4 h-4 accent-[#2D5A27] cursor-pointer rounded"
                  />
                </div>

                {config.showPaymentDetails && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">हेडिंग टेक्स्ट</label>
                      <input
                        type="text"
                        value={config.paymentDetailsHeading}
                        onChange={(e) => updateField('paymentDetailsHeading', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-xl"
                      />
                    </div>

                    {/* Razorpay & Courier Toggles */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showRazorpayId}
                          onChange={(e) => updateField('showRazorpayId', e.target.checked)}
                          className="accent-[#2D5A27] cursor-pointer"
                        />
                        <span>Razorpay ID दिखाएँ</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.showCourierTracking}
                          onChange={(e) => updateField('showCourierTracking', e.target.checked)}
                          className="accent-[#2D5A27] cursor-pointer"
                        />
                        <span>कूरियर ट्रैकिंग दिखाएँ</span>
                      </label>
                    </div>

                    {/* Paid Badge Styling */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">PAID बैज BG</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={config.paidBadgeBg}
                            onChange={(e) => updateField('paidBadgeBg', e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                          />
                          <input
                            type="text"
                            value={config.paidBadgeBg}
                            onChange={(e) => updateField('paidBadgeBg', e.target.value)}
                            className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-1">PAID टेक्स्ट कलर</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={config.paidBadgeTextColor}
                            onChange={(e) => updateField('paidBadgeTextColor', e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                          />
                          <input
                            type="text"
                            value={config.paidBadgeTextColor}
                            onChange={(e) => updateField('paidBadgeTextColor', e.target.value)}
                            className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRODUCTS TABLE */}
          {activeTab === 'table' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Table className="w-4 h-4 text-[#2D5A27]" />
                उत्पाद तालिका सेटिंग्स (Products Table)
              </h3>

              {/* Table Visibility */}
              <div className="flex items-center justify-between bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-700">उत्पाद तालिका दिखाएँ (Show Table)</label>
                <input
                  type="checkbox"
                  checked={config.showProductsTable}
                  onChange={(e) => updateField('showProductsTable', e.target.checked)}
                  className="w-4 h-4 accent-[#2D5A27] cursor-pointer rounded"
                />
              </div>

              {/* Table Heading */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">तालिका शीर्षक (Table Heading)</label>
                <input
                  type="text"
                  value={config.tableHeading}
                  onChange={(e) => updateField('tableHeading', e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold border border-gray-200 rounded-xl"
                />
              </div>

              {/* Table Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">हेडर बैकग्राउंड (Th BG)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.tableHeaderBg}
                      onChange={(e) => updateField('tableHeaderBg', e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={config.tableHeaderBg}
                      onChange={(e) => updateField('tableHeaderBg', e.target.value)}
                      className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">कीमत हाइलाइट कलर</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.tablePriceColor}
                      onChange={(e) => updateField('tablePriceColor', e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={config.tablePriceColor}
                      onChange={(e) => updateField('tablePriceColor', e.target.value)}
                      className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Row Font Size */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  तालिका फ़ॉन्ट साइज़: {config.tableFontSize}px
                </label>
                <input
                  type="range"
                  min="11"
                  max="16"
                  value={config.tableFontSize}
                  onChange={(e) => updateField('tableFontSize', Number(e.target.value))}
                  className="w-full accent-[#2D5A27] cursor-pointer"
                />
              </div>

              {/* Column Headers Customization */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-700 block">कॉलम शीर्षक (Column Titles)</label>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">उत्पाद नाम</span>
                    <input
                      type="text"
                      value={config.colProductTitle}
                      onChange={(e) => updateField('colProductTitle', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">पैकिंग (Unit)</span>
                    <input
                      type="text"
                      value={config.colUnitTitle}
                      onChange={(e) => updateField('colUnitTitle', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">मात्रा (Qty)</span>
                    <input
                      type="text"
                      value={config.colQtyTitle}
                      onChange={(e) => updateField('colQtyTitle', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">दर (Rate)</span>
                    <input
                      type="text"
                      value={config.colRateTitle}
                      onChange={(e) => updateField('colRateTitle', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">कुल (Total)</span>
                    <input
                      type="text"
                      value={config.colTotalTitle}
                      onChange={(e) => updateField('colTotalTitle', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TOTALS & DELIVERY */}
          {activeTab === 'totals' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <DollarSign className="w-4 h-4 text-[#2D5A27]" />
                योग व डिलीवरी सेटिंग्स (Totals & Delivery)
              </h3>

              {/* Subtotal Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">सबटोटल लेबल (Subtotal Label)</label>
                <input
                  type="text"
                  value={config.subtotalLabel}
                  onChange={(e) => updateField('subtotalLabel', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl"
                />
              </div>

              {/* Delivery Charge Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">डिलीवरी शुल्क लेबल (Delivery Label)</label>
                <input
                  type="text"
                  value={config.deliveryLabel}
                  onChange={(e) => updateField('deliveryLabel', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl"
                />
              </div>

              {/* Free Delivery Text */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">मुफ़्त डिलीवरी टेक्स्ट</label>
                  <input
                    type="text"
                    value={config.freeDeliveryText}
                    onChange={(e) => updateField('freeDeliveryText', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 block">मुफ़्त डिलीवरी कलर</label>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <input
                      type="color"
                      value={config.freeDeliveryColor}
                      onChange={(e) => updateField('freeDeliveryColor', e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={config.freeDeliveryColor}
                      onChange={(e) => updateField('freeDeliveryColor', e.target.value)}
                      className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Grand Total Styling */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-700 block">कुल देय राशि (Grand Total Highlight)</label>
                
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-600 block">ग्रैंड टोटल लेबल</span>
                  <input
                    type="text"
                    value={config.grandTotalLabel}
                    onChange={(e) => updateField('grandTotalLabel', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-xl bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      फ़ॉन्ट साइज़: {config.grandTotalFontSize}px
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="24"
                      value={config.grandTotalFontSize}
                      onChange={(e) => updateField('grandTotalFontSize', Number(e.target.value))}
                      className="w-full accent-[#2D5A27] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">टोटल हाइलाइट कलर</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.grandTotalColor}
                        onChange={(e) => updateField('grandTotalColor', e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                      />
                      <input
                        type="text"
                        value={config.grandTotalColor}
                        onChange={(e) => updateField('grandTotalColor', e.target.value)}
                        className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TERMS & NOTICE */}
          {activeTab === 'terms' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileCheck className="w-4 h-4 text-[#2D5A27]" />
                नियम एवं शर्तें सेटिंग्स (Terms & Notice)
              </h3>

              {/* Terms Visibility */}
              <div className="flex items-center justify-between bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <label className="text-xs font-bold text-gray-700">शर्तें व सूचना कार्ड दिखाएँ (Show Terms)</label>
                <input
                  type="checkbox"
                  checked={config.showTerms}
                  onChange={(e) => updateField('showTerms', e.target.checked)}
                  className="w-4 h-4 accent-[#2D5A27] cursor-pointer rounded"
                />
              </div>

              {/* Terms Heading */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">शीर्षक (Heading Text)</label>
                <input
                  type="text"
                  value={config.termsHeading}
                  onChange={(e) => updateField('termsHeading', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl"
                />
              </div>

              {/* Terms Lines List Editor */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">शर्तें व सूचना पंक्तियाँ (Line Items)</label>
                  <button
                    onClick={handleAddTerm}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>पंक्ति जोड़ें</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(config.termsLines || []).map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-bold text-gray-400">{idx + 1}.</span>
                      <input
                        type="text"
                        value={line}
                        onChange={(e) => handleUpdateTerm(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#2D5A27]"
                      />
                      <button
                        onClick={() => handleRemoveTerm(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all"
                        title="हटाएँ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms Card Styling */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">बॉर्डर स्टाइल</label>
                  <select
                    value={config.termsCardBorderStyle}
                    onChange={(e) => updateField('termsCardBorderStyle', e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="dashed">डैशड (Dashed)</option>
                    <option value="solid">सॉलिड (Solid)</option>
                    <option value="dotted">डॉटेड (Dotted)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">कार्ड बैकग्राउंड</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={config.termsCardBg}
                      onChange={(e) => updateField('termsCardBg', e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={config.termsCardBg}
                      onChange={(e) => updateField('termsCardBg', e.target.value)}
                      className="w-20 px-1.5 py-1 text-xs font-mono border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: VERIFIED BADGE & FOOTER */}
          {activeTab === 'footer' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Shield className="w-4 h-4 text-[#2D5A27]" />
                वेरिफाइड बैज व फ़ूटर सेटिंग्स (Badge & Footer)
              </h3>

              {/* Verified Badge */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">डिजिटल वेरिफाइड बैज दिखाएँ</label>
                  <input
                    type="checkbox"
                    checked={config.showVerifiedBadge}
                    onChange={(e) => updateField('showVerifiedBadge', e.target.checked)}
                    className="w-4 h-4 accent-[#2D5A27] cursor-pointer rounded"
                  />
                </div>

                {config.showVerifiedBadge && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">बैज टेक्स्ट</label>
                      <input
                        type="text"
                        value={config.verifiedBadgeText}
                        onChange={(e) => updateField('verifiedBadgeText', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">सबटेक्स्ट</label>
                      <input
                        type="text"
                        value={config.verifiedBadgeSubtext}
                        onChange={(e) => updateField('verifiedBadgeSubtext', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Settings */}
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">फ़ूटर दिखाएँ (Show Footer)</label>
                  <input
                    type="checkbox"
                    checked={config.showFooter}
                    onChange={(e) => updateField('showFooter', e.target.checked)}
                    className="w-4 h-4 accent-[#2D5A27] cursor-pointer rounded"
                  />
                </div>

                {config.showFooter && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">धन्यवाद संदेश (Thank You Message)</label>
                      <textarea
                        rows={2}
                        value={config.thankYouMessage}
                        onChange={(e) => updateField('thankYouMessage', e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#2D5A27]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="text-xs font-medium text-gray-700">फ़ूटर में दुकान का नाम दिखाएँ</label>
                      <input
                        type="checkbox"
                        checked={config.showStoreNameInFooter}
                        onChange={(e) => updateField('showStoreNameInFooter', e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#2D5A27] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE INVOICE PREVIEW (7 Cols on desktop) */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-3 sticky top-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#2D5A27]" />
              <span className="text-xs font-bold text-gray-900">लाइव PDF प्रिव्यू (Live Preview)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Realtime
              </span>
            </div>

            {/* Zoom / Scale Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPreviewScale(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
                title="छोटा करें"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-semibold text-gray-600 w-10 text-center">
                {Math.round(previewScale * 100)}%
              </span>
              <button
                onClick={() => setPreviewScale(prev => Math.min(1.2, Number((prev + 0.1).toFixed(2))))}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
                title="बड़ा करें"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewScale(0.82)}
                className="px-2 py-1 text-[10px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer ml-1"
                title="डिफ़ॉल्ट साइज़"
              >
                Fit
              </button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="bg-gray-100/90 rounded-2xl p-4 md:p-6 border border-gray-200/80 shadow-inner overflow-x-auto min-h-[600px] flex justify-center items-start">
            <div 
              style={{ 
                width: '794px',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              }}
              className="bg-white rounded-2xl shrink-0"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  क्या आप इनवॉइस डिज़ाइन रीसेट करना चाहते हैं?
                </h3>
                <p className="text-xs text-gray-500">
                  सभी कस्टम रंग, हेडर स्टाइल, फ़ॉन्ट साइज़ और नियम डिफ़ॉल्ट मूल सेटिंग्स पर वापस सेट हो जाएँगे।
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  हाँ, रीसेट करें
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminInvoiceTemplateManager;
