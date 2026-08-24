import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Glasses, 
  Wind, 
  Sun, 
  Trash2, 
  AlertTriangle, 
  HeartPulse, 
  Lock, 
  Droplets, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  Phone, 
  PhoneCall, 
  FileText, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  Flame,
  Clock,
  Layers,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';

const ICONS = [FileText, Glasses, Droplets, Sun, Wind, Trash2, HeartPulse, ShieldAlert];

const ChemicalSafety: React.FC = () => {
  const { appContent, legalPagesContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const safetyData = legalPagesContent?.chemicalSafety || DEFAULT_LEGAL_PAGES_CONTENT.chemicalSafety;

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-red-800 via-rose-900 to-red-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-400/10 rounded-full -ml-18 -mb-18 blur-xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner mb-1">
            <ShieldAlert className="w-8 h-8 text-amber-300" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">
            {safetyData.bannerTitle || 'Agro-Chemical Safety Guidelines'}
          </h1>
          <p className="text-sm font-semibold text-amber-300">
            {safetyData.bannerSubtitle || 'कीटनाशक व रासायनिक सुरक्षा निर्देश'}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-medium text-rose-100 mt-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span>सुरक्षा ही सर्वोत्तम बचाव है • अंतिम अपडेट: {safetyData.lastUpdated || '24 August 2026'}</span>
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
        <div className="flex items-center gap-2 text-rose-800 font-bold">
          <Info className="w-5 h-5 text-rose-700" />
          <h2 className="text-base font-black text-[#4A3728]">महत्वपूर्ण सुरक्षा संदेश</h2>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
          {safetyData.introText}
        </p>
      </motion.div>

      {/* Do's and Don'ts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Do's (क्या करें) */}
        {safetyData.dosList && safetyData.dosList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-emerald-50/80 rounded-3xl p-5 border border-emerald-200 shadow-xs space-y-3"
          >
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black text-emerald-900">क्या करें (Do's)</h3>
            </div>
            <ul className="space-y-2">
              {safetyData.dosList.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-emerald-100 text-xs text-gray-800 font-medium">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Don'ts (क्या न करें) */}
        {safetyData.dontsList && safetyData.dontsList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-rose-50/80 rounded-3xl p-5 border border-rose-200 shadow-xs space-y-3"
          >
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <XCircle className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-black text-rose-900">क्या न करें (Don'ts)</h3>
            </div>
            <ul className="space-y-2">
              {safetyData.dontsList.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-rose-100 text-xs text-gray-800 font-medium">
                  <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Dynamic Sections / Rules */}
      {safetyData.sections && safetyData.sections.length > 0 && (
        <div className="space-y-4">
          {safetyData.sections.map((sec, idx) => {
            const IconComp = ICONS[idx % ICONS.length];
            return (
              <motion.div
                key={sec.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * idx }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
              >
                <div className="flex items-center gap-2.5 text-rose-800">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700 shrink-0">
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
                        <span className="text-rose-600 font-bold">•</span>
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

      {/* Emergency Numbers Card */}
      {safetyData.emergencyNumbers && safetyData.emergencyNumbers.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-r from-red-600 to-rose-700 rounded-3xl p-6 text-white shadow-md space-y-3"
        >
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-amber-300" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">आपातकालीन सहायता (Emergency Assistance)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {safetyData.emergencyNumbers.map((em, idx) => (
              <a 
                key={idx}
                href={`tel:${em.number.replace(/\D/g, '')}`}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl p-3 flex flex-col justify-between transition-colors active:scale-95"
              >
                <div>
                  <p className="text-[11px] font-bold text-amber-200">{em.title}</p>
                  <p className="text-[10px] text-rose-100 mt-0.5">{em.desc}</p>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-black bg-white text-rose-700 py-1.5 px-3 rounded-xl w-fit">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{em.number}</span>
                </div>
              </a>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-r from-red-600 to-rose-700 rounded-3xl p-6 text-white shadow-md space-y-3"
        >
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-amber-300" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">आपातकालीन सहायता (Emergency Assistance)</h2>
          </div>
          <div className="pt-1 flex gap-2">
            <a 
              href="tel:108"
              className="flex-1 bg-white text-rose-700 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <PhoneCall className="w-4 h-4" /> एम्बुलेंस 108
            </a>
            <a 
              href="tel:8982338046"
              className="flex-1 bg-white/20 border border-white/30 text-white py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4" /> स्टोर हेल्पलाइन 8982338046
            </a>
          </div>
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
            to="/refund-policy"
            className="bg-white border border-gray-200 hover:border-rose-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" /> <span className="truncate">वापसी नीति</span>
          </Link>
          <Link 
            to="/disclaimer"
            className="bg-white border border-gray-200 hover:border-yellow-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" /> <span className="truncate">AI अस्वीकरण</span>
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

export default ChemicalSafety;
