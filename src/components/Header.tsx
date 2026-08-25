import React, { useState } from 'react';
import { Search, Menu, Sprout, X, Landmark, Phone, Newspaper, User, Calculator, PhoneCall, Bug, TrendingUp, ShoppingCart, Sparkles, Info, ShieldCheck, FileText, RotateCcw, AlertTriangle, ShieldAlert, HelpCircle, Truck, Scale, Award, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import SmartImage from './SmartImage';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoEnlarged, setIsLogoEnlarged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { appContent, isAdmin } = useAppContext();
  const { cartCount } = useCart();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLogoEnlarged(true);
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const toggleVoiceSearch = () => {
    // Voice search removed
  };

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान',
    logo: ''
  };

  interface MenuItem {
    icon: React.ElementType;
    label: string;
    path: string;
    color: string;
    isExternal?: boolean;
  }

  const mainMenuItems: MenuItem[] = [
    { icon: Package, label: 'मेरे ऑर्डर (My Orders & Tracking)', path: '/orders', color: 'text-[#2D5A27] font-bold' },
    { icon: User, label: 'मेरा प्रोफाइल (Profile)', path: '/profile', color: 'text-purple-600' },
    { icon: Info, label: 'हमारे बारे में (About Us)', path: '/about', color: 'text-emerald-700' },
    { icon: Phone, label: 'AI कृषि विशेषज्ञ कॉल', path: '/ai-call', color: 'text-[#2D5A27]' },
    { icon: Sparkles, label: 'AI उत्पाद जानकारी (Knowledge)', path: '/ai-product-knowledge', color: 'text-amber-500' },
    { icon: TrendingUp, label: 'मंडी भाव (Mandi Bhav)', path: '/mandi', color: 'text-green-600' },
    { icon: Bug, label: 'कीट एवं रोग निर्देशिका', path: '/encyclopedia', color: 'text-rose-600' },
    { icon: Landmark, label: 'सरकारी योजनाएं', path: '/schemes', color: 'text-blue-600' },
    { icon: Calculator, label: 'Calculator', path: '/calculator', color: 'text-orange-600' },
    { icon: PhoneCall, label: 'हेल्पलाइन डायरेक्टरी', path: '/helpline', color: 'text-cyan-600' },
  ];

  const legalMenuItems: MenuItem[] = [
    { icon: Award, label: 'Statutory Licensing (वैधानिक लाइसेंस व DAESI)', path: '/licensing-disclaimer', color: 'text-emerald-800 font-bold' },
    { icon: HelpCircle, label: 'FAQ (सहायता व प्रश्नोत्तरी)', path: '/faq', color: 'text-emerald-600' },
    { icon: Truck, label: 'Shipping & Delivery (डिलीवरी नीति)', path: '/shipping-policy', color: 'text-emerald-700' },
    { icon: ShieldCheck, label: 'Privacy Policy (गोपनीयता नीति)', path: '/privacy', color: 'text-blue-600' },
    { icon: FileText, label: 'Terms (नियम एवं शर्तें)', path: '/terms', color: 'text-amber-600' },
    { icon: RotateCcw, label: 'Refund Policy (वापसी व रिफंड)', path: '/refund-policy', color: 'text-rose-600' },
    { icon: AlertTriangle, label: 'AI Disclaimer (कृषि एवं AI अस्वीकरण)', path: '/disclaimer', color: 'text-yellow-600' },
    { icon: ShieldAlert, label: 'Chemical Safety (रासायनिक सुरक्षा)', path: '/safety-guidelines', color: 'text-red-600' },
    { icon: Scale, label: 'Grievance Officer (शिकायत अधिकारी)', path: '/grievance', color: 'text-blue-700' },
    { icon: PhoneCall, label: 'Contact Us (संपर्क करें)', path: '/contact', color: 'text-teal-600' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 max-w-md mx-auto bg-[#2D5A27] text-white z-50 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.div 
              whileTap={{ scale: 0.95 }}
              onClick={!isAdmin ? handleLogoClick : undefined}
              className="cursor-pointer"
            >
              <Link 
                to={isAdmin ? "/admin" : "#"} 
                className="w-14 h-14 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner p-1.5"
              >
                <SmartImage 
                  src={branding.logo} 
                  fallbackSrc="/icon-192.png"
                  alt="Logo" 
                  className="w-full h-full" 
                  objectFit="contain" 
                  priority
                />
              </Link>
            </motion.div>
            <div>
              <h1 className="text-lg font-bold leading-none">{branding.name}</h1>
              <p className="text-[10px] text-[#EAB308]">{branding.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/cart" className="p-1 hover:bg-white/10 rounded-full transition-colors relative" title="Cart Page">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-[#2D5A27]">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link to="/profile" className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <User className="w-6 h-6" />
            </Link>
            <button onClick={() => setIsMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="relative">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchQuery);
            }}
          >
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="दवाई या बीज खोजें..." 
              className="w-full bg-white/10 border border-white/20 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:bg-white/20 placeholder:text-white/60"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/60" />
          </form>
        </div>

        <AnimatePresence>
          {/* Logo Enlargement Modal */}
          {isLogoEnlarged && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLogoEnlarged(false)}
                className="fixed inset-0 bg-black/80 z-[200] backdrop-blur-md flex items-center justify-center p-6"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="relative w-64 h-64 bg-white rounded-[40px] p-8 shadow-2xl flex items-center justify-center border-4 border-[#2D5A27]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    onClick={() => setIsLogoEnlarged(false)}
                    className="absolute -top-4 -right-4 w-10 h-10 bg-[#2D5A27] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="w-full h-full overflow-hidden flex items-center justify-center">
                    <SmartImage 
                      src={branding.logo} 
                      fallbackSrc="/icon-512.png"
                      alt="Enlarged Logo" 
                      className="w-full h-full" 
                      objectFit="contain" 
                    />
                  </div>
                  <div className="absolute -bottom-20 left-0 right-0 text-center">
                    <h3 className="text-white text-xl font-bold leading-tight">{branding.name}</h3>
                    <p className="text-green-400 text-sm font-medium mt-1">{branding.tagline}</p>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {/* Mic error removed */}
        </AnimatePresence>
      </header>

      {/* Side Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-[300px] bg-white z-[101] shadow-2xl flex flex-col"
            >
              <div className="bg-[#2D5A27] p-6 text-white">
                <div className="flex justify-between items-center mb-4">
                  <motion.div 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogoClick}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden p-1 shadow-inner cursor-pointer"
                  >
                    <SmartImage 
                      src={branding.logo} 
                      fallbackSrc="/icon-192.png"
                      alt="Logo" 
                      className="w-full h-full" 
                      objectFit="contain" 
                      priority
                    />
                  </motion.div>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <h2 className="text-xl font-bold">नमस्ते, किसान भाई!</h2>
                <p className="text-xs text-white/70 mt-1">फल्सावदिया कृषि बाजार में आपका स्वागत है</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Main Navigation Items */}
                <div className="space-y-1">
                  {mainMenuItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (item.isExternal) {
                          if (item.path.startsWith('tel:')) {
                            window.location.href = item.path;
                          } else {
                            window.open(item.path, '_blank');
                          }
                        } else {
                          navigate(item.path);
                        }
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3.5 p-3 hover:bg-gray-50 rounded-2xl transition-colors text-left"
                    >
                      <div className={`p-2 rounded-xl bg-gray-100 shrink-0 ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-gray-700">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Legal & Policy Pages - Shifted to Bottom */}
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-3 mb-1">
                    नीतियां व सहायता (Legal & Info)
                  </p>
                  {legalMenuItems.map((item, idx) => (
                    <button
                      key={`legal-${idx}`}
                      onClick={() => {
                        navigate(item.path);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3.5 p-2.5 hover:bg-emerald-50/50 rounded-2xl transition-colors text-left group"
                    >
                      <div className={`p-1.5 rounded-lg bg-gray-50 border border-gray-100 shrink-0 ${item.color}`}>
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-xs text-gray-600 group-hover:text-[#2D5A27] transition-colors">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest">
                  Version 2.3.0 • Made for Farmers
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
