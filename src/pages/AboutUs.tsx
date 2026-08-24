import React from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  UserCheck, 
  MapPin, 
  Target, 
  HeartHandshake, 
  Sprout, 
  FlaskConical, 
  ShieldCheck, 
  BookOpen, 
  Camera, 
  Bug, 
  Sparkles, 
  Newspaper, 
  ShoppingBag, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  ChevronRight,
  Info,
  FileText,
  RotateCcw,
  AlertTriangle,
  PhoneCall,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import SmartImage from '../components/SmartImage';

const AboutUs: React.FC = () => {
  const { appContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाज़ार',
    tagline: 'किसान का भरोसा, हमारी पहचान',
    logo: ''
  };

  const services = [
    {
      title: 'कृषि बीज एवं अन्य कृषि इनपुट',
      desc: 'उत्तम अंकुरण और उच्च पैदावार वाले प्रमाणित बीज एवं आवश्यक इनपुट्स',
      icon: Sprout,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      title: 'उर्वरक एवं पोषक तत्व',
      desc: 'फसल पोषण हेतु संतुलित माइक्रोन्यूट्रिएंट्स, जैविक व रासायनिक खाद',
      icon: FlaskConical,
      color: 'text-blue-700 bg-blue-50 border-blue-200'
    },
    {
      title: 'कीटनाशक, फफूंदनाशक एवं खरपतवारनाशक',
      desc: 'फसल सुरक्षा के लिए प्रभावी एवं प्रामाणिक दवाइयाँ',
      icon: ShieldCheck,
      color: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
      title: 'कृषि उत्पादों की जानकारी',
      desc: 'उत्पाद की तकनीकी सामग्री, उपयोग विधि और सही डोज की सटीक जानकारी',
      icon: BookOpen,
      color: 'text-purple-700 bg-purple-50 border-purple-200'
    },
    {
      title: 'AI आधारित पौधा/फसल जाँच',
      desc: 'कैमरे से फोटो खींचकर बीमारी व समस्या की त्वरित डिजिटल स्कैनिंग',
      icon: Camera,
      color: 'text-green-700 bg-green-50 border-green-200'
    },
    {
      title: 'रोग, कीट एवं पोषक तत्वों की संभावित पहचान',
      desc: 'लक्षणों के आधार पर फसल रोगों और कीट प्रकोप की सटीक पहचान',
      icon: Bug,
      color: 'text-rose-700 bg-rose-50 border-rose-200'
    },
    {
      title: 'AI आधारित कृषि सहायता',
      desc: '24x7 स्मार्ट कृषि सहायक और AI वॉइस कॉल से कृषि समाधान',
      icon: Sparkles,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200'
    },
    {
      title: 'कृषि समाचार एवं उपयोगी कृषि जानकारी',
      desc: 'ताजा मौसम अपडेट, मंडी भाव, सरकारी योजनाएं व वैज्ञानिक सलाह',
      icon: Newspaper,
      color: 'text-cyan-700 bg-cyan-50 border-cyan-200'
    },
    {
      title: 'ऑनलाइन उत्पाद ऑर्डर एवं डिजिटल भुगतान',
      desc: 'आसान ऑर्डरिंग, होम डिलीवरी व सुरक्षित डिजिटल पेमेंट सुविधा',
      icon: ShoppingBag,
      color: 'text-orange-700 bg-orange-50 border-orange-200'
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

        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-2 shadow-xl border-2 border-white/30">
            <SmartImage 
              src={branding.logo} 
              fallbackSrc="/icon-192.png"
              alt="Logo" 
              className="w-full h-full" 
              objectFit="contain" 
              priority
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 mb-2">
              <Info className="w-3.5 h-3.5 text-[#EAB308]" />
              <span className="text-[11px] font-bold text-white tracking-wide">हमारे बारे में (About Us)</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">{branding.name}</h1>
            <p className="text-sm font-semibold text-[#EAB308] mt-0.5">{branding.tagline}</p>
          </div>
        </div>
      </motion.div>

      {/* Main Introduction Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27] font-bold">
          <Building2 className="w-5 h-5 text-[#2D5A27]" />
          <h2 className="text-base font-black text-[#4A3728]">परिचय (Introduction)</h2>
        </div>

        <div className="space-y-3 text-sm text-gray-700 leading-relaxed font-normal">
          <p>
            <strong className="text-[#2D5A27] font-bold">फल्सावदिया कृषि बाजार (Falsawdiya Krishi Bazaar)</strong> एक कृषि-केंद्रित डिजिटल प्लेटफॉर्म और ऑनलाइन कृषि इनपुट स्टोर है, जिसका उद्देश्य किसानों को खेती से जुड़े आवश्यक उत्पाद, जानकारी और डिजिटल कृषि सुविधाएँ एक ही स्थान पर उपलब्ध कराना है।
          </p>
          <p>
            हमारा उद्देश्य किसानों के लिए कृषि इनपुट की खरीद को आसान, सुविधाजनक और पारदर्शी बनाना है। हमारे प्लेटफॉर्म के माध्यम से किसान कृषि से संबंधित विभिन्न उत्पादों को देख सकते हैं, उनकी जानकारी प्राप्त कर सकते हैं और उपलब्ध उत्पादों के लिए ऑनलाइन ऑर्डर कर सकते हैं।
          </p>
        </div>
      </motion.div>

      {/* Services Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-6 bg-[#2D5A27] rounded-full" />
            <h2 className="text-lg font-black text-[#4A3728]">हमारी सेवाएँ</h2>
          </div>
          <span className="text-xs text-[#2D5A27] font-extrabold bg-[#2D5A27]/10 px-2.5 py-0.5 rounded-full">
            {services.length} मुख्य सुविधाएँ
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {services.map((srv, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * idx }}
              className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex items-start gap-3.5 hover:border-[#2D5A27]/30 transition-all"
            >
              <div className={`p-2.5 rounded-2xl shrink-0 border ${srv.color}`}>
                <srv.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-[#4A3728] leading-tight">
                  {srv.title}
                </h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-normal font-medium">
                  {srv.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Our Mission / हमारा उद्देश्य */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-emerald-50/80 rounded-3xl p-6 border-2 border-[#2D5A27]/20 shadow-xs relative overflow-hidden"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#2D5A27] text-white flex items-center justify-center shadow-sm">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-[#2D5A27]">हमारा उद्देश्य</h2>
        </div>
        <p className="text-sm font-semibold text-[#4A3728] leading-relaxed italic bg-white/80 p-4 rounded-2xl border border-emerald-100 shadow-2xs">
          “हमारा उद्देश्य तकनीक और कृषि ज्ञान का उपयोग करके किसानों को बेहतर निर्णय लेने में सहायता करना और कृषि उत्पादों की खरीद को अधिक सरल बनाना है।”
        </p>
      </motion.div>

      {/* Identity & Ownership / हमारी पहचान */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-9 h-9 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
            <Building2 className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-[#4A3728]">हमारी पहचान</h2>
        </div>

        <div className="space-y-3.5 bg-[#F5F2ED]/60 p-4 rounded-2xl border border-[#4A3728]/10 text-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-[#4A3728] text-sm">फल्सावदिया कृषि बाजार</p>
              <p className="text-gray-500 font-medium mt-0.5">Falsawdiya Krishi Bazaar</p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t border-gray-200/60">
            <UserCheck className="w-4 h-4 text-[#2D5A27] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-500">स्वामित्व (Ownership):</p>
              <p className="font-extrabold text-[#4A3728] text-sm mt-0.5">यश फल्सावदिया (Proprietorship)</p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t border-gray-200/60">
            <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-500">पता (Address):</p>
              <p className="font-bold text-[#4A3728] leading-relaxed mt-0.5">
                डिंपल चौराहा,<br />
                क्षत्रिय खाती मांगलिक भवन के पास,<br />
                शामगढ़, जिला मंदसौर,<br />
                मध्य प्रदेश – 458883
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <a 
            href="tel:8982338046"
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

      {/* Our Effort for Farmers / किसानों के लिए हमारा प्रयास */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3"
      >
        <div className="flex items-center gap-2.5 text-[#2D5A27]">
          <div className="w-9 h-9 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-[#4A3728]">किसानों के लिए हमारा प्रयास</h2>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed font-normal">
          <strong className="font-bold text-[#2D5A27]">Falsawdiya Krishi Bazaar</strong> का मुख्य उद्देश्य और निरंतर प्रयास किसानों को उच्च गुणवत्ता वाले कृषि उत्पाद (Agricultural Products), उपयोगी एवं व्यावहारिक कृषि जानकारी (Useful Agricultural Information) और आधुनिक तकनीक-आधारित टूल्स (Technology-based Tools) एक ही डिजिटल प्लेटफॉर्म पर उपलब्ध कराना है, जिससे खेती से जुड़े दैनिक निर्णयों और कृषि आदानों की खरीदारी को अधिक सुगम, सटीक और समयबद्ध बनाया जा सके।
        </p>
      </motion.div>

      {/* Quick Navigation Footer Links */}
      <div className="pt-2 flex flex-col gap-2">
        <Link 
          to="/products"
          className="w-full bg-[#2D5A27] text-white py-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <ShoppingBag className="w-4 h-4" /> कृषि बाजार एवं उत्पाद देखें <ChevronRight className="w-4 h-4" />
        </Link>
        <div className="grid grid-cols-2 gap-2">
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

export default AboutUs;
