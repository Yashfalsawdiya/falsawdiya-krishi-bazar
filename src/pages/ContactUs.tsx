import React from 'react';
import { motion } from 'motion/react';
import { 
  Phone, 
  Mail, 
  Clock, 
  Truck, 
  MapPin, 
  MessageCircle, 
  ChevronRight, 
  ShieldCheck, 
  FileText, 
  RotateCcw, 
  AlertTriangle,
  Info,
  Navigation,
  CheckCircle2,
  PhoneCall,
  ShieldAlert,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_LEGAL_PAGES_CONTENT, DEFAULT_LEGAL_PAGES_CONTENT_EN } from '../data/defaultPagesContent';

const ContactUs: React.FC = () => {
  const { appContent, legalPagesContent } = useAppContext();
  const { isEnglish, translateText } = useLanguage();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const defaultContact = isEnglish ? DEFAULT_LEGAL_PAGES_CONTENT_EN.contactUs : DEFAULT_LEGAL_PAGES_CONTENT.contactUs;
  const rawContactData = legalPagesContent?.contactUs || defaultContact;
  const contactData = {
    ...rawContactData,
    bannerTitle: isEnglish ? (rawContactData === defaultContact ? rawContactData.bannerTitle : translateText(rawContactData.bannerTitle)) : rawContactData.bannerTitle,
    bannerSubtitle: isEnglish ? (rawContactData === defaultContact ? rawContactData.bannerSubtitle : translateText(rawContactData.bannerSubtitle)) : rawContactData.bannerSubtitle,
    introText: isEnglish ? (rawContactData === defaultContact ? rawContactData.introText : translateText(rawContactData.introText)) : rawContactData.introText,
    timings: isEnglish ? (rawContactData === defaultContact ? rawContactData.timings : translateText(rawContactData.timings || '')) : rawContactData.timings,
    deliveryArea: isEnglish ? (rawContactData === defaultContact ? rawContactData.deliveryArea : translateText(rawContactData.deliveryArea || '')) : rawContactData.deliveryArea,
    customNotes: rawContactData.customNotes ? (isEnglish ? (rawContactData === defaultContact ? rawContactData.customNotes : translateText(rawContactData.customNotes)) : rawContactData.customNotes) : undefined,
    sections: (rawContactData.sections || []).map(sec => ({
      ...sec,
      title: isEnglish ? (rawContactData === defaultContact ? sec.title : translateText(sec.title)) : sec.title,
      content: isEnglish ? (rawContactData === defaultContact ? sec.content : translateText(sec.content)) : sec.content,
      bullets: sec.bullets ? sec.bullets.map(b => isEnglish ? (rawContactData === defaultContact ? b : translateText(b)) : b) : undefined
    }))
  };

  return (
    <div className="space-y-6 pb-10">
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
            <PhoneCall className="w-7 h-7 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
            {contactData.bannerTitle || (isEnglish ? 'Contact Us' : 'संपर्क करें')}
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            {contactData.bannerSubtitle || (isEnglish ? 'We are always here to assist you' : 'हम आपकी सहायता के लिए सदैव उपलब्ध हैं')}
          </p>

          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-medium text-green-100 mt-2">
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            <span>{isEnglish ? 'Working Hours: ' : 'कार्य समय: '}{contactData.timings || (isEnglish ? '08:00 AM to 08:00 PM Daily' : 'सुबह 8:00 से शाम 8:00 तक')}</span>
          </div>
        </div>
      </motion.div>

      {/* Main Direct Channels Grid */}
      <div className="grid grid-cols-2 gap-3">
        <a 
          href={`tel:${(contactData.phone || '8982338046').replace(/\D/g, '')}`}
          className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-100 flex flex-col items-center text-center gap-2 hover:border-[#2D5A27] hover:shadow-md transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#2D5A27] flex items-center justify-center group-hover:bg-[#2D5A27] group-hover:text-white transition-colors">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{isEnglish ? 'Call Helpline' : 'कॉल हेल्पलाइन'}</p>
            <p className="text-sm font-black text-[#4A3728] mt-0.5">{contactData.phone || '8982338046'}</p>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full mt-1">
            {isEnglish ? 'Call Now' : 'त्वरित बात करें'}
          </span>
        </a>

        <a 
          href={`https://wa.me/91${(contactData.whatsapp || '8982338046').replace(/\D/g, '')}?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-100 flex flex-col items-center text-center gap-2 hover:border-emerald-500 hover:shadow-md transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{isEnglish ? 'WhatsApp Chat' : 'WhatsApp चैट'}</p>
            <p className="text-sm font-black text-[#4A3728] mt-0.5">{contactData.whatsapp || '8982338046'}</p>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full mt-1">
            {isEnglish ? 'Message 24x7' : '24x7 मैसेज भेजें'}
          </span>
        </a>
      </div>

      {/* Store Location Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4"
      >
        <div className="flex items-center gap-2 text-[#2D5A27] font-bold">
          <MapPin className="w-5 h-5 text-[#2D5A27]" />
          <h2 className="text-base font-black text-[#4A3728]">{isEnglish ? 'Store & Office Address' : 'दुकान व कार्यालय का पता'}</h2>
        </div>

        <div className="bg-[#F5F2ED]/60 p-4 rounded-2xl border border-[#4A3728]/10 space-y-2 text-xs">
          <p className="font-black text-sm text-[#4A3728]">{branding.name}</p>
          <p className="text-gray-700 font-bold leading-relaxed whitespace-pre-line">
            {contactData.address}
          </p>
        </div>

        <a 
          href="https://maps.google.com/?q=Shamgarh,Mandsaur,Madhya+Pradesh+458883" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-[#2D5A27] hover:bg-[#23471e] text-white py-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <Navigation className="w-4 h-4" /> {isEnglish ? 'View Directions on Google Maps' : 'Google Maps पर दिशा देखें'}
        </a>
      </motion.div>

      {/* Email & Delivery Info */}
      <div className="grid grid-cols-1 gap-3">
        {contactData.email && (
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase">{isEnglish ? 'Email Support' : 'ईमेल सपोर्ट'}</p>
              <p className="text-xs font-bold text-gray-800 break-all">{contactData.email}</p>
            </div>
          </div>
        )}

        {contactData.deliveryArea && (
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase">{isEnglish ? 'Delivery Coverage' : 'डिलीवरी क्षेत्र'}</p>
              <p className="text-xs font-bold text-gray-800">
                {contactData.deliveryArea}
              </p>
            </div>
          </div>
        )}

        {contactData.customNotes && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#2D5A27] text-white shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#2D5A27] font-extrabold uppercase">{isEnglish ? 'Special Note' : 'विशेष नोट'}</p>
              <p className="text-xs font-semibold text-[#4A3728]">
                {contactData.customNotes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Sections */}
      {contactData.sections && contactData.sections.length > 0 && (
        <div className="space-y-4">
          {contactData.sections.map((sec, idx) => (
            <motion.div
              key={sec.id || idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * idx }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
            >
              <div className="flex items-center gap-2 text-[#2D5A27]">
                <Layers className="w-5 h-5" />
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
          ))}
        </div>
      )}

      {/* Quick Navigation Footer Links */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Link 
            to="/about"
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" /> <span className="truncate">{isEnglish ? 'About Us' : 'हमारे बारे में'}</span>
          </Link>
          <Link 
            to="/terms"
            className="bg-white border border-gray-200 hover:border-amber-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" /> <span className="truncate">{isEnglish ? 'Terms & Conditions' : 'नियम एवं शर्तें'}</span>
          </Link>
          <Link 
            to="/privacy"
            className="bg-white border border-gray-200 hover:border-blue-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">{isEnglish ? 'Privacy Policy' : 'गोपनीयता नीति'}</span>
          </Link>
          <Link 
            to="/refund-policy"
            className="bg-white border border-gray-200 hover:border-rose-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" /> <span className="truncate">{isEnglish ? 'Return & Refund' : 'वापसी नीति'}</span>
          </Link>
          <Link 
            to="/disclaimer"
            className="bg-white border border-gray-200 hover:border-yellow-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" /> <span className="truncate">{isEnglish ? 'AI Disclaimer' : 'AI अस्वीकरण'}</span>
          </Link>
          <Link 
            to="/safety-guidelines"
            className="bg-white border border-gray-200 hover:border-red-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" /> <span className="truncate">{isEnglish ? 'Safety Guidelines' : 'सुरक्षा निर्देश'}</span>
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

export default ContactUs;
