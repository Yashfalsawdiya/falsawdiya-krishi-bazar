import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Eye, 
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
  Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const ChemicalSafety: React.FC = () => {
  const { appContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const safetyRules = [
    {
      id: 1,
      title: '1. उत्पाद चयन एवं लेबल पढ़ना (Read Product Label)',
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      points: [
        'अनुमोदित उपयोग: केवल उन्हीं फसलों, कीटों और बीमारियों पर उपयोग करें जिनके लिए उत्पाद CIBRC/कंपनी द्वारा लेबल पर अनुमोदित (Approved) है।',
        'सही खुराक (Dosage): उत्पाद के पैकेट या बोतल पर दी गई सही खुराक का ही उपयोग करें। अधिक मात्रा से फसल जल सकती है (Phytotoxicity)।',
        'एक्सपायरी व सील: उपयोग से पहले निर्माण तिथि (MFG), एक्सपायरी तिथि (EXP) और सुरक्षा सील अवश्य जांचें।'
      ]
    },
    {
      id: 2,
      title: '2. व्यक्तिगत सुरक्षा उपकरण (Personal Protective Equipment - PPE)',
      icon: Glasses,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      points: [
        'चेहरा व आँखें: फेस मास्क या साफ रुमाल और सुरक्षात्मक चश्मा (Safety Goggles) अवश्य लगाएं।',
        'हाथ व पैर: रबर के रासायनिक प्रतिरोधी दस्ताने (Gloves) और गमबूट (Gumboots) पहनें।',
        'शरीर की सुरक्षा: पूरी आस्तीन के कपड़े (Full Shirt & Pants) पहनें। छिड़काव के दौरान कपड़े कभी भी भीगने न दें।'
      ]
    },
    {
      id: 3,
      title: '3. घोल तैयार करते समय सावधानियां (Preparing Spray Solution)',
      icon: Droplets,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      points: [
        'घोल हमेशा खुले, सुरक्षित और पर्याप्त हवादार स्थान पर ही बनाएं।',
        'दवा को पानी में मिलाने के लिए लकड़ी की डंडी या प्लास्टिक चम्मच का उपयोग करें; कभी भी नंगे हाथों से न मिलाएं।',
        'टैंक मिक्स (Tank Mix) करते समय दवाओं की अनुकूलता (Compatibility) जांचें, असंगत दवाओं को एक साथ न मिलाएं।'
      ]
    },
    {
      id: 4,
      title: '4. छिड़काव के समय ध्यान देने योग्य बातें (During Spraying)',
      icon: Wind,
      color: 'bg-teal-50 text-teal-800 border-teal-200',
      points: [
        'उचित समय: छिड़काव हमेशा सुबह जल्दी या शाम के समय करें। तेज धूप या दोपहर में छिड़काव से बचें।',
        'हवा की दिशा: कभी भी हवा के विपरीत (Against the Wind) छिड़काव न करें, ताकि दवा शरीर पर न आए।',
        'खान-पान निषेध: छिड़काव करते समय या दवा छूने के बाद धूम्रपान, तंबाकू, बीड़ी, चाय या भोजन का सेवन बिल्कुल न करें।'
      ]
    },
    {
      id: 5,
      title: '5. सुरक्षित भंडारण (Safe Storage & Child Safety)',
      icon: Lock,
      color: 'bg-purple-50 text-purple-800 border-purple-200',
      points: [
        'मूल डिब्बे में रखें: दवाओं को हमेशा कंपनी के मूल (Original) कंटेनर में ही रखें। कभी भी पानी या कोल्ड ड्रिंक की बोतलों में न रखें।',
        'बच्चों व पशुओं से दूर: कीटनाशकों को बच्चों, पालतू पशुओं, पशु आहार, अनाज और रसोईघर से दूर ताले वाले स्थान पर रखें।',
        'सीधी धूप से बचाव: दवाओं को सूखे, ठंडे और सीधे धूप से सुरक्षित कमरे में रखें।'
      ]
    },
    {
      id: 6,
      title: '6. खाली कंटेनर का सुरक्षित निपटान (Safe Disposal of Containers)',
      icon: Trash2,
      color: 'bg-rose-50 text-rose-800 border-rose-200',
      points: [
        'ट्रिपल रिंस (Triple Rinse): खाली बोतल/डिब्बे को 3 बार साफ पानी से धोकर वह पानी स्प्रे टैंक में ही डाल लें।',
        'कंटेनर नष्ट करें: खाली बोतलों या डिब्बों को तोड़कर/नष्ट करके जमीन में सुरक्षित रूप से गाड़ दें ताकि उनका दोबारा घरेलू उपयोग न हो।',
        'जल स्रोतों की सुरक्षा: खाली पैकेटों या बोतलों को तालाब, कुएं, नहर या नदी के पास बिल्कुल न फेंकें।'
      ]
    },
    {
      id: 7,
      title: '7. प्री-हार्वेस्ट इंटरवल / कटाई प्रतीक्षा समय (Pre-Harvest Interval - PHI)',
      icon: Sun,
      color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      points: [
        'कीटनाशक या फफूंदनाशक छिड़कने के तुरंत बाद फल, सब्जी या अनाज की कटाई न करें।',
        'प्रत्येक रसायन का एक निश्चित प्रतीक्षा समय (PHI - जैसे 3 दिन, 7 दिन, 14 दिन) होता है।',
        'उचित प्रतीक्षा समय बीतने के बाद ही फसल की तुड़ाई करें ताकि रासायनिक अवशेष मानव स्वास्थ्य के लिए सुरक्षित स्तर पर हों।'
      ]
    },
    {
      id: 8,
      title: '8. आपातकालीन प्राथमिक चिकित्सा (Emergency First Aid & Poisoning)',
      icon: HeartPulse,
      color: 'bg-red-50 text-red-700 border-red-200',
      points: [
        'लक्षण: यदि छिड़काव के दौरान चक्कर, उल्टी, सिरदर्द, आंखों में जलन, घबराहट या सांस में तकलीफ हो, तुरंत काम रोक दें।',
        'त्वचा व आंखें: प्रभावित स्थान को तुरंत कम से कम 15 मिनट तक ठंडे बहते पानी से अच्छी तरह धोएं।',
        'चिकित्सकीय सहायता: दवा का मूल डिब्बा/लेबल साथ लेकर तुरंत नजदीकी डॉक्टर या अस्पताल जाएं।',
        'आपातकालीन हेल्पलाइन: 108 / 112'
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1b3717] via-[#2D5A27] to-[#163013] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full -mr-24 -mt-24 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#EAB308]/10 rounded-full -ml-18 -mb-18 blur-xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner mb-1">
            <ShieldAlert className="w-7 h-7 text-[#EAB308]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
            कीटनाशक व रासायनिक सुरक्षा निर्देश
          </h1>
          <p className="text-xs font-semibold text-[#EAB308]">
            Agro-Chemical Safety & Safe Usage Guidelines
          </p>
          <p className="text-[11px] text-white/80 font-medium">
            सुरक्षित किसान, समृद्ध फसल – रसायनों के सुरक्षित एवं जिम्मेदार उपयोग के नियम
          </p>
        </div>
      </motion.div>

      {/* Intro Warning Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-amber-50/80 rounded-3xl p-5 border border-amber-200/80 shadow-xs space-y-2.5"
      >
        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>महत्वपूर्ण सुरक्षा चेतावनी</span>
        </div>
        <p className="text-xs text-amber-950/90 leading-relaxed font-medium">
          <strong>{branding.name}</strong> पर उपलब्ध कीटनाशक (Insecticides), फफूंदनाशक (Fungicides), खरपतवारनाशक (Herbicides) एवं अन्य रासायनिक कृषि उत्पाद केवल फसलों के संरक्षण और पैदावार सुधारने के लिए हैं। इनका अनुचित, अत्यधिक या असावधानीपूर्वक उपयोग मानव स्वास्थ्य, पशुओं, पर्यावरण तथा फसल को गंभीर नुकसान पहुँचा सकता है। कृपया किसी भी उत्पाद के उपयोग से पहले इन सुरक्षा निर्देशों का अनिवार्य रूप से पालन करें।
        </p>
      </motion.div>

      {/* 8 Golden Safety Rules Grid */}
      <div className="space-y-3.5">
        {safetyRules.map((rule, idx) => {
          const Icon = rule.icon;
          return (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.03 }}
              className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border shrink-0 ${rule.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-[#4A3728] leading-tight">
                  {rule.title}
                </h3>
              </div>

              <div className="space-y-2 pt-1 border-t border-gray-50">
                {rule.points.map((point, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A27] shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Emergency Helpline Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl p-5 border border-red-200 shadow-xs space-y-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center border border-red-200">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-red-900">आपातकालीन संपर्क (Emergency Helpline)</h3>
            <p className="text-[11px] text-red-700 font-medium">विषाक्तता या दुर्घटना की स्थिति में तुरंत कॉल करें</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <a 
            href="tel:108"
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" /> एम्बुलेंस: 108
          </a>
          <a 
            href="tel:112"
            className="p-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" /> आपातकालीन: 112
          </a>
        </div>
      </motion.div>

      {/* Legal Disclaimer Box */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-50 rounded-3xl p-5 border border-gray-200 text-xs text-gray-600 leading-relaxed space-y-2"
      >
        <h4 className="font-bold text-[#4A3728] text-xs flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#2D5A27]" /> कानूनी अस्वीकरण (Disclaimer)
        </h4>
        <p className="text-[11px]">
          <strong>{branding.name}</strong> केवल सीलबंद, प्रमाणित एवं निर्माताओं द्वारा आपूर्ति किए गए मानक उत्पाद उपलब्ध कराता है। उपयोगकर्ता द्वारा अनुचित खुराक, गलत मिश्रण, मौसम की प्रतिकूलता, सुरक्षा उपकरणों के न पहनने या अनुचित उपयोग से होने वाले किसी भी व्यक्तिगत, फसल या पर्यावरणीय नुकसान के लिए उपयोगकर्ता स्वयं जिम्मेदार होगा।
        </p>
      </motion.div>

      {/* Footer Navigation */}
      <div className="pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
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

export default ChemicalSafety;
