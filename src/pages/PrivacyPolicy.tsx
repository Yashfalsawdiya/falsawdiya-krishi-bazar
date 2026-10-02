import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  CreditCard, 
  Sparkles, 
  Server, 
  Mail, 
  Phone, 
  MessageCircle, 
  Clock, 
  ChevronRight,
  FileText,
  UserCheck,
  RotateCcw,
  AlertTriangle,
  PhoneCall,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_LEGAL_PAGES_CONTENT } from '../data/defaultPagesContent';

const SECTION_ICONS = [Database, Server, CreditCard, Sparkles, Lock, UserCheck, ShieldCheck, Mail];

const PrivacyPolicy: React.FC = () => {
  const { appContent, legalPagesContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const privacyData = legalPagesContent?.privacyPolicy || DEFAULT_LEGAL_PAGES_CONTENT.privacyPolicy;

  return (
    <div className="space-y-6 pb-8">
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
            <ShieldCheck className="w-8 h-8 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">
            {privacyData.bannerTitle || 'Privacy Policy'}
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            {privacyData.bannerSubtitle || 'गोपनीयता नीति'}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-medium text-green-100 mt-2">
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            <span>अंतिम अपडेट: {privacyData.lastUpdated || '24 August 2026'}</span>
          </div>
        </div>
      </motion.div>

      {/* Introduction Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2 text-[#2D5A27] font-bold">
          <Lock className="w-5 h-5 text-[#2D5A27]" />
          <h2 className="text-base font-black text-[#4A3728]">प्रस्तावना (Introduction)</h2>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-line">
          {privacyData.introText}
        </p>
      </motion.div>

      {/* Sections from LegalPagesContent */}
      {privacyData.sections && privacyData.sections.length > 0 && (
        <div className="space-y-4">
          {privacyData.sections.map((sec, idx) => {
            const IconComp = SECTION_ICONS[idx % SECTION_ICONS.length];
            return (
              <motion.div
                key={sec.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
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

      {/* Contact & Support Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
            <Phone className="w-4 h-4" />
          </div>
          <h2 className="text-base font-black text-[#4A3728]">गोपनीयता सहायता एवं संपर्क</h2>
        </div>

        <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
          <p className="font-bold text-[#4A3728]">{branding.name}</p>
          <p className="text-gray-600">डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर (म.प्र.) 458883</p>
          {privacyData.contactPhone && (
            <p className="text-gray-700"><strong>फोन / हेल्पलाइन:</strong> {privacyData.contactPhone}</p>
          )}
          {privacyData.contactEmail && (
            <p className="text-gray-700"><strong>ईमेल:</strong> {privacyData.contactEmail}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <a 
            href={`tel:${(privacyData.contactPhone || '8982338046').replace(/\D/g, '')}`}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-[#2D5A27] text-white rounded-2xl text-xs font-bold shadow-sm active:scale-95 transition-all"
          >
            <Phone className="w-4 h-4" /> कॉल करें
          </a>
          <a 
            href="https://wa.me/918982338046?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-sm active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      </motion.div>

      {/* Quick Navigation Footer Links */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Link 
            to="/about"
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" /> <span className="truncate">हमारे बारे में</span>
          </Link>
          <Link 
            to="/terms"
            className="bg-white border border-gray-200 hover:border-amber-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" /> <span className="truncate">नियम एवं शर्तें</span>
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

export default PrivacyPolicy;
