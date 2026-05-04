import React from 'react';
import { motion } from 'motion/react';
import { Phone, ArrowLeft, PhoneCall, Headphones, Zap, ShieldCheck, Droplets, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Helpline: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    {
      title: "कृषि सेवाएं",
      icon: Headphones,
      color: "bg-green-100 text-green-600",
      numbers: [
        { name: "किसान कॉल सेंटर (KCC)", number: "1800-180-1551", desc: "कृषि सलाह के लिए" },
        { name: "कृषि विभाग (म.प्र.)", number: "1551", desc: "सरकारी योजनाओं के लिए" },
        { name: "मंडी कंट्रोल रूम", number: "0755-2550111", desc: "मंडी संबंधी सहायता" }
      ]
    },
    {
      title: "विभाग और आपूर्ति",
      icon: Landmark,
      color: "bg-blue-100 text-blue-600",
      numbers: [
        { name: "बिजली विभाग (ग्रामीण)", number: "1912", desc: "बिजली कटौती या शिकायत" },
        { name: "सिंचाई विभाग हेल्पलाइन", number: "181", desc: "नहर या पानी की समस्या" },
        { name: "बीज निगम म.प्र.", number: "0755-2551652", desc: "बीज उपलब्धता जानकारी" }
      ]
    },
    {
      title: "बीमा और सुरक्षा",
      icon: ShieldCheck,
      color: "bg-orange-100 text-orange-600",
      numbers: [
        { name: "फसल बीमा कंपनी", number: "1800-209-5959", desc: "क्लेम संबंधी जानकारी" },
        { name: "पशु चिकित्सा हेल्पलाइन", number: "1962", desc: "बीमार पशुओं के लिए मदद" },
        { name: "राजस्व विभाग (पटवारी)", number: "181", desc: "ज़मीन संबंधी शिकायतों के लिए" }
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">हेल्पलाइन डायरेक्टरी</h2>
      </div>

      <div className="bg-[#2D5A27] rounded-3xl p-6 text-white mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-lg font-bold">मदद के लिए डायल करें</h3>
          <p className="text-sm text-white/70 mt-1">आप किसी भी नंबर पर सीधे क्लिक करके कॉल कर सकते हैं।</p>
        </div>
        <PhoneCall className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
      </div>

      <div className="space-y-8">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${cat.color}`}>
                <cat.icon className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-gray-700">{cat.title}</h4>
            </div>
            
            <div className="grid gap-3">
              {cat.numbers.map((num, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = `tel:${num.number.replace(/-/g, '')}`}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group"
                >
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{num.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{num.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-[#2D5A27] font-mono">{num.number}</span>
                    <div className="bg-green-50 p-2 rounded-full group-hover:bg-[#2D5A27] group-hover:text-white transition-colors">
                      <Phone className="w-4 h-4 text-green-600 group-hover:text-white" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-6 text-center">
        <p className="text-sm font-bold text-yellow-800">ज़रूरी सूचना</p>
        <p className="text-xs text-yellow-700 mt-2 leading-relaxed">
          सभी टोल-फ्री नंबर सुबह 6 से रात 10 बजे तक सक्रिय रहते हैं। आपातकालीन स्थिति में 100 या 108 पर संपर्क करें।
        </p>
      </div>
    </div>
  );
};

export default Helpline;
