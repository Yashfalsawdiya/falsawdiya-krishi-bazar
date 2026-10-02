import React from 'react';
import { motion } from 'motion/react';
import { 
  Award, 
  ShieldCheck, 
  FileCheck2, 
  AlertTriangle, 
  Building2, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Sprout, 
  FlaskConical, 
  Layers, 
  ChevronRight, 
  HelpCircle, 
  PhoneCall, 
  MapPin, 
  Info,
  Clock,
  ShieldAlert,
  User,
  Sparkles,
  Truck,
  RotateCcw,
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';

export const LicensingDisclaimer: React.FC = () => {
  const { legalPagesContent } = useAppContext();
  const pageData = legalPagesContent?.licensingDisclaimer || DEFAULT_LEGAL_PAGES_CONTENT.licensingDisclaimer;

  return (
    <div className="space-y-6 pb-16 font-sans max-w-4xl mx-auto px-3 sm:px-6 pt-2 sm:pt-4">
      {/* 1. Hero / Header Banner - Beautiful Rounded Card with Green Border */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#2D5A27] via-[#24481f] to-[#1b3717] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border-2 border-emerald-600/40"
      >
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FDE047]/10 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-start space-y-3">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-white border border-white/20 shadow-xs">
            <Award className="w-4 h-4 text-emerald-300" />
            <span>DAESI Certified Agricultural Advisor</span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {pageData.bannerTitle || 'वैधानिक कृषि लाइसेंस, DAESI प्रमाणन एवं गुणवत्ता नीति'}
          </h1>

          {/* Subtitle in clean white */}
          <p className="text-sm sm:text-base font-normal text-emerald-100/90 max-w-2xl leading-relaxed">
            {pageData.bannerSubtitle || 'Fertilizer, Seed & Pesticide Statutory Compliance & Quality Assurance'}
          </p>

          {/* Last Updated badge in elegant white and soft mint */}
          <div className="pt-1 flex items-center gap-2 text-xs font-medium text-white/90 bg-black/25 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/15">
            <Clock className="w-3.5 h-3.5 text-emerald-300" />
            <span>अंतिम अद्यतन: <span className="text-white font-bold ml-1">{pageData.lastUpdated}</span></span>
          </div>
        </div>
      </motion.div>

      {/* 2. Main Content Container */}
      <div className="space-y-6">

        {/* Highlight Card: DAESI Diploma & Qualified Expert */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-100 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-gray-100 pb-5 mb-5">
            {/* Left: Operator Details */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center font-bold text-xl border border-emerald-100 shadow-xs shrink-0">
                <Award className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                  प्रमाणित कृषि विस्तारक (Certified Agri-Input Advisor)
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#4A3728]">
                  {pageData.operatorName}
                </h2>
              </div>
            </div>
            
            {/* Right: Passport Photo (Read-Only) & DAESI Status Badge */}
            <div className="flex flex-col items-center sm:items-end gap-2 self-center sm:self-auto w-full sm:w-auto">
              {/* Clean Read-Only Passport Photo Frame */}
              <div className="w-20 h-24 sm:w-22 sm:h-28 rounded-2xl border-2 border-emerald-600/50 bg-slate-100 shadow-xs overflow-hidden flex flex-col items-center justify-center relative bg-gradient-to-b from-white to-slate-50">
                {pageData.operatorPhotoUrl ? (
                  <img 
                    src={pageData.operatorPhotoUrl} 
                    alt={pageData.operatorName}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-emerald-800/70 p-2 text-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold text-emerald-900 leading-tight">
                      DAESI Advisor
                    </span>
                  </div>
                )}
              </div>

              {/* DAESI Badge */}
              <div className="inline-flex items-center gap-1.5 bg-emerald-100/80 text-emerald-900 border border-emerald-300/80 px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>DAESI डिप्लोमा उत्तीर्ण</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
              <span className="text-gray-500 font-medium block">तकनीकी योग्यता (Qualification):</span>
              <p className="text-gray-900 font-bold text-sm leading-snug">
                {pageData.qualification}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
              <span className="text-gray-500 font-medium block">प्रशिक्षण संस्थान व संबद्धता (University):</span>
              <p className="text-gray-900 font-bold text-sm leading-snug">
                {pageData.university}
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-xs text-emerald-950 font-medium leading-relaxed">
            <span className="font-bold text-emerald-900">कृषि परामर्श का उद्देश्य: </span>
            {pageData.introText}
          </div>
        </div>

        {/* Licensing Status Box (Application in Process) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-white">
          <div className="flex items-center gap-2.5 text-amber-900 font-extrabold text-base mb-3">
            <FileCheck2 className="w-5 h-5 text-amber-700 shrink-0" />
            <span>वैधानिक लाइसेंसिंग स्थिति (Statutory Licensing Status)</span>
          </div>

          <div className="inline-block bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-lg text-xs border border-amber-300/80 mb-3">
            {pageData.licenseStatus}
          </div>

          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-normal mb-4">
            {pageData.applicationNote}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white p-3 rounded-xl border border-amber-200/70 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>कीटनाशक (Pesticide)</span>
              </div>
              <p className="text-[11px] text-gray-600 font-medium leading-tight">
                {pageData.pesticideLicenseNo}
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200/70 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>उर्वरक (Fertilizer)</span>
              </div>
              <p className="text-[11px] text-gray-600 font-medium leading-tight">
                {pageData.fertilizerLicenseNo}
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200/70 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                <Sprout className="w-3.5 h-3.5" />
                <span>बीज (Seeds)</span>
              </div>
              <p className="text-[11px] text-gray-600 font-medium leading-tight">
                {pageData.seedLicenseNo}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-100 text-[11px] text-gray-600 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
            <span>संबंधित लाइसेंसिंग प्राधिकारी: <strong>{pageData.issuingAuthority}</strong></span>
          </div>
        </div>

        {/* Detailed Sections List */}
        <div className="space-y-5">
          {pageData.sections?.map((section, idx) => (
            <div 
              key={section.id || idx}
              className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 hover:border-emerald-100 transition-colors"
            >
              <h3 className="text-base sm:text-lg font-bold text-[#4A3728] mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 text-xs font-extrabold flex items-center justify-center shrink-0 border border-emerald-200">
                  {idx + 1}
                </span>
                <span>{section.title}</span>
              </h3>

              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-normal">
                {section.content}
              </p>

              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-3.5 space-y-2 border-t border-gray-50 pt-3">
                  {section.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0" />
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Direct Contact & Assurance Banner */}
        <div className="bg-gradient-to-br from-[#2D5A27] via-[#244b1f] to-[#386b30] text-white rounded-3xl p-6 sm:p-7 shadow-md border border-emerald-600/30 flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="space-y-1.5 text-center sm:text-left relative z-10">
            <h4 className="text-base sm:text-lg font-bold flex items-center justify-center sm:justify-start gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
              <span>प्रमाणित सलाह एवं विश्वसनीय कृषि उत्पाद</span>
            </h4>
            <p className="text-xs sm:text-sm text-emerald-100 font-normal">
              किसी भी उत्पाद के बैच, गुणवत्ता या कीटनाशक परामर्श के लिए सीधे संपर्क करें।
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 justify-center relative z-10">
            <a 
              href="tel:+918982338046"
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span>8982338046</span>
            </a>
            <Link 
              to="/contact"
              className="bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-colors"
            >
              <span>संपर्क विवरण</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick Footer Links to Other Legal Pages */}
        <div className="pt-4 border-t border-gray-200/80 flex flex-col gap-2">
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 text-center sm:text-left">
            अन्य कानूनी एवं वैधानिक पृष्ठ (Legal & Compliance)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Link 
              to="/safety-guidelines" 
              className="bg-white border border-gray-200 hover:border-red-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="truncate">केमिकल सुरक्षा</span>
            </Link>
            <Link 
              to="/shipping-policy" 
              className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">डिलीवरी नीति</span>
            </Link>
            <Link 
              to="/refund-policy" 
              className="bg-white border border-gray-200 hover:border-rose-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">रिफंड व वापसी</span>
            </Link>
            <Link 
              to="/grievance" 
              className="bg-white border border-gray-200 hover:border-blue-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs"
            >
              <Scale className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="truncate">शिकायत अधिकारी</span>
            </Link>
            <Link 
              to="/privacy" 
              className="bg-white border border-gray-200 hover:border-blue-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">गोपनीयता नीति</span>
            </Link>
            <Link 
              to="/terms" 
              className="bg-white border border-gray-200 hover:border-amber-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors text-center shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">नियम एवं शर्तें</span>
            </Link>
          </div>

          <Link 
            to="/"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center mt-1"
          >
            मुख्य पृष्ठ (Home)
          </Link>
        </div>

      </div>
    </div>
  );
};

export default LicensingDisclaimer;

