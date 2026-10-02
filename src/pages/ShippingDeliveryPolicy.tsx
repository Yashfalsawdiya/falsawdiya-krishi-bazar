import React from 'react';
import { motion } from 'motion/react';
import { 
  Truck, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  PackageCheck, 
  AlertCircle, 
  PhoneCall, 
  FileText, 
  RotateCcw, 
  HelpCircle, 
  Sparkles,
  Layers,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';
import { DEFAULT_LEGAL_PAGES_CONTENT_EN } from '../data/defaultPagesContentEn';

export const ShippingDeliveryPolicy: React.FC = () => {
  const { appContent, legalPagesContent } = useAppContext();
  const { isEnglish, translateText } = useLanguage();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const defaultShipping = isEnglish ? DEFAULT_LEGAL_PAGES_CONTENT_EN.shippingPolicy : DEFAULT_LEGAL_PAGES_CONTENT.shippingPolicy;
  const rawShipData = legalPagesContent?.shippingPolicy || defaultShipping;
  const shipData = {
    ...rawShipData,
    bannerTitle: isEnglish ? (rawShipData === defaultShipping ? rawShipData.bannerTitle : translateText(rawShipData.bannerTitle)) : rawShipData.bannerTitle,
    bannerSubtitle: isEnglish ? (rawShipData === defaultShipping ? rawShipData.bannerSubtitle : translateText(rawShipData.bannerSubtitle)) : rawShipData.bannerSubtitle,
    introText: isEnglish ? (rawShipData === defaultShipping ? rawShipData.introText : translateText(rawShipData.introText)) : rawShipData.introText,
    coverageAreaText: isEnglish ? (rawShipData === defaultShipping ? rawShipData.coverageAreaText : translateText(rawShipData.coverageAreaText || '')) : rawShipData.coverageAreaText,
    standardDeliveryTime: isEnglish ? (rawShipData === defaultShipping ? rawShipData.standardDeliveryTime : translateText(rawShipData.standardDeliveryTime || '')) : rawShipData.standardDeliveryTime,
    sections: (rawShipData.sections || []).map(sec => ({
      ...sec,
      title: isEnglish ? (rawShipData === defaultShipping ? sec.title : translateText(sec.title)) : sec.title,
      content: isEnglish ? (rawShipData === defaultShipping ? sec.content : translateText(sec.content)) : sec.content,
      bullets: sec.bullets ? sec.bullets.map(b => isEnglish ? (rawShipData === defaultShipping ? b : translateText(b)) : b) : undefined
    }))
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#2D5A27] via-[#24481f] to-[#1b3717] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#EAB308]/10 rounded-full -ml-18 -mb-18 blur-xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner mb-1">
            <Truck className="w-8 h-8 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
            {shipData.bannerTitle || (isEnglish ? 'Shipping & Delivery Policy' : 'शिपिंग एवं डिलीवरी नीति')}
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            {shipData.bannerSubtitle || (isEnglish ? 'Safe & Fast Delivery to Fields & Homes' : 'खेतों और घरों तक सुरक्षित व तीव्र डिलीवरी')}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-medium text-green-100 mt-2">
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            <span>{isEnglish ? 'Last Updated: ' : 'अंतिम अपडेट: '}{shipData.lastUpdated || (isEnglish ? '24 August 2026' : '24 अगस्त 2026')}</span>
          </div>
        </div>
      </motion.div>

      {/* Intro Box */}
      {shipData.introText && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-2"
        >
          <div className="flex items-center gap-2 text-[#2D5A27] font-bold">
            <Sparkles className="w-4 h-4 text-[#2D5A27]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">सुरक्षित व समयबद्ध डिलीवरी संकल्प</h2>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
            {shipData.introText}
          </p>
        </motion.div>
      )}

      {/* Key Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200/80 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-[#2D5A27] font-bold text-xs">
            <Clock className="w-4 h-4" />
            <span>अनुमानित डिलीवरी समय सीमा</span>
          </div>
          <p className="text-xs font-semibold text-gray-800">
            {shipData.estimatedTimeline || '24 से 48 घंटे के भीतर'}
          </p>
          <p className="text-[11px] text-gray-600">
            स्थानीय क्षेत्रों में त्वरित सेम-डे या अगले दिन सुरक्षित डिलीवरी।
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/80 space-y-1.5"
        >
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
            <PackageCheck className="w-4 h-4" />
            <span>मुफ्त डिलीवरी सीमा (Free Delivery)</span>
          </div>
          <p className="text-xs font-semibold text-gray-800">
            {shipData.freeDeliveryThreshold || '₹999 या अधिक के ऑर्डर पर मुफ्त डिलीवरी'}
          </p>
          <p className="text-[11px] text-gray-600">
            {shipData.standardDeliveryFee || 'सामान्य ऑर्डर पर न्यूनतम शुल्क ₹30 - ₹50'}
          </p>
        </motion.div>
      </div>

      {/* Serviceable Delivery Areas */}
      {shipData.deliveryAreas && shipData.deliveryAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-3"
        >
          <div className="flex items-center gap-2 text-[#2D5A27]">
            <MapPin className="w-4 h-4" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">सक्रिय डिलीवरी क्षेत्र (Serviceable Areas)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {shipData.deliveryAreas.map((area, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-800"
              >
                <div className="w-2 h-2 rounded-full bg-[#2D5A27] shrink-0" />
                <span>{area}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Heavy item and Tracking Notice */}
      <div className="space-y-3">
        {shipData.heavyItemNote && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">भारी सामग्री (Heavy Goods): </span>
              <span>{shipData.heavyItemNote}</span>
            </div>
          </motion.div>
        )}

        {shipData.trackingInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ऑर्डर ट्रैकिंग व अपडेट: </span>
              <span>{shipData.trackingInfo}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Detailed Policy Sections */}
      {shipData.sections && shipData.sections.length > 0 && (
        <div className="space-y-4">
          {shipData.sections.map((sec, idx) => (
            <motion.div
              key={sec.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-2"
            >
              <div className="flex items-center gap-2 text-[#2D5A27]">
                <Layers className="w-4 h-4" />
                <h2 className="text-xs font-bold text-[#4A3728] uppercase">{sec.title}</h2>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
                {sec.content}
              </p>
              {sec.bullets && sec.bullets.length > 0 && (
                <ul className="space-y-1.5 pt-1 bg-[#F5F2ED]/50 p-3 rounded-xl">
                  {sec.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="text-[#2D5A27] font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Support & Quick Contact Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#2D5A27] via-[#24481f] to-[#1b3717] rounded-3xl p-5 text-white shadow-md space-y-3"
      >
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#EAB308]" />
          <div>
            <h2 className="text-sm font-black text-white">डिलीवरी सहायता एवं पूछताछ</h2>
            <p className="text-[11px] text-green-100 font-medium">अपने ऑर्डर की स्थिति जानने या डिलीवरी के लिए संपर्क करें</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <a
            href="tel:8982338046"
            className="bg-white text-[#2D5A27] py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{isEnglish ? 'Helpline (8982338046)' : 'हेल्पलाइन (8982338046)'}</span>
          </a>
          <Link
            to="/contact"
            className="bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            <span>{isEnglish ? 'Contact Details' : 'संपर्क विवरण'}</span>
          </Link>
        </div>
      </motion.div>

      {/* Navigation Footer Links */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Link 
            to="/refund-policy"
            className="bg-white border border-gray-200 hover:border-rose-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" /> <span className="truncate">{isEnglish ? 'Return & Refund' : 'वापसी व रिफंड'}</span>
          </Link>
          <Link 
            to="/terms"
            className="bg-white border border-gray-200 hover:border-amber-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" /> <span className="truncate">{isEnglish ? 'Terms & Conditions' : 'नियम एवं शर्तें'}</span>
          </Link>
          <Link 
            to="/faq"
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> <span className="truncate">{isEnglish ? 'Help & FAQs' : 'FAQ / सहायता'}</span>
          </Link>
          <Link 
            to="/grievance"
            className="bg-white border border-gray-200 hover:border-blue-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">{isEnglish ? 'Grievance Officer' : 'शिकायत अधिकारी'}</span>
          </Link>
        </div>
        <Link 
          to="/"
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center"
        >
          {isEnglish ? 'Home' : 'मुख्य पृष्ठ'}
        </Link>
      </div>
    </div>
  );
};

export default ShippingDeliveryPolicy;
