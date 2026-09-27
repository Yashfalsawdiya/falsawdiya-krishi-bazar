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
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { cn } from '../lib/utils';
import SmartImage from './SmartImage';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoEnlarged, setIsLogoEnlarged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { appContent, isAdmin, legalPagesContent } = useAppContext();
  const { cartCount } = useCart();
  const { t, isHindi } = useLanguage();

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
    { icon: User, label: t('menu_my_profile'), path: '/profile', color: 'text-purple-600' },
    { icon: Info, label: t('menu_about_us'), path: '/about', color: 'text-emerald-700' },
    { icon: Phone, label: t('menu_ai_call'), path: '/ai-call', color: 'text-[#2D5A27]' },
    { icon: Sparkles, label: t('menu_ai_knowledge'), path: '/ai-product-knowledge', color: 'text-amber-500' },
    { icon: TrendingUp, label: t('menu_mandi'), path: '/mandi', color: 'text-green-600' },
    { icon: Bug, label: t('menu_encyclopedia'), path: '/encyclopedia', color: 'text-rose-600' },
    { icon: Landmark, label: t('menu_schemes'), path: '/schemes', color: 'text-blue-600' },
    { icon: Calculator, label: t('menu_calculator'), path: '/calculator', color: 'text-orange-600' },
    { icon: PhoneCall, label: t('menu_helpline'), path: '/helpline', color: 'text-cyan-600' },
  ];

  const legalMenuItems: MenuItem[] = [
    { icon: Award, label: t('menu_licensing'), path: '/licensing-disclaimer', color: 'text-emerald-800 font-bold' },
    { icon: HelpCircle, label: t('menu_faq'), path: '/faq', color: 'text-emerald-600' },
    { icon: Truck, label: t('menu_shipping'), path: '/shipping-policy', color: 'text-emerald-700' },
    { icon: ShieldCheck, label: t('menu_privacy'), path: '/privacy', color: 'text-blue-600' },
    { icon: FileText, label: t('menu_terms'), path: '/terms', color: 'text-amber-600' },
    { icon: RotateCcw, label: t('menu_refund'), path: '/refund-policy', color: 'text-rose-600' },
    { icon: AlertTriangle, label: t('menu_disclaimer'), path: '/disclaimer', color: 'text-yellow-600' },
    { icon: ShieldAlert, label: t('menu_safety'), path: '/safety-guidelines', color: 'text-red-600' },
    { icon: Scale, label: t('menu_grievance'), path: '/grievance', color: 'text-blue-700' },
    { icon: PhoneCall, label: t('menu_contact'), path: '/contact', color: 'text-teal-600' },
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
                <h1 className="text-lg font-bold leading-snug">{branding.name}</h1>
                <p className="text-[11px] text-[#EAB308] font-medium leading-normal">
                  {isHindi ? branding.tagline : t('brand_tagline')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSelector variant="compact" />
              <Link to="/cart" className="p-1 hover:bg-white/10 rounded-full transition-colors relative" title={t('cart')}>
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full border border-[#2D5A27]">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="p-1 hover:bg-white/10 rounded-full transition-colors" title={t('profile')}>
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </Link>
              <button onClick={() => setIsMenuOpen(true)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer" title={t('menu_all_services')}>
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
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
                placeholder={t('search_placeholder')} 
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
                <h1 className="text-base font-bold text-white leading-snug">
                  {branding.name}
                </h1>
                <p className="text-[11px] text-[#EAB308] font-medium">
                  {isHindi ? branding.tagline : t('brand_tagline')}
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
              placeholder={t('search_placeholder')}
              className="w-full bg-white/10 border border-white/25 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:bg-white/20 placeholder:text-white/70 text-white transition-all font-normal"
            />
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-white/70" />
          </form>

          {/* Tablet Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSelector variant="compact" />

            {isAdmin && (
              <Link
                to="/admin"
                className="px-2.5 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                title={t('admin_panel')}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('admin')}</span>
              </Link>
            )}

            <Link
              to="/cart"
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all relative border border-white/15 text-white"
              title={t('cart')}
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span>{t('cart')}</span>
              {cartCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              to="/profile"
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white border border-white/10"
              title={t('profile')}
            >
              <User className="w-4 h-4" />
            </Link>

            {/* Tablet Hamburger Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white border border-white/10 cursor-pointer"
              title={t('menu_all_services')}
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
          <div className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1740px] mx-auto px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 flex items-center justify-between gap-6">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div 
                className="w-13 h-13 2xl:w-14 2xl:h-14 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-md p-1.5 cursor-pointer hover:scale-105 transition-transform"
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
                <h1 className="text-xl 2xl:text-2xl font-bold text-white leading-snug group-hover:text-amber-300 transition-colors">
                  {branding.name}
                </h1>
                <p className="text-xs 2xl:text-sm text-[#EAB308] font-medium">
                  {isHindi ? branding.tagline : t('brand_tagline')}
                </p>
              </Link>
            </div>

            {/* Center: Search Bar (Inspired by BigHaat) */}
            <div className="flex-1 max-w-xl xl:max-w-2xl 2xl:max-w-3xl mx-4 2xl:mx-8">
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
                    placeholder={t('search_placeholder')}
                    className="w-full bg-white/10 hover:bg-white/15 focus:bg-white focus:text-[#16311A] border border-white/25 rounded-2xl py-2.5 pl-11 pr-24 text-sm transition-all placeholder:text-white/70 focus:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EAB308] text-white shadow-inner font-normal"
                  />
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/70" />
                </div>
                <button
                  type="submit"
                  className="absolute right-1.5 px-4 py-1.5 bg-[#EAB308] hover:bg-[#d4a107] text-[#16311A] font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  {t('search_button')}
                </button>
              </form>
            </div>

            {/* Right: Quick Customer Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Language Selector */}
              <LanguageSelector variant="desktop" />

              {/* Missed Call / Helpline Badge */}
              <a
                href={`tel:${cleanPhone}`}
                className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl text-white transition-all group"
                title={t('helpline_call')}
              >
                <div className="w-8 h-8 rounded-xl bg-[#EAB308]/20 flex items-center justify-center text-[#EAB308] shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-emerald-200 font-medium">{t('helpline')}</p>
                  <p className="text-xs font-bold text-white">{phoneNumber}</p>
                </div>
              </a>

              {/* My Orders */}
              <NavLink
                to="/my-orders"
                className={({ isActive }) => cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 border",
                  isActive 
                    ? "bg-white/20 text-white border-white/30 shadow-xs" 
                    : "bg-white/10 hover:bg-white/15 text-white/90 border-white/10 hover:text-white"
                )}
                title={t('my_orders')}
              >
                <Package className="w-4 h-4 text-emerald-300" />
                <span>{t('my_orders')}</span>
              </NavLink>

              {/* User Profile */}
              <NavLink
                to="/profile"
                className={({ isActive }) => cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 border",
                  isActive 
                    ? "bg-white/20 text-white border-white/30 shadow-xs" 
                    : "bg-white/10 hover:bg-white/15 text-white/90 border-white/10 hover:text-white"
                )}
                title={t('profile')}
              >
                <User className="w-4 h-4 text-amber-300" />
                <span>{t('profile')}</span>
              </NavLink>

              {/* Shopping Cart */}
              <NavLink
                to="/cart"
                className={({ isActive }) => cn(
                  "px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 relative border shadow-xs",
                  isActive 
                    ? "bg-[#EAB308] text-[#16311A] border-[#EAB308]" 
                    : "bg-white/15 hover:bg-white/25 text-white border-white/20"
                )}
                title={t('cart')}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{t('cart')}</span>
                {cartCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-sm">
                    {cartCount}
                  </span>
                )}
              </NavLink>

              {/* Admin Panel Quick Badge (if admin) */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3 py-2 bg-amber-500/25 hover:bg-amber-500/35 text-amber-300 border border-amber-400/40 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
                  title={t('admin_panel')}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('admin')}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Tier 2: Sub-Navigation Bar (Wide Horizontal Categories & Services) */}
          <div className="bg-[#20431D] border-t border-white/10 shadow-inner">
            <div className="max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1740px] mx-auto px-6 lg:px-8 xl:px-10 2xl:px-12 py-2 flex items-center">
              <nav className="flex items-center gap-1 xl:gap-2 2xl:gap-3 overflow-x-auto scrollbar-none py-0.5 w-full">
                <NavLink 
                  to="/" 
                  end
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <Home className="w-3.5 h-3.5" /> {t('nav_home')}
                </NavLink>

                <NavLink 
                  to="/products" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> {t('nav_products')}
                </NavLink>

                <NavLink 
                  to="/ai-call" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5 text-amber-300",
                    isActive ? "bg-white/20 text-amber-200 font-semibold shadow-xs" : "hover:text-amber-200 hover:bg-white/10 font-medium"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" /> {t('nav_ai_call')}
                </NavLink>

                <NavLink 
                  to="/disease" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <Camera className="w-3.5 h-3.5" /> {t('nav_disease')}
                </NavLink>

                <NavLink 
                  to="/mandi" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> {t('nav_mandi')}
                </NavLink>

                <NavLink 
                  to="/news" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <Newspaper className="w-3.5 h-3.5" /> {t('nav_news')}
                </NavLink>

                <NavLink 
                  to="/weather" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <CloudSun className="w-3.5 h-3.5" /> {t('nav_weather')}
                </NavLink>

                <NavLink 
                  to="/schemes" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <Landmark className="w-3.5 h-3.5" /> {t('nav_schemes')}
                </NavLink>

                <NavLink 
                  to="/calculator" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <Calculator className="w-3.5 h-3.5" /> {t('nav_calculator')}
                </NavLink>

                <NavLink 
                  to="/about" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <Info className="w-3.5 h-3.5" /> {t('menu_about_us')}
                </NavLink>

                <NavLink 
                  to="/licensing-disclaimer" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <Award className="w-3.5 h-3.5" /> {t('menu_licensing')}
                </NavLink>

                <NavLink 
                  to="/contact" 
                  className={({ isActive }) => cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive ? "bg-white/20 text-white font-semibold shadow-xs" : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                  )}
                >
                  <Phone className="w-3.5 h-3.5" /> {t('menu_contact')}
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
                <h2 className="text-xl font-bold">
                  {isHindi ? 'नमस्ते, किसान भाई!' : 'Welcome, Farmer Friend!'}
                </h2>
                <p className="text-xs text-white/70 mt-1">
                  {isHindi ? `${branding.name} में आपका स्वागत है` : `Welcome to ${branding.name}`}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Language Selector Option */}
                <LanguageSelector variant="drawer" />

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
                  <p className="text-[11px] font-semibold text-gray-500 px-3 mb-1">
                    {t('menu_policies_heading')}
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
                <p className="text-[10px] text-gray-400 text-center font-medium">
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
