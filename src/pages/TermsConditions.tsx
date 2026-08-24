import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Clock, 
  Store, 
  UserCheck, 
  Package, 
  Tag, 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  AlertTriangle, 
  Sparkles, 
  Ban, 
  Copyright, 
  ShieldAlert, 
  Scale,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  PhoneCall
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const TermsConditions: React.FC = () => {
  const { appContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाज़ार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const sections = [
    {
      id: 1,
      title: '1. About the Platform (प्लेटफॉर्म के बारे में)',
      icon: Store,
      color: 'bg-emerald-50 text-[#2D5A27] border-emerald-100',
      content: (
        <p className="text-xs text-gray-700 leading-relaxed">
          फल्सावदिया कृषि बाजार एक agricultural digital platform है जिसके माध्यम से users agricultural products की जानकारी देख सकते हैं और उपलब्ध products को online order कर सकते हैं।
        </p>
      )
    },
    {
      id: 2,
      title: '2. User Account (यूजर खाता)',
      icon: UserCheck,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>यदि किसी feature के लिए account आवश्यक है, तो user को अपनी information सही और updated रखनी होगी।</p>
          <p className="font-semibold text-[#4A3728]">अपने account और login credentials की security की जिम्मेदारी user की होगी।</p>
        </div>
      )
    },
    {
      id: 3,
      title: '3. Product Information (उत्पाद जानकारी)',
      icon: Package,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>हम product information को सही और updated रखने का प्रयास करते हैं। Product packaging, formulation, availability, batch या manufacturer द्वारा किए गए बदलावों के कारण कुछ details बदल सकती हैं।</p>
          <p className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60 font-semibold text-amber-900">
            Agricultural products का उपयोग हमेशा approved label, packaging instructions और applicable laws के अनुसार किया जाना चाहिए।
          </p>
        </div>
      )
    },
    {
      id: 4,
      title: '4. Prices (मूल्य एवं दरें)',
      icon: Tag,
      color: 'bg-green-50 text-green-700 border-green-100',
      content: (
        <ul className="space-y-1.5 text-xs text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-[#2D5A27] font-bold">•</span>
            <span>सभी prices भारतीय रुपये (₹) में दिखाई जाएँगी।</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#2D5A27] font-bold">•</span>
            <span>Prices और product availability बिना prior notice के बदल सकती हैं।</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#2D5A27] font-bold">•</span>
            <span>Order confirmation के समय applicable price order के लिए मान्य होगी।</span>
          </li>
        </ul>
      )
    },
    {
      id: 5,
      title: '5. Online Orders (ऑनलाइन ऑर्डर)',
      icon: ShoppingCart,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>Order place करने के बाद order processing के लिए लिया जाएगा।</p>
          <p>Order confirmation product availability, payment confirmation और applicable verification पर निर्भर हो सकता है।</p>
          <p className="text-purple-900 font-medium bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
            Product unavailable होने की स्थिति में order cancel/refund किया जा सकता है।
          </p>
        </div>
      )
    },
    {
      id: 6,
      title: '6. Online Payment (ऑनलाइन भुगतान)',
      icon: CreditCard,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>Online payment authorised payment gateway के माध्यम से process किया जा सकता है।</p>
          <p>Payment successful दिखाई देने मात्र से order automatically confirmed नहीं माना जाएगा जब तक payment verification successfully complete न हो।</p>
          <p className="text-red-700 font-semibold bg-red-50/60 p-2.5 rounded-xl border border-red-100">
            Suspicious, failed, duplicate या unverifiable transaction की स्थिति में order hold या cancel किया जा सकता है।
          </p>
        </div>
      )
    },
    {
      id: 7,
      title: '7. Delivery (डिलिवरी नियम व शुल्क)',
      icon: Truck,
      color: 'bg-emerald-50 text-[#2D5A27] border-emerald-100',
      content: (
        <div className="space-y-2.5 text-xs text-gray-700">
          <p className="font-semibold text-[#2D5A27]">Current delivery availability Madhya Pradesh में है।</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-[#F5F2ED] p-3 rounded-2xl border border-[#4A3728]/10">
              <span className="font-bold text-[#4A3728] block">Shamgarh Delivery:</span>
              <span className="text-sm font-extrabold text-[#2D5A27]">₹40 / order</span>
            </div>
            <div className="bg-[#F5F2ED] p-3 rounded-2xl border border-[#4A3728]/10">
              <span className="font-bold text-[#4A3728] block">Out-of-Town / Rural Delivery:</span>
              <span className="text-sm font-extrabold text-[#2D5A27]">₹40 – ₹80</span>
              <span className="text-[10px] text-gray-500 block font-medium">location और distance के अनुसार</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-normal">
            Expected delivery time location, availability, delivery partner और अन्य परिस्थितियों पर निर्भर कर सकता है।
          </p>
        </div>
      )
    },
    {
      id: 8,
      title: '8. Agricultural Product Usage (कृषि उत्पादों का उपयोग)',
      icon: AlertTriangle,
      color: 'bg-rose-50 text-rose-700 border-rose-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            Agricultural inputs का उपयोग केवल intended agricultural purpose, approved label directions और applicable regulations के अनुसार किया जाना चाहिए।
          </p>
          <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200/60 font-semibold text-rose-900">
            गलत dosage, crop, mixing या application method से होने वाले नुकसान के लिए user जिम्मेदार हो सकता है।
          </div>
        </div>
      )
    },
    {
      id: 9,
      title: '9. AI Agricultural Features (AI कृषि सुविधाएँ)',
      icon: Sparkles,
      color: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>AI features informational/support purposes के लिए हैं।</p>
          <p>
            AI द्वारा दिया गया disease, pest, nutrient deficiency, treatment, dosage या अन्य agricultural analysis 100% accurate होने की guarantee नहीं रखता।
          </p>
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[#2D5A27] font-semibold">
            गंभीर crop problem या high-value crop treatment के मामले में qualified agricultural expert/official recommendation से verification करना चाहिए।
          </div>
        </div>
      )
    },
    {
      id: 10,
      title: '10. Prohibited Use (प्रतिबंधित गतिविधियाँ)',
      icon: Ban,
      color: 'bg-red-50 text-red-700 border-red-100',
      content: (
        <p className="text-xs text-gray-700 leading-relaxed">
          Platform का उपयोग illegal activities, fraudulent transactions, unauthorized access, harmful activity या किसी अन्य व्यक्ति के rights/privacy के उल्लंघन के लिए नहीं किया जा सकता।
        </p>
      )
    },
    {
      id: 11,
      title: '11. Intellectual Property (बौद्धिक संपदा अधिकार)',
      icon: Copyright,
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      content: (
        <p className="text-xs text-gray-700 leading-relaxed">
          App/website का logo, branding, design, original text, graphics, software और proprietary content बिना permission reproduce, copy या commercially use नहीं किया जा सकता।
        </p>
      )
    },
    {
      id: 12,
      title: '12. Limitation of Liability (दायित्व की सीमा)',
      icon: ShieldAlert,
      color: 'bg-orange-50 text-orange-700 border-orange-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            हम platform को reliable और useful बनाए रखने का प्रयास करते हैं, लेकिन uninterrupted या error-free operation की पूर्ण guarantee नहीं देते।
          </p>
          <p className="text-gray-500 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            Network failure, payment gateway failure, server issues, third-party service failure या reasonable control से बाहर circumstances के लिए applicable law के अनुसार liability सीमित हो सकती है।
          </p>
        </div>
      )
    },
    {
      id: 13,
      title: '13. Governing Law (लागू कानून व न्यायक्षेत्र)',
      icon: Scale,
      color: 'bg-blue-50 text-blue-800 border-blue-100',
      content: (
        <p className="text-xs text-gray-700 leading-relaxed font-semibold">
          इन Terms पर भारत के applicable laws लागू होंगे।
        </p>
      )
    }
  ];

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
            <FileText className="w-8 h-8 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white">Terms & Conditions</h1>
          <p className="text-sm font-semibold text-[#EAB308]">नियम एवं शर्तें</p>

          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-medium text-green-100 mt-2">
            <Clock className="w-3.5 h-3.5 text-yellow-300" />
            <span>अंतिम अपडेट: 24 August 2026</span>
          </div>
        </div>
      </motion.div>

      {/* Introduction Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3 text-sm text-gray-700 leading-relaxed"
      >
        <p className="font-normal">
          <strong className="text-[#2D5A27] font-bold">{branding.name}</strong> के app/website का उपयोग करके user इन Terms & Conditions से सहमत होता है।
        </p>
      </motion.div>

      {/* Terms Sections */}
      <div className="space-y-3.5">
        {sections.map((sec, idx) => (
          <motion.div
            key={sec.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * idx }}
            className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-3"
          >
            <div className="flex items-center gap-2.5 text-[#2D5A27]">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${sec.color}`}>
                <sec.icon className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-black text-[#4A3728] leading-tight">
                {sec.title}
              </h2>
            </div>
            {sec.content}
          </motion.div>
        ))}
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
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
            to="/about"
            className="bg-white border border-gray-200 hover:border-[#2D5A27] text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <span className="truncate">हमारे बारे में</span>
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
          मुख्य पृष्ठ (Home) पर वापस जाएं
        </Link>
      </div>
    </div>
  );
};

export default TermsConditions;
