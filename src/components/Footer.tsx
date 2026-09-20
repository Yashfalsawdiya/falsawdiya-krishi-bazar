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
  Lock
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SmartImage from './SmartImage';
import { mergeFooterConfig } from '../utils/footerDefaults';

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
  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');
  const defaultAddress = appContent?.contactInfo?.address || 
    contactData?.address || 
    'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश (458883)';

  const defaultWhatsappGroupLink = appContent?.whatsappSection?.groupLink || `https://wa.me/91${cleanWhatsapp}?text=नमस्ते%20फल्सावदिया%20कृषि%20बाजार`;
  const defaultFacebookUrl = appContent?.facebookSection?.pageUrl || 'https://facebook.com';
  const defaultInstagramUrl = appContent?.instagramSection?.profileUrl || 'https://instagram.com';
  const defaultYoutubeUrl = appContent?.youtubeChannel?.url || 'https://youtube.com';

  const footerConfig = mergeFooterConfig(appContent?.footer, {
    brandName: branding.name,
    tagline: branding.tagline,
    phone: phoneNumber,
    address: defaultAddress,
    whatsappUrl: defaultWhatsappGroupLink,
    facebookUrl: defaultFacebookUrl,
    instagramUrl: defaultInstagramUrl,
    youtubeUrl: defaultYoutubeUrl,
  });

  const cleanPhone = (footerConfig.helphoneNumber || phoneNumber).replace(/\D/g, '');

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getHighlightIcon = (icon?: string, index: number = 0) => {
    if (icon === 'shield' || index === 0) {
      return {
        boxClass: 'bg-[#EAB308]/15 border-[#EAB308]/30',
        icon: <ShieldCheck className="w-6 h-6 text-[#EAB308]" />
      };
    }
    if (icon === 'users' || index === 1) {
      return {
        boxClass: 'bg-emerald-500/15 border-emerald-400/30',
        icon: <Users className="w-6 h-6 text-emerald-400" />
      };
    }
    if (icon === 'truck' || index === 2) {
      return {
        boxClass: 'bg-blue-500/15 border-blue-400/30',
        icon: <Truck className="w-6 h-6 text-blue-400" />
      };
    }
    return {
      boxClass: 'bg-amber-500/15 border-amber-400/30',
      icon: <Headphones className="w-6 h-6 text-amber-300" />
    };
  };

  return (
    <footer className="hidden lg:block w-full bg-[#16311A] text-white border-t border-[#23481F] shadow-2xl relative z-30">
      {/* Top Value / Trust Highlights Banner */}
      <div className="bg-[#1C3E21] border-b border-[#2A562F]/60 py-6">
        <div className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1740px] mx-auto px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="grid grid-cols-4 gap-6 xl:gap-8 2xl:gap-10">
            {footerConfig.highlights.map((item, idx) => {
              const iconData = getHighlightIcon(item.icon, idx);
              return (
                <div key={item.id || idx} className="flex items-center gap-3.5 px-3">
                  <div className={`w-12 h-12 rounded-2xl ${iconData.boxClass} border flex items-center justify-center shrink-0`}>
                    {iconData.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{item.title}</h4>
                    <p className="text-xs text-gray-300/80 mt-0.5 font-medium">{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Multi-Column Website Footer */}
      <div className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1740px] mx-auto px-6 lg:px-8 xl:px-10 2xl:px-12 py-12 2xl:py-16">
        <div className="grid grid-cols-12 gap-8 xl:gap-10 2xl:gap-12">
          {/* Brand Profile & Contact Information (Column: 4 out of 12) */}
          <div className="col-span-12 xl:col-span-4 space-y-5 pr-0 xl:pr-6 2xl:pr-10">
            <Link 
              to="/" 
              onClick={scrollToTop}
              className="inline-flex items-center gap-3.5 group"
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-md border border-white/20 shrink-0 group-hover:scale-105 transition-transform">
                <SmartImage
                  src={branding.logo}
                  fallbackSrc="/icon-192.png"
                  alt={footerConfig.brandName}
                  className="w-full h-full"
                  objectFit="contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors leading-tight">
                  {footerConfig.brandName}
                </h2>
                <p className="text-xs text-[#EAB308] font-semibold mt-0.5">
                  {footerConfig.tagline}
                </p>
              </div>
            </Link>

            <p className="text-xs text-gray-300 leading-relaxed font-normal">
              {footerConfig.description}
            </p>

            {/* Direct Helpline / Missed Call Button */}
            <div className="space-y-3 pt-1">
              <div className="bg-[#1F4525] border border-emerald-600/30 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EAB308]/20 flex items-center justify-center text-[#EAB308] shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-200 font-medium">{footerConfig.helplineTitle}</p>
                    <a 
                      href={`tel:${cleanPhone}`} 
                      className="text-sm font-bold text-white hover:text-[#EAB308] transition-colors"
                    >
                      {footerConfig.helphoneNumber?.startsWith('+') ? footerConfig.helphoneNumber : `+91 ${footerConfig.helphoneNumber}`}
                    </a>
                  </div>
                </div>
                <a
                  href={`tel:${cleanPhone}`}
                  className="px-3 py-1.5 bg-[#EAB308] hover:bg-[#d4a107] text-[#16311A] text-xs font-semibold rounded-xl transition-all shadow-xs"
                >
                  {footerConfig.callButtonText}
                </a>
              </div>

              {/* Physical Address */}
              <div className="flex items-start gap-2.5 text-xs text-gray-300 pt-1">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{footerConfig.address}</span>
              </div>
            </div>

            {/* Social & Community Links */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-gray-400 mb-2.5">
                {footerConfig.socialTitle}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={footerConfig.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-all shadow-xs"
                  title="WhatsApp कम्युनिटी"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={footerConfig.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  title="Facebook"
                >
                  <span className="text-xs font-black">f</span>
                </a>
                <a
                  href={footerConfig.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-pink-600/20 border border-pink-500/40 text-pink-400 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  title="Instagram"
                >
                  <span className="text-xs font-black">ig</span>
                </a>
                <a
                  href={footerConfig.youtubeUrl}
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
            {footerConfig.columns.map((col, cIdx) => (
              <div key={col.id || cIdx} className="space-y-3.5">
                <h3 className="text-xs font-bold text-[#EAB308] border-b border-white/10 pb-2">
                  {col.title}
                </h3>
                <ul className="space-y-2.5 text-xs text-gray-300">
                  {col.links.map((link, lIdx) => {
                    const isExt = link.isExternal || link.path.startsWith('http://') || link.path.startsWith('https://');
                    if (isExt) {
                      return (
                        <li key={link.id || lIdx}>
                          <a
                            href={link.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                          >
                            <ChevronRight className="w-3 h-3 text-emerald-400/70 shrink-0" />
                            <span>{link.label}</span>
                          </a>
                        </li>
                      );
                    }
                    return (
                      <li key={link.id || lIdx}>
                        <Link 
                          to={link.path} 
                          onClick={scrollToTop} 
                          className="hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all"
                        >
                          <ChevronRight className="w-3 h-3 text-emerald-400/70 shrink-0" />
                          <span>{link.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Copyright & Secure Payments Strip */}
      <div className="border-t border-[#23481F] bg-[#122715] py-5 text-xs text-gray-400">
        <div className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1740px] mx-auto px-6 lg:px-8 xl:px-10 2xl:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center md:text-left">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#EAB308] shrink-0" />
              <p>
                © {new Date().getFullYear()} <span className="text-white font-bold">{footerConfig.brandName}</span>. {footerConfig.copyrightText}
              </p>
            </div>
            {footerConfig.bottomText && (
              <p className="text-[11px] text-gray-400 sm:border-l sm:border-gray-700 sm:pl-2">
                {footerConfig.bottomText}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] text-gray-300">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              {footerConfig.paymentLabel}
            </span>
            {footerConfig.paymentMethods.map((method, mIdx) => (
              <span 
                key={mIdx} 
                className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
