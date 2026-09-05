import React, { useState } from 'react';
import { 
  Search, Menu, Sprout, X, Landmark, Phone, Newspaper, User, 
  Calculator, PhoneCall, Bug, TrendingUp, ShoppingCart, Sparkles, 
  Info, ShieldCheck, FileText, RotateCcw, AlertTriangle, ShieldAlert, 
  HelpCircle, Truck, Scale, Award, Camera, CloudSun, Package, MessageCircle,
  Home, ShoppingBag
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import SmartImage from './SmartImage';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoEnlarged, setIsLogoEnlarged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { appContent, isAdmin, legalPagesContent } = useAppContext();
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

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाजार',
    tagline: 'किसान का भरोसा, हमारी पहचान',
    logo: ''
  };

  const contactData = legalPagesContent?.contactUs;
  const phoneNumber = contactData?.phone || '8982338046';
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  interface MenuItem {
    icon: React.ElementType;
    label: string;
    path: string;
    color: string;
    isExternal?: boolean;
  }

  const mainMenuItems: MenuItem[] = [
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
      <header id="app-header" className="fixed top-0 left-0 right-0 bg-[#2D5A27] text-white z-50 shadow-md">
        {/* ======================================================== */}
        {/* MOBILE VIEW (< md) - EXACTLY PRESERVED MOBILE EXPERIENCE */}
        {/* ======================================================== */}
        <div className="md:hidden max-w-md mx-auto px-4 py-3">
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
        </div>

        {/* ======================================================== */}
        {/* TABLET VIEW (md to lg) - PRESERVES TABLET DRAWER NAVIGATION */}
        {/* ======================================================== */}
        <div className="hidden md:flex lg:hidden max-w-7xl mx-auto px-4 sm:px-6 py-2.5 items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Link to={isAdmin ? "/admin" : "/"} className="flex items-center gap-3 group">
              <div 
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner p-1 cursor-pointer"
                onClick={!isAdmin ? handleLogoClick : undefined}
              >
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
                <h1 className="text-base font-black tracking-tight text-white leading-tight">
                  {branding.name}
                </h1>
                <p className="text-[10px] text-[#EAB308] font-bold">
                  {branding.tagline}
                </p>
              </div>
            </Link>
          </div>

          {/* Tablet Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(searchQuery);
            }}
            className="relative flex-1 max-w-xs"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="दवाई या बीज खोजें..."
              className="w-full bg-white/10 border border-white/25 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:bg-white/20 placeholder:text-white/70 text-white transition-all"
            />
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-white/70" />
          </form>

          {/* Tablet Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isAdmin && (
              <Link
                to="/admin"
                className="px-2.5 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-black transition-all flex items-center gap-1"
                title="एडमिन पैनल"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>एडमिन</span>
              </Link>
            )}

            <Link
              to="/cart"
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-all relative border border-white/15 text-white"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span>कार्ट</span>
              {cartCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              to="/profile"
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white border border-white/10"
              title="प्रोफाइल"
            >
              <User className="w-4 h-4" />
            </Link>

            {/* Tablet Hamburger Button (Preserved for Tablet) */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white border border-white/10"
              title="सभी सेवाएं व नीतियां"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LAPTOP & DESKTOP VIEW (lg+) - PROFESSIONAL 2-TIER WEBSITE HEADER */}
        {/* NO Side Drawer, NO Hamburger Menu Button, Clean Wide Navigation */}
        {/* ======================================================== */}
        <div className="hidden lg:block w-full">
          {/* Tier 1: Main Header Bar */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between gap-6">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div 
                className="w-13 h-13 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-md p-1.5 cursor-pointer hover:scale-105 transition-transform"
                onClick={!isAdmin ? handleLogoClick : undefined}
                title="लोगो बड़ा करें"
              >
                <SmartImage
                  src={branding.logo}
                  fallbackSrc="/icon-192.png"
                  alt={branding.name}
                  className="w-full h-full"
                  objectFit="contain"
                  priority
                />
              </div>
              <Link to={isAdmin ? "/admin" : "/"} className="group">
                <h1 className="text-xl font-black tracking-tight text-white leading-tight group-hover:text-amber-300 transition-colors">
                  {branding.name}
                </h1>
                <p className="text-xs text-[#EAB308] font-bold tracking-wide">
                  {branding.tagline}
                </p>
              </Link>
            </div>

            {/* Center: Search Bar (Inspired by BigHaat) */}
            <div className="flex-1 max-w-xl mx-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch(searchQuery);
                }}
                className="relative flex items-center"
              >
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="दवाई, खाद, बीज या कीटनाशक खोजें..."
                    className="w-full bg-white/10 hover:bg-white/15 focus:bg-white focus:text-[#16311A] border border-white/25 rounded-2xl py-2.5 pl-11 pr-24 text-sm transition-all placeholder:text-white/70 focus:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EAB308] text-white shadow-inner"
                  />
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/70" />
                </div>
                <button
                  type="submit"
                  className="absolute right-1.5 px-4 py-1.5 bg-[#EAB308] hover:bg-[#d4a107] text-[#16311A] font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  खोजें
                </button>
              </form>
            </div>

            {/* Right: Quick Customer Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Missed Call / Helpline Badge */}
              <a
                href={`tel:${cleanPhone}`}
                className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl text-white transition-all group"
                title="कृषि हेल्पलाइन पर कॉल करें"
              >
                <div className="w-8 h-8 rounded-xl bg-[#EAB308]/20 flex items-center justify-center text-[#EAB308] shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">हेल्पलाइन</p>
                  <p className="text-xs font-black text-white">{phoneNumber}</p>
                </div>
              </a>

              {/* My Orders */}
              <NavLink
                to="/my-orders"
                className={({ isActive }) => cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border",
                  isActive 
                    ? "bg-white/20 text-white border-white/30 shadow-xs" 
                    : "bg-white/10 hover:bg-white/15 text-white/90 border-white/10 hover:text-white"
                )}
                title="मेरे ऑर्डर"
              >
                <Package className="w-4 h-4 text-emerald-300" />
                <span>मेरे ऑर्डर</span>
              </NavLink>

              {/* User Profile */}
              <NavLink
                to="/profile"
                className={({ isActive }) => cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border",
                  isActive 
                    ? "bg-white/20 text-white border-white/30 shadow-xs" 
                    : "bg-white/10 hover:bg-white/15 text-white/90 border-white/10 hover:text-white"
                )}
                title="प्रोफाइल"
              >
                <User className="w-4 h-4 text-amber-300" />
                <span>प्रोफाइल</span>
              </NavLink>

              {/* Shopping Cart */}
              <NavLink
                to="/cart"
                className={({ isActive }) => cn(
                  "px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 relative border shadow-xs",
                  isActive 
                    ? "bg-[#EAB308] text-[#16311A] border-[#EAB308]" 
                    : "bg-white/15 hover:bg-white/25 text-white border-white/20"
                )}
                title="शॉपिंग कार्ट देखें"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>कार्ट</span>
                {cartCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-sm">
                    {cartCount}
                  </span>
                )}
              </NavLink>

              {/* Admin Panel Quick Badge (if admin) */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3 py-2 bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border border-amber-400/40 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs"
                  title="एडमिन पैनल"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>एडमिन</span>
                </Link>
              )}
            </div>
          </div>

          {/* Tier 2: Sub-Navigation Bar (Wide Horizontal Categories & Services) */}
          <div className="bg-[#20431D] border-t border-white/10 shadow-inner">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-2 flex items-center">
              <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 w-full">
                <NavLink 
                  to="/" 
                  end
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Home className="w-3.5 h-3.5" /> मुख्य पृष्ठ
                </NavLink>

                <NavLink 
                  to="/products" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> कृषि बाज़ार
                </NavLink>

                <NavLink 
                  to="/ai-call" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 text-amber-300",
                    isActive ? "bg-white/20 text-amber-200 shadow-xs" : "hover:text-amber-200 hover:bg-white/10"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI विशेषज्ञ कॉल
                </NavLink>

                <NavLink 
                  to="/disease" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Camera className="w-3.5 h-3.5" /> बीमारी जाँच
                </NavLink>

                <NavLink 
                  to="/mandi" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> मंडी भाव
                </NavLink>

                <NavLink 
                  to="/news" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Newspaper className="w-3.5 h-3.5" /> कृषि समाचार
                </NavLink>

                <NavLink 
                  to="/weather" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <CloudSun className="w-3.5 h-3.5" /> मौसम
                </NavLink>

                <NavLink 
                  to="/schemes" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Landmark className="w-3.5 h-3.5" /> सरकारी योजनाएं
                </NavLink>

                <NavLink 
                  to="/calculator" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Calculator className="w-3.5 h-3.5" /> कैलकुलेटर
                </NavLink>

                <NavLink 
                  to="/about" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Info className="w-3.5 h-3.5" /> हमारे बारे में
                </NavLink>

                <NavLink 
                  to="/contact" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white shadow-xs" : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Phone className="w-3.5 h-3.5" /> संपर्क करें
                </NavLink>
              </nav>
            </div>
          </div>
        </div>

        {/* Logo Enlargement Modal */}
        <AnimatePresence>
          {isLogoEnlarged && (
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
                  className="absolute -top-4 -right-4 w-10 h-10 bg-[#2D5A27] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20 cursor-pointer"
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
          )}
        </AnimatePresence>
      </header>

      {/* Side Menu Overlay - STRICTLY MOBILE & TABLET ONLY (lg:hidden) */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-[320px] bg-white z-[101] shadow-2xl flex flex-col lg:hidden"
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
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full cursor-pointer">
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
                      className="w-full flex items-center gap-3.5 p-3 hover:bg-gray-50 rounded-2xl transition-colors text-left cursor-pointer"
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
                      className="w-full flex items-center gap-3.5 p-2.5 hover:bg-emerald-50/50 rounded-2xl transition-colors text-left group cursor-pointer"
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
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
