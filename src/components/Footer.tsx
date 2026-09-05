import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  MapPin, 
  MessageCircle, 
  ShieldCheck, 
  Truck, 
  Users, 
  Award, 
  Headphones, 
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SmartImage from './SmartImage';

const Footer: React.FC = () => {
  const { appContent, legalPagesContent } = useAppContext();

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान',
    logo: ''
  };

  const contactData = legalPagesContent?.contactUs;
  const phoneNumber = contactData?.phone || '8982338046';
  const whatsappNumber = appContent?.contactInfo?.whatsapp || contactData?.whatsapp || '8982338046';
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');
  const address = appContent?.contactInfo?.address || 
    contactData?.address || 
    'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)';

  const whatsappGroupLink = appContent?.whatsappSection?.groupLink || `https://wa.me/91${cleanWhatsapp}?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार`;
  const facebookUrl = appContent?.facebookSection?.pageUrl || 'https://facebook.com';
  const instagramUrl = appContent?.instagramSection?.profileUrl || 'https://instagram.com';
  const youtubeUrl = appContent?.youtubeChannel?.url || 'https://youtube.com';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="hidden lg:block w-full bg-[#16311A] text-white border-t border-[#23481F] shadow-2xl relative z-30">
      {/* Top Value / Trust Highlights Banner (Inspired by Competitor Agriculture Platform) */}
      <div className="bg-[#1C3E21] border-b border-[#2A562F]/60 py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-4 gap-6">
            <div className="flex items-center gap-3.5 px-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAB308]/15 border border-[#EAB308]/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#EAB308]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">100% असली व प्रमाणित</h4>
                <p className="text-xs text-gray-300/80 mt-0.5 font-medium">सरकारी अनुज्ञा प्राप्त कृषि इनपुट्स</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">5,000+ संतुष्ट किसान</h4>
                <p className="text-xs text-gray-300/80 mt-0.5 font-medium">मध्य प्रदेश का विश्वसनीय कृषि केंद्र</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">सुरक्षित डोरस्टेप डिलीवरी</h4>
                <p className="text-xs text-gray-300/80 mt-0.5 font-medium">सीधे आपके खेत व घर तक पहुंच</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">24x7 AI व विशेषज्ञ सहायता</h4>
                <p className="text-xs text-gray-300/80 mt-0.5 font-medium">फसल रोग व दवा की सही जानकारी</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Website Footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-12 gap-8 xl:gap-10">
          {/* Brand Profile & Contact Information (Column: 4 out of 12) */}
          <div className="col-span-12 xl:col-span-4 space-y-5 pr-0 xl:pr-4">
            <Link 
              to="/" 
              onClick={scrollToTop}
              className="inline-flex items-center gap-3.5 group"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-md border border-white/20 shrink-0 group-hover:scale-105 transition-transform">
                <SmartImage
                  src={branding.logo}
                  fallbackSrc="/icon-192.png"
                  alt={branding.name}
                  className="w-full h-full"
                  objectFit="contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white group-hover:text-amber-300 transition-colors leading-tight">
                  {branding.name}
                </h2>
                <p className="text-xs text-[#EAB308] font-bold mt-0.5">
                  {branding.tagline}
                </p>
              </div>
            </Link>

            <p className="text-xs text-gray-300 leading-relaxed font-normal">
              किसानों की समृद्धि और आधुनिक कृषि क्रांति का समर्पित डिजिटल मंच। उच्च गुणवत्ता वाले प्रमाणित कीटनाशक, जैविक खाद, उन्नत बीज एवं AI आधारित डिजिटल परामर्श सीधे किसानों तक।
            </p>

            {/* Direct Helpline / Missed Call Button (Matching BigHaat Style) */}
            <div className="space-y-3 pt-1">
              <div className="bg-[#1F4525] border border-emerald-600/30 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EAB308]/20 flex items-center justify-center text-[#EAB308] shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">हेल्पलाइन व ऑर्डर सहायता</p>
                    <a 
                      href={`tel:${cleanPhone}`} 
                      className="text-sm font-black text-white hover:text-[#EAB308] transition-colors"
                    >
                      +91 {phoneNumber}
                    </a>
                  </div>
                </div>
                <a
                  href={`tel:${cleanPhone}`}
                  className="px-3 py-1.5 bg-[#EAB308] hover:bg-[#d4a107] text-[#16311A] text-xs font-black rounded-xl transition-all shadow-xs"
                >
                  कॉल करें
                </a>
              </div>

              {/* Physical Address */}
              <div className="flex items-start gap-2.5 text-xs text-gray-300 pt-1">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{address}</span>
              </div>
            </div>

            {/* Social & Community Links */}
            <div className="pt-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                सोशल मीडिया व कम्युनिटी
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={whatsappGroupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-all shadow-xs"
                  title="WhatsApp कम्युनिटी"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  title="Facebook"
                >
                  <span className="text-xs font-black">f</span>
                </a>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-pink-600/20 border border-pink-500/40 text-pink-400 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  title="Instagram"
                >
                  <span className="text-xs font-black">ig</span>
                </a>
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  title="YouTube"
                >
                  <span className="text-xs font-black">yt</span>
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Links Columns (Column: 8 out of 12) */}
          <div className="col-span-12 xl:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-6 xl:gap-8">
            {/* Column 1: Falsawdiya Krishi Bazaar / Company */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-[#EAB308] uppercase tracking-wider border-b border-white/10 pb-2">
                फल्सावदिया बाजार
              </h3>
              <ul className="space-y-2.5 text-xs text-gray-300">
                <li>
                  <Link 
                    to="/about" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    हमारे बारे में (About Us)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/contact" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    संपर्क करें (Contact Us)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/profile" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    मेरा प्रोफाइल (Profile)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/my-orders" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    मेरे ऑर्डर (My Orders)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/cart" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    शॉपिंग कार्ट (Cart)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/products" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    सभी उत्पाद (All Products)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Agri Services */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-[#EAB308] uppercase tracking-wider border-b border-white/10 pb-2">
                कृषि सेवाएं
              </h3>
              <ul className="space-y-2.5 text-xs text-gray-300">
                <li>
                  <Link 
                    to="/ai-call" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    AI कृषि विशेषज्ञ कॉल
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/ai-product-knowledge" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    AI उत्पाद जानकारी
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/mandi" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    मंडी भाव (Mandi Bhav)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/disease" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    फसल बीमारी जाँच
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/encyclopedia" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    कीट एवं रोग निर्देशिका
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/schemes" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    सरकारी योजनाएं
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/weather" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    मौसम पूर्वानुमान
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Tools & Resources */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-[#EAB308] uppercase tracking-wider border-b border-white/10 pb-2">
                टूल्स व सहायता
              </h3>
              <ul className="space-y-2.5 text-xs text-gray-300">
                <li>
                  <Link 
                    to="/calculator" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    कृषि कैलकुलेटर (Calculator)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/news" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    कृषि समाचार (Agri News)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/soil-testing" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    मिट्टी परीक्षण मार्गदर्शिका
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/helpline" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    हेल्पलाइन डायरेक्टरी
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/faq" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    FAQ (सहायता व प्रश्नोत्तरी)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/shipping-policy" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    शिपिंग व डिलीवरी नीति
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Legal, Safety & Licensing */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-[#EAB308] uppercase tracking-wider border-b border-white/10 pb-2">
                नीतियां व सुरक्षा
              </h3>
              <ul className="space-y-2.5 text-xs text-gray-300">
                <li>
                  <Link 
                    to="/licensing-disclaimer" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all font-medium text-emerald-300"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    वैधानिक लाइसेंस (DAESI)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/safety-guidelines" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    रासायनिक सुरक्षा (Chemical Safety)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/privacy" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    गोपनीयता नीति (Privacy Policy)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/terms" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    नियम एवं शर्तें (Terms)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/refund-policy" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    रिफंड एवं वापसी (Refund Policy)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/grievance" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    शिकायत अधिकारी (Grievance)
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/disclaimer" 
                    onClick={scrollToTop} 
                    className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400/70" />
                    कृषि एवं AI अस्वीकरण
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright & Secure Payments Strip */}
      <div className="border-t border-[#23481F] bg-[#122715] py-5 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-center md:text-left">
            <Award className="w-4 h-4 text-[#EAB308] shrink-0" />
            <p>
              © {new Date().getFullYear()} <span className="text-white font-bold">{branding.name}</span>. सर्वाधिकार सुरक्षित। (All Rights Reserved)
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-300">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              100% सुरक्षित ऑनलाइन भुगतान:
            </span>
            <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">UPI</span>
            <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">PhonePe</span>
            <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">GPay</span>
            <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">Cards / NetBanking</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
