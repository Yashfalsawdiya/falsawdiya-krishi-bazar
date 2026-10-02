import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Truck, 
  RotateCcw,
  Sparkles,
  Layers,
  Scale,
  PhoneCall
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';

export const GrievanceRedressal: React.FC = () => {
  const { appContent, legalPagesContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const grvData = legalPagesContent?.grievanceRedressal || DEFAULT_LEGAL_PAGES_CONTENT.grievanceRedressal;

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
            <Scale className="w-8 h-8 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
            {grvData.bannerTitle || 'शिकायत निवारण अधिकारी'}
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            {grvData.bannerSubtitle || 'Grievance Redressal Mechanism & Officer'}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-medium text-green-100 mt-2">
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            <span>अंतिम अपडेट: {grvData.lastUpdated || '24 August 2026'}</span>
          </div>
        </div>
      </motion.div>

      {/* Intro Box */}
      {grvData.introText && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-2"
        >
          <div className="flex items-center gap-2 text-[#2D5A27] font-bold">
            <ShieldCheck className="w-4 h-4 text-[#2D5A27]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">वैधानिक अनुपालन एवं उत्तरदायित्व</h2>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
            {grvData.introText}
          </p>
        </motion.div>
      )}

      {/* Designated Grievance Officer Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-200/80 space-y-4 relative overflow-hidden"
      >
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center font-bold text-xl border border-emerald-100">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#4A3728]">
              {grvData.officerName || 'श्री यश फल्सावदिया'}
            </h3>
            <p className="text-xs font-bold text-[#2D5A27]">
              {grvData.officerDesignation || 'नोडल शिकायत निवारण अधिकारी (Grievance Officer)'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <Phone className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] text-gray-500 font-medium block">सीधा संपर्क फोन:</span>
              <a href={`tel:${(grvData.officerPhone || '8982338046').replace(/\D/g, '')}`} className="font-bold text-gray-800 hover:text-[#2D5A27]">
                {grvData.officerPhone || '+91 8982338046'}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <Mail className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[11px] text-gray-500 font-medium block">आधिकारिक ईमेल:</span>
              <a href={`mailto:${grvData.officerEmail || 'yashfalsawdiya36@gmail.com'}`} className="font-bold text-gray-800 hover:text-[#2D5A27] truncate block">
                {grvData.officerEmail || 'yashfalsawdiya36@gmail.com'}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 sm:col-span-2">
            <MapPin className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] text-gray-500 font-medium block">कार्यालय का भौतिक पता:</span>
              <span className="font-semibold text-gray-800 leading-relaxed block">
                {grvData.officerAddress || 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, मंदसौर (म.प्र.) - 458118'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 sm:col-span-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] text-gray-500 font-medium block">कार्य समय (Working Hours):</span>
              <span className="font-semibold text-gray-800">
                {grvData.workingHours || 'सोमवार से शनिवार: प्रातः 09:00 बजे से सायं 07:00 बजे तक'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Statutory Timelines Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 text-xs space-y-1"
        >
          <div className="flex items-center gap-1.5 text-[#2D5A27] font-bold">
            <Clock className="w-4 h-4" />
            <span>पावती समय (Acknowledgment)</span>
          </div>
          <p className="font-semibold text-gray-800">
            {grvData.acknowledgmentHours || '48 घंटे के भीतर पावती व टिकट नंबर'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50/80 rounded-2xl p-4 border border-blue-200 text-xs space-y-1"
        >
          <div className="flex items-center gap-1.5 text-blue-800 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>अंतिम समाधान (Resolution)</span>
          </div>
          <p className="font-semibold text-gray-800">
            {grvData.resolutionDays || 'अधिकतम 15 कार्य दिवसों में पूर्ण निवारण'}
          </p>
        </motion.div>
      </div>

      {/* Detailed Sections */}
      {grvData.sections && grvData.sections.length > 0 && (
        <div className="space-y-4">
          {grvData.sections.map((sec, idx) => (
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

      {/* Jurisdiction Box */}
      {grvData.jurisdiction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs text-gray-700 flex items-start gap-2.5"
        >
          <Scale className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-gray-900">न्यायिक क्षेत्राधिकार (Legal Jurisdiction): </span>
            <span>{grvData.jurisdiction}</span>
          </div>
        </motion.div>
      )}

      {/* Direct Contact Button */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#2D5A27] via-[#24481f] to-[#1b3717] rounded-3xl p-5 text-white shadow-md space-y-3"
      >
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#EAB308]" />
          <div>
            <h2 className="text-sm font-black text-white">लिखित शिकायत दर्ज करें</h2>
            <p className="text-[11px] text-green-100 font-medium">आप सीधे नोडल अधिकारी से संपर्क कर सकते हैं</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <a
            href={`mailto:${grvData.officerEmail || 'yashfalsawdiya36@gmail.com'}?subject=शिकायत%20निवारण%20अनुरोध%20-%20फल्सावदिया%20कृषि%20बाजार`}
            className="bg-white text-[#2D5A27] py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>ईमेल भेजें</span>
          </a>
          <a
            href={`tel:${(grvData.officerPhone || '8982338046').replace(/\D/g, '')}`}
            className="bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>कॉल करें</span>
          </a>
        </div>
      </motion.div>

      {/* Navigation Footer Links */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Link 
            to="/terms"
            className="bg-white border border-gray-200 hover:border-amber-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" /> <span className="truncate">नियम एवं शर्तें</span>
          </Link>
          <Link 
            to="/shipping-policy"
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> <span className="truncate">डिलीवरी नीति</span>
          </Link>
          <Link 
            to="/privacy"
            className="bg-white border border-gray-200 hover:border-blue-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">गोपनीयता नीति</span>
          </Link>
          <Link 
            to="/faq"
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> <span className="truncate">FAQ / सहायता</span>
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

export default GrievanceRedressal;
