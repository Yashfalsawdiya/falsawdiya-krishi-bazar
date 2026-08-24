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
  Send,
  Navigation,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  HelpCircle,
  Package,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const ContactUs: React.FC = () => {
  const { appContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाज़ार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
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
            संपर्क करें
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            हम आपकी सहायता के लिए उपलब्ध हैं
          </p>
        </div>
      </motion.div>

      {/* Intro Message Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-2 text-sm text-gray-700 leading-relaxed"
      >
        <p className="font-medium text-gray-800">
          यदि आपको हमारे products, orders, payments, delivery, returns या किसी अन्य service से संबंधित कोई प्रश्न है, तो आप हमसे सीधे संपर्क कर सकते हैं।
        </p>
      </motion.div>

      {/* Quick Action Buttons (Call, WhatsApp, Email) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-2.5"
      >
        <a 
          href="tel:8982338046"
          className="flex flex-col items-center justify-center py-3.5 px-2 bg-[#2D5A27] text-white rounded-2xl shadow-sm hover:bg-[#24481f] active:scale-95 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <Phone className="w-4 h-4" />
          </div>
          <span className="text-xs font-black">कॉल करें</span>
          <span className="text-[10px] text-white/80 font-medium">8982338046</span>
        </a>

        <a 
          href="https://wa.me/918982338046?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार,%20मुझे%20सहायता%20चाहिए"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center py-3.5 px-2 bg-emerald-600 text-white rounded-2xl shadow-sm hover:bg-emerald-700 active:scale-95 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <MessageCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-black">WhatsApp</span>
          <span className="text-[10px] text-white/80 font-medium">तुरंत चैट करें</span>
        </a>

        <a 
          href="mailto:yashfalsawdiya36@gmail.com?subject=Inquiry%20from%20Falsawdiya%20Krishi%20Bazaar"
          className="flex flex-col items-center justify-center py-3.5 px-2 bg-blue-600 text-white rounded-2xl shadow-sm hover:bg-blue-700 active:scale-95 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
            <Mail className="w-4 h-4" />
          </div>
          <span className="text-xs font-black">Email</span>
          <span className="text-[10px] text-white/80 font-medium truncate max-w-full px-1">भेजें</span>
        </a>
      </motion.div>

      {/* Main Contact Details Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-4"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#4A3728]">संपर्क विवरण (Contact Card)</h2>
            <p className="text-[11px] text-gray-500 font-medium">सीधा संपर्क व कार्यालय समय</p>
          </div>
        </div>

        {/* Contact Info Items */}
        <div className="space-y-3.5 text-xs">
          {/* Phone / WhatsApp */}
          <div className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100/80">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
              <Phone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-gray-500 text-[11px] font-bold block">मोबाइल / WhatsApp</span>
              <a href="tel:8982338046" className="font-extrabold text-[#2D5A27] text-sm tracking-wide hover:underline">
                8982338046
              </a>
            </div>
            <a 
              href="https://wa.me/918982338046?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shrink-0 self-center"
            >
              चैट
            </a>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3 p-3 bg-blue-50/60 rounded-2xl border border-blue-100/80">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-gray-500 text-[11px] font-bold block">ईमेल (Email)</span>
              <a href="mailto:yashfalsawdiya36@gmail.com" className="font-bold text-blue-800 text-xs break-all hover:underline">
                yashfalsawdiya36@gmail.com
              </a>
            </div>
          </div>

          {/* Business Hours */}
          <div className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100/80">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-gray-500 text-[11px] font-bold block">Business Hours (कार्य समय)</span>
              <p className="font-bold text-[#4A3728] mt-0.5">
                प्रतिदिन: सुबह 08:00 बजे से शाम 08:00 बजे तक
              </p>
            </div>
          </div>

          {/* Delivery Hours */}
          <div className="flex items-start gap-3 p-3 bg-purple-50/60 rounded-2xl border border-purple-100/80">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 mt-0.5">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-gray-500 text-[11px] font-bold block">Delivery Hours (डिलीवरी समय)</span>
              <p className="font-bold text-[#4A3728] mt-0.5">
                सुबह 10:00 बजे से शाम 06:00 बजे तक
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200/70">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5 border border-red-100">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-gray-500 text-[11px] font-bold block">हमारा पता (Our Address)</span>
              <div className="font-extrabold text-[#4A3728] text-xs leading-relaxed mt-1">
                <p className="text-[#2D5A27] text-sm font-black">{branding.name}</p>
                <p>डिंपल चौराहा,</p>
                <p>क्षत्रिय खाती मांगलिक भवन के पास,</p>
                <p>शामगढ़, जिला मंदसौर,</p>
                <p>मध्य प्रदेश – 458883, India</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Section: Delivery Area */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center border border-emerald-100">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#4A3728]">Delivery Area (डिलीवरी क्षेत्र)</h2>
            <p className="text-[11px] text-gray-500 font-medium">सेवा उपलब्धता की जानकारी</p>
          </div>
        </div>

        <div className="text-xs text-gray-700 leading-relaxed bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/70">
          <p className="font-medium text-emerald-950">
            वर्तमान में online delivery <strong className="font-bold text-[#2D5A27]">मध्य प्रदेश</strong> में उपलब्ध होगी। Delivery availability PIN code, location और serviceability पर निर्भर कर सकती है।
          </p>
        </div>
      </motion.div>

      {/* Section: Delivery Charges */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#4A3728]">Delivery Charges (डिलीवरी शुल्क)</h2>
            <p className="text-[11px] text-gray-500 font-medium">स्थान व दूरी के अनुसार शुल्क तालिका</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Shamgarh */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-black text-gray-900 text-sm">Shamgarh (शामगढ़)</span>
              <span className="px-2.5 py-1 bg-[#2D5A27] text-white rounded-xl font-black text-xs">₹40</span>
            </div>
            <p className="text-gray-500 text-[11px] font-medium pt-1">
              ₹40 प्रति order
            </p>
          </div>

          {/* Out-of-Town / Rural Areas */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-black text-gray-900 text-sm">Out-of-Town / Rural Areas</span>
              <span className="px-2.5 py-1 bg-amber-600 text-white rounded-xl font-black text-xs">₹40 - ₹80</span>
            </div>
            <p className="text-gray-500 text-[11px] font-medium pt-1">
              ₹40 से ₹80, location और distance के अनुसार।
            </p>
          </div>
        </div>
      </motion.div>

      {/* Policy & Information Quick Links */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Link 
            to="/about"
            className="bg-white border border-gray-200 hover:border-[#2D5A27] text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <Info className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" /> <span className="truncate">हमारे बारे में</span>
          </Link>
          <Link 
            to="/safety-guidelines"
            className="bg-white border border-gray-200 hover:border-red-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" /> <span className="truncate">सुरक्षा निर्देश</span>
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
            to="/privacy"
            className="bg-white border border-gray-200 hover:border-blue-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">गोपनीयता नीति</span>
          </Link>
          <Link 
            to="/terms"
            className="bg-white border border-gray-200 hover:border-amber-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" /> <span className="truncate">नियम एवं शर्तें</span>
          </Link>
        </div>
        <Link 
          to="/"
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors text-center"
        >
          मुख्य पृष्ठ (Home) पर वापस जाएं
        </Link>
      </div>
    </div>
  );
};

export default ContactUs;
