import React from 'react';
import { motion } from 'motion/react';
import { 
  RotateCcw, 
  Clock, 
  AlertCircle, 
  Ban, 
  CreditCard, 
  XCircle, 
  Phone, 
  Mail, 
  MessageCircle, 
  Truck, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck, 
  FileText, 
  PackageX, 
  AlertTriangle, 
  PhoneCall, 
  ShieldAlert,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';

const ICONS = [RotateCcw, AlertCircle, Clock, Ban, PackageX, Truck, CreditCard, Phone];

const ReturnRefundPolicy: React.FC = () => {
  const navigate = useNavigate();
  const { appContent, legalPagesContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const refundData = legalPagesContent?.refundPolicy || DEFAULT_LEGAL_PAGES_CONTENT.refundPolicy;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between lg:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 px-3.5 py-2 rounded-2xl shadow-xs border border-gray-200 transition-all cursor-pointer"
          title="वापस जाएँ (Back)"
        >
          <ArrowLeft className="w-4 h-4 text-[#2D5A27]" />
          <span>वापस जाएँ (Back)</span>
        </button>
      </div>

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
            <RotateCcw className="w-8 h-8 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">
            {refundData.bannerTitle || 'Return & Refund Policy'}
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            {refundData.bannerSubtitle || 'वापसी एवं रिफंड नीति'}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-medium text-green-100 mt-2">
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            <span>अंतिम अपडेट: {refundData.lastUpdated || '24 August 2026'}</span>
          </div>
        </div>
      </motion.div>

      {/* Intro Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2 text-[#2D5A27] font-bold">
          <RotateCcw className="w-5 h-5 text-[#2D5A27]" />
          <h2 className="text-base font-black text-[#4A3728]">प्रस्तावना (Introduction)</h2>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
          {refundData.introText}
        </p>

        {refundData.returnWindowText && (
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>वापसी/शिकायत सूचना समय-सीमा: <strong>{refundData.returnWindowText}</strong></span>
          </div>
        )}
      </motion.div>

      {/* Non-Returnable Conditions Card */}
      {refundData.nonReturnableConditions && refundData.nonReturnableConditions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-rose-50/80 rounded-3xl p-6 border border-rose-200 shadow-xs space-y-3"
        >
          <div className="flex items-center gap-2 text-rose-800 font-bold">
            <Ban className="w-5 h-5 text-rose-600" />
            <h2 className="text-sm font-black text-rose-900">किन परिस्थितियों में वापसी स्वीकार नहीं होगी?</h2>
          </div>

          <div className="space-y-2">
            {refundData.nonReturnableConditions.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-rose-100 text-xs text-gray-800 font-medium">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-black shrink-0">✕</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Dynamic Sections */}
      {refundData.sections && refundData.sections.length > 0 && (
        <div className="space-y-4">
          {refundData.sections.map((sec, idx) => {
            const IconComp = ICONS[idx % ICONS.length];
            return (
              <motion.div
                key={sec.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * idx }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
              >
                <div className="flex items-center gap-2.5 text-[#2D5A27]">
                  <div className="w-8 h-8 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27] shrink-0">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-black text-[#4A3728]">{sec.title}</h2>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
                  {sec.content}
                </p>

                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="space-y-1.5 pt-1 bg-[#F5F2ED]/50 p-3.5 rounded-2xl border border-gray-100">
                    {sec.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-[#2D5A27] font-bold">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Refund Process Card */}
      {refundData.refundProcessText && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-emerald-50 rounded-3xl p-5 border border-emerald-200 text-xs text-[#2D5A27] space-y-1.5"
        >
          <p className="font-bold flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-[#2D5A27]" />
            <span>रिफंड भुगतान प्रक्रिया (Refund Settlement)</span>
          </p>
          <p className="text-gray-700 font-medium leading-relaxed">{refundData.refundProcessText}</p>
        </motion.div>
      )}

      {/* Quick Navigation Footer Links */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Link 
            to="/about"
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" /> <span className="truncate">हमारे बारे में</span>
          </Link>
          <Link 
            to="/terms"
            className="bg-white border border-gray-200 hover:border-amber-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" /> <span className="truncate">नियम एवं शर्तें</span>
          </Link>
          <Link 
            to="/privacy"
            className="bg-white border border-gray-200 hover:border-blue-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">गोपनीयता नीति</span>
          </Link>
          <Link 
            to="/disclaimer"
            className="bg-white border border-gray-200 hover:border-yellow-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" /> <span className="truncate">AI अस्वीकरण</span>
          </Link>
          <Link 
            to="/safety-guidelines"
            className="bg-white border border-gray-200 hover:border-red-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" /> <span className="truncate">सुरक्षा निर्देश</span>
          </Link>
          <Link 
            to="/contact"
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" /> <span className="truncate">संपर्क करें</span>
          </Link>
        </div>
        <Link 
          to="/"
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center"
        >
          मुख्य पृष्ठ (Home)
        </Link>
      </div>
    </div>
  );
};

export default ReturnRefundPolicy;
