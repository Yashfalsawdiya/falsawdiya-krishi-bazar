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
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const PrivacyPolicy: React.FC = () => {
  const { appContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

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

          <h1 className="text-2xl font-black tracking-tight text-white">Privacy Policy</h1>
          <p className="text-sm font-semibold text-[#EAB308]">गोपनीयता नीति</p>

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
          <strong className="text-[#2D5A27] font-bold">{branding.name}</strong> आपकी privacy को महत्व देता है। यह Privacy Policy बताती है कि जब आप हमारे app, website या digital services का उपयोग करते हैं तो हम आपकी जानकारी को किस प्रकार collect, use और protect कर सकते हैं।
        </p>
      </motion.div>

      {/* Section 1 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3.5"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center border border-emerald-100 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-[#4A3728]">
            1. हम कौन-सी जानकारी collect कर सकते हैं?
          </h2>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed font-normal">
          जब आप account बनाते हैं, product order करते हैं या हमारी services का उपयोग करते हैं, तो आवश्यकता के अनुसार निम्न जानकारी collect की जा सकती है:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          {[
            'नाम (Name)',
            'मोबाइल नंबर (Mobile Number)',
            'Email address',
            'Delivery address (पता)',
            'PIN code',
            'Order details (ऑर्डर विवरण)',
            'Payment/transaction related information',
            'Customer support communication',
            'Device/app related technical information'
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-[#F5F2ED]/60 px-3 py-2 rounded-xl text-gray-700 font-medium border border-[#4A3728]/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27] shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100/80 text-xs text-[#2D5A27] leading-relaxed">
          <p className="font-semibold">
            यदि user AI-based features का उपयोग करता है, तो user द्वारा voluntarily upload की गई plant/crop images और उनसे संबंधित information भी AI analysis के लिए process की जा सकती है।
          </p>
        </div>
      </motion.div>

      {/* Section 2 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3.5"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-[#4A3728]">
            2. आपकी जानकारी का उपयोग क्यों किया जाता है?
          </h2>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed font-normal">
          Information का उपयोग निम्नलिखित कार्यों हेतु किया जाता है:
        </p>

        <ul className="space-y-2 text-xs text-gray-700">
          {[
            'Account बनाने और manage करने के लिए',
            'Orders process करने के लिए',
            'Payment verification के लिए',
            'Products deliver करने के लिए',
            'Order status और service-related communication के लिए',
            'Customer support देने के लिए',
            'Fraud और unauthorized transactions detect करने के लिए',
            'App और services improve करने के लिए',
            'AI-based agricultural features operate करने के लिए'
          ].map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[#2D5A27] font-bold text-xs mt-0.5">•</span>
              <span className="font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Section 3 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-[#4A3728]">
            3. Payment Information
          </h2>
        </div>

        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            Online payments authorised third-party payment gateway के माध्यम से process किए जा सकते हैं।
          </p>
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60 font-semibold text-amber-900">
            हम UPI PIN, card PIN या banking password जैसी sensitive payment credentials को unnecessarily collect या store नहीं करते।
          </div>
        </div>
      </motion.div>

      {/* Section 4 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-[#4A3728]">
            4. AI Features और Uploaded Photos
          </h2>
        </div>

        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            AI features plant/crop images और user-provided information का analysis करके संभावित disease, pest, nutrient deficiency या अन्य plant-related issues की जानकारी प्रदान कर सकते हैं।
          </p>
          <p className="bg-purple-50/60 p-3 rounded-2xl border border-purple-100 text-purple-900 font-medium">
            Uploaded images का उपयोग AI analysis और संबंधित service प्रदान करने के लिए किया जा सकता है।
          </p>
        </div>
      </motion.div>

      {/* Section 5 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100 shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-[#4A3728]">
            5. Third-Party Services
          </h2>
        </div>

        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            हम payment gateway, hosting, analytics, communication, delivery या अन्य आवश्यक technology/service providers का उपयोग कर सकते हैं।
          </p>
          <p className="text-gray-500">
            ऐसे third-party services अपने applicable terms और privacy policies के अनुसार information process कर सकते हैं।
          </p>
        </div>
      </motion.div>

      {/* Section 6 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center border border-emerald-100 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-[#4A3728]">
            6. Data Security
          </h2>
        </div>

        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            हम personal information को unauthorized access, misuse, alteration या disclosure से बचाने के लिए reasonable security measures अपनाने का प्रयास करते हैं।
          </p>
          <p className="text-gray-500 italic bg-gray-50 p-3 rounded-2xl border border-gray-100">
            हालाँकि internet transmission या electronic storage का कोई भी तरीका पूर्णतः secure होने की guarantee नहीं दी जा सकती।
          </p>
        </div>
      </motion.div>

      {/* Section 7 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-[#4A3728]">
            7. Your Choices
          </h2>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed">
          जहाँ applicable हो, user अपनी personal information को access, update या delete करने के लिए हमसे संपर्क कर सकता है।
        </p>

        <div className="p-4 bg-emerald-50/80 rounded-2xl border border-[#2D5A27]/20 space-y-2.5 text-xs">
          <p className="font-bold text-[#2D5A27]">Privacy/data-related requests के लिए संपर्क:</p>
          
          <div className="space-y-2 text-gray-800">
            <a 
              href="mailto:yashfalsawdiya36@gmail.com"
              className="flex items-center gap-2 font-medium text-blue-700 hover:underline"
            >
              <Mail className="w-4 h-4 text-[#2D5A27]" />
              <span>Email: yashfalsawdiya36@gmail.com</span>
            </a>
            
            <a 
              href="https://wa.me/918982338046?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-medium text-emerald-700 hover:underline"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Phone/WhatsApp: 8982338046</span>
            </a>
          </div>
        </div>
      </motion.div>

      {/* Section 8 */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="text-base font-extrabold text-[#4A3728]">
            8. Policy Changes
          </h2>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed">
          हम आवश्यकता के अनुसार Privacy Policy update कर सकते हैं। Updated version app/website पर publish की जाएगी।
        </p>
      </motion.div>

      {/* Navigation Footer */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
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

export default PrivacyPolicy;
