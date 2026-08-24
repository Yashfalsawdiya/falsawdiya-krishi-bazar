import React from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  Sparkles, 
  Images, 
  FlaskConical, 
  Pill, 
  HelpCircle, 
  UserCheck, 
  Flame, 
  MessageSquare, 
  ChevronRight,
  ShieldCheck,
  FileText,
  RotateCcw,
  Info,
  PhoneCall,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const AiDisclaimer: React.FC = () => {
  const { appContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const sections = [
    {
      id: 1,
      title: '1. AI Disease & Plant Analysis (रोग एवं पौधा जाँच)',
      icon: Sparkles,
      color: 'bg-emerald-50 text-[#2D5A27] border-emerald-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            हमारा AI Scan पौधे या फसल की uploaded images का analysis करके संभावित disease, pest, fungal infection, nutrient deficiency या अन्य plant-related problems की संभावित पहचान कर सकता है।
          </p>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 font-semibold">
            AI analysis को final laboratory diagnosis या certified agricultural diagnosis नहीं माना जाना चाहिए।
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: '2. Multiple Photo Analysis (एकाधिक फोटो विश्लेषण)',
      icon: Images,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            यदि user एक ही पौधे की multiple photos upload करता है, तो AI उपलब्ध images को combined context में analyse करने का प्रयास करता है।
          </p>
          <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium">
            Analysis की accuracy photo quality, lighting, symptoms visibility, crop stage और उपलब्ध information पर निर्भर करती है।
          </p>
        </div>
      )
    },
    {
      id: 3,
      title: '3. Nutrient Deficiency Detection (पोषक तत्वों की कमी की पहचान)',
      icon: FlaskConical,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            AI संभावित nutrient deficiency जैसे major या micronutrient deficiency के visible symptoms identify करने का प्रयास कर सकता है।
          </p>
          <p className="font-semibold text-[#4A3728]">
            केवल image analysis के आधार पर nutrient deficiency को final confirmed diagnosis नहीं माना जाना चाहिए।
          </p>
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[#2D5A27] font-semibold">
            जहाँ आवश्यक हो वहाँ soil test, plant tissue test या qualified agricultural expert की सलाह लेना उचित है।
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: '4. Product & Dosage Information (उत्पाद व खुराक जानकारी)',
      icon: Pill,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            किसी agricultural product का उपयोग हमेशा उसके approved label, packaging instructions और applicable agricultural recommendations के अनुसार किया जाना चाहिए।
          </p>
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 font-semibold">
            AI द्वारा दिए गए dosage या application suggestions को बिना verification के blindly follow न करें।
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: '5. Accuracy (सटीकता की सीमा)',
      icon: HelpCircle,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>AI-generated information में errors या inaccuracies संभव हैं।</p>
          <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium">
            Crop, disease, pest, nutrient deficiency या treatment की पहचान हमेशा 100% accurate होने की guarantee नहीं दी जाती।
          </p>
        </div>
      )
    },
    {
      id: 6,
      title: '6. User Responsibility (उपयोगकर्ता की जिम्मेदारी)',
      icon: UserCheck,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            किसी agricultural input का उपयोग करने से पहले product label, approved instructions और आवश्यक professional/official guidance को प्राथमिकता दें।
          </p>
          <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 font-semibold text-amber-950">
            गलत product, गलत dosage, गलत crop या गलत application method के उपयोग से होने वाले नुकसान के लिए user को उचित सावधानी बरतनी चाहिए।
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: '7. Emergency / Serious Crop Damage (गंभीर फसल क्षति)',
      icon: Flame,
      color: 'bg-rose-50 text-rose-700 border-rose-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 font-semibold">
            यदि crop में गंभीर disease, pest attack, toxicity या widespread damage दिखाई दे रहा हो, तो qualified agriculture professional, कृषि अधिकारी, कृषि विशेषज्ञ या relevant laboratory से सलाह लेने की recommendation है।
          </div>
        </div>
      )
    },
    {
      id: 8,
      title: '8. AI Chat (AI चैट परामर्श)',
      icon: MessageSquare,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            AI Chat feature uploaded images और generated report के context में सामान्य agricultural questions का उत्तर देने के लिए है।
          </p>
          <p className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 text-purple-950 font-semibold">
            इसके responses को professional agricultural consultation का replacement नहीं माना जाना चाहिए।
          </p>
        </div>
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
            <AlertTriangle className="w-8 h-8 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
            कृषि एवं AI Disclaimer
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            महत्वपूर्ण सूचना
          </p>
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
          <strong className="text-[#2D5A27] font-bold">{branding.name}</strong> पर उपलब्ध agricultural information, AI-based analysis और recommendations किसानों को सामान्य informational और decision-support सहायता प्रदान करने के उद्देश्य से हैं।
        </p>
      </motion.div>

      {/* Disclaimer Sections */}
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
          <Link 
            to="/refund-policy"
            className="bg-white border border-gray-200 hover:border-rose-300 text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" /> <span className="truncate">वापसी नीति</span>
          </Link>
          <Link 
            to="/about"
            className="bg-white border border-gray-200 hover:border-[#2D5A27] text-gray-700 py-2.5 px-2 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors text-center shadow-xs"
          >
            <Info className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" /> <span className="truncate">हमारे बारे में</span>
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

export default AiDisclaimer;
