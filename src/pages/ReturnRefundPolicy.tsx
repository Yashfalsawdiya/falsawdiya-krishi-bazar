import React from 'react';
import { motion } from 'motion/react';
import { 
  RotateCcw, 
  Clock, 
  AlertCircle, 
  Ban, 
  CreditCard, 
  XCircle, 
  Phone, 
  Mail, 
  MessageCircle, 
  Truck, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  FileText,
  PackageX,
  AlertTriangle,
  PhoneCall,
  ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const ReturnRefundPolicy: React.FC = () => {
  const { appContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान'
  };

  const sections = [
    {
      id: 1,
      title: '1. Return Eligibility (वापसी की पात्रता)',
      icon: RotateCcw,
      color: 'bg-emerald-50 text-[#2D5A27] border-emerald-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-800">सभी products returnable नहीं होंगे।</p>
          <p className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100/80 text-[#2D5A27] font-medium">
            केवल वे products return/replacement के लिए eligible होंगे जिनके product page या order communication में return/replacement availability दी गई हो।
          </p>
        </div>
      )
    },
    {
      id: 2,
      title: '2. Damaged / Wrong Product (क्षतिग्रस्त या गलत उत्पाद)',
      icon: AlertCircle,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      content: (
        <div className="space-y-2.5 text-xs text-gray-700 leading-relaxed">
          <p>यदि customer को:</p>
          <ul className="space-y-1.5 pl-1">
            {['गलत product मिला हो', 'product damaged condition में मिला हो', 'delivered product order से materially अलग हो'].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 bg-[#F5F2ED] px-3 py-1.5 rounded-xl border border-[#4A3728]/5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 font-semibold">
            तो customer को delivery प्राप्त होने के 48 घंटे के भीतर हमें contact करना होगा।
          </div>
          <p className="text-gray-500">
            Customer से product की photos/video, order number और अन्य आवश्यक details माँगी जा सकती हैं। Verification के बाद eligible case में replacement दिया जा सकता है।
          </p>
        </div>
      )
    },
    {
      id: 3,
      title: '3. Non-Returnable Products (गैर-वापसी योग्य उत्पाद)',
      icon: Ban,
      color: 'bg-rose-50 text-rose-700 border-rose-100',
      content: (
        <div className="space-y-2.5 text-xs text-gray-700 leading-relaxed">
          <p>
            Product की nature और applicable requirements के कारण कुछ agricultural products returnable नहीं हो सकते।
          </p>
          <p className="font-bold text-[#4A3728]">विशेष रूप से:</p>
          <ul className="space-y-1.5">
            {[
              'खोले या इस्तेमाल किए गए products',
              'tampered packaging (छेड़छाड़ की गई सील/पैकिंग)',
              'customer द्वारा damaged products',
              'बिना original packaging/label के products',
              'ऐसे products जिनकी return eligibility product page पर उपलब्ध नहीं है'
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-rose-50/60 p-2 rounded-xl border border-rose-100">
                <PackageX className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium text-rose-950">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-gray-500 font-medium">
            Seeds, pesticides, fertilizers और अन्य agricultural inputs के लिए return eligibility product-specific होगी।
          </p>
        </div>
      )
    },
    {
      id: 4,
      title: '4. Refund (रिफंड नीति)',
      icon: CreditCard,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            यदि replacement संभव नहीं है और applicable case में refund उचित पाया जाता है, तो refund original payment method में process किया जा सकता है।
          </p>
          <p className="text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium">
            Refund processing time payment provider/bank पर निर्भर कर सकता है।
          </p>
        </div>
      )
    },
    {
      id: 5,
      title: '5. Cancellation (ऑर्डर रद्द करना)',
      icon: XCircle,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p className="font-medium">
            Order dispatch/shipment से पहले cancellation request स्वीकार की जा सकती है, subject to order status।
          </p>
          <p className="text-purple-900 bg-purple-50/60 p-3 rounded-2xl border border-purple-100 font-medium">
            Dispatch होने के बाद cancellation उपलब्ध न भी हो सकती है। ऐसे मामलों में applicable Return Policy लागू होगी।
          </p>
        </div>
      )
    },
    {
      id: 6,
      title: '6. Return/Replacement Request (अनुरोध कैसे करें)',
      icon: Phone,
      color: 'bg-emerald-50 text-[#2D5A27] border-emerald-100',
      content: (
        <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-[#2D5A27]/20 font-bold text-[#2D5A27]">
            डिलीवरी के 48 घंटे के भीतर संपर्क करें:
          </div>

          <div className="space-y-2">
            <a 
              href="https://wa.me/918982338046?text=नमस्ते%20मुझे%20ऑर्डर%20के%20संबंध%20में%20मदद%20चाहिए"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 font-bold text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp / Call: 8982338046</span>
            </a>

            <a 
              href="mailto:yashfalsawdiya36@gmail.com"
              className="flex items-center gap-2.5 font-bold text-blue-700 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100"
            >
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Email: yashfalsawdiya36@gmail.com</span>
            </a>
          </div>

          <div className="pt-1">
            <p className="font-extrabold text-[#4A3728] mb-1.5">Request में निम्न विवरण भेजें:</p>
            <ul className="space-y-1 text-gray-600">
              {[
                'Order Number (ऑर्डर नंबर)',
                'Customer Name (ग्राहक का नाम)',
                'Product Name (उत्पाद का नाम)',
                'Problem का विवरण',
                'Product की clear photos / video'
              ].map((req, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: '7. Return Shipping (वापसी शिपिंग शुल्क)',
      icon: Truck,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-100',
      content: (
        <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
          <p>
            यदि verification के बाद गलत या damaged product की जिम्मेदारी हमारी तरफ से निर्धारित होती है, तो applicable replacement/return shipping cost हम bear कर सकते हैं।
          </p>
          <p className="text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            अन्य situations में return shipping customer की responsibility हो सकती है, यदि applicable law और product-specific policy इसकी अनुमति देती है।
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
            <RotateCcw className="w-8 h-8 text-[#EAB308]" />
          </div>

          <h1 className="text-xl font-black tracking-tight text-white leading-tight">
            Return, Refund & Cancellation Policy
          </h1>
          <p className="text-sm font-semibold text-[#EAB308]">
            वापसी, रिफंड एवं ऑर्डर रद्द करने की नीति
          </p>

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
          <strong className="text-[#2D5A27] font-bold">{branding.name}</strong> agricultural products की प्रकृति को ध्यान में रखते हुए Limited Return Policy follow करता है।
        </p>
      </motion.div>

      {/* Policy Sections */}
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

export default ReturnRefundPolicy;
