import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import OfflineIndicator from './OfflineIndicator';
import SmartImage from './SmartImage';
import { useAppContext } from '../context/AppContext';
import { 
  LogIn, Sprout, Loader2, Home, ShoppingBag, TrendingUp, Camera, CloudSun, Calendar,
  Bug, Landmark, Calculator, Newspaper, Sparkles, Phone, User, ShieldAlert, Search, LogOut
} from 'lucide-react';

const Layout: React.FC = () => {
  const { user, loading, login, appContent, isAdmin } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  // Search submit handler for desktop header
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Helper for Hindi dates based on today
  const getHindiDateStr = () => {
    const now = new Date();
    const months = [
      'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 
      'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
    ];
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 text-center flex flex-col items-center justify-center">
          <OfflineIndicator />
          <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin mb-4" />
          <p className="text-sm font-bold text-[#2D5A27]">लोड हो रहा है...</p>
        </div>
      </div>
    );
  }

  // Maintenance / App Inactive Mode
  if (appContent?.isAppActive === false && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border-2 border-red-100 overflow-hidden p-2">
            <SmartImage 
              src="/icon-192.png" 
              alt="Maintenance" 
              className="w-full h-full opacity-50 grayscale" 
              objectFit="contain" 
            />
          </div>
          <h1 className="text-2xl font-black text-[#4A3728] mb-4">ऐप अभी बंद है</h1>
          <p className="text-gray-500 mb-8 leading-relaxed text-sm">
            नमस्ते किसान भाइयों! ऐप में कुछ सुधार कार्य चल रहा है, इसलिए यह अभी उपलब्ध नहीं है। कृपया कुछ समय बाद प्रयास करें।
          </p>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 w-full">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
              Maintenance Mode Active
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Undefined user / Guest screen
  if (!user) {
    const branding = appContent?.branding || {
      name: 'फल्सावदिया कृषि बाज़ार',
      tagline: 'किसान का भरोसा, हमारी पहचान',
      logo: ''
    };
    const loginText = appContent?.loginText || 'ऐप की सुविधाओं का उपयोग करने के लिए कृपया अपनी Gmail ID से लॉगिन करें।';

    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl md:shadow-2xl border border-gray-100 overflow-hidden flex flex-col relative p-8 md:p-10 text-center">
          <OfflineIndicator />
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-transparent rounded-3xl shadow-xl flex items-center justify-center mb-8 border-2 border-[#2D5A27]/10 overflow-hidden p-2 relative">
              <SmartImage 
                src={branding.logo} 
                fallbackSrc="/icon-192.png"
                alt="Logo" 
                className="w-full h-full relative z-10" 
                objectFit="contain" 
                priority
              />
              <div className="absolute inset-0 bg-white/40 z-0" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#4A3728] mb-2">{branding.name}</h1>
            <p className="text-gray-500 mb-8 font-medium text-sm leading-snug">{branding.tagline}</p>
            
            <div className="w-full space-y-4">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-6">
                <p className="text-sm text-gray-600 leading-relaxed font-semibold">
                  {loginText}
                </p>
              </div>
              
              <button 
                onClick={login}
                className="w-full bg-[#2D5A27] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-[#1E3E1A] active:scale-95 transition-all cursor-pointer"
              >
                <LogIn className="w-6 h-6" /> Google से लॉगिन करें
              </button>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Safe & Secure Login • Powered by Google
            </p>
          </div>
        </div>
      </div>
    );
  }

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाज़ार',
    tagline: 'किसान का भरोसा, हमारी पहचान',
    logo: ''
  };

  // Nav items group definition compatible with user screenshot
  const menuGroups = [
    {
      title: "",
      items: [
        { icon: Home, label: 'होम (Home)', path: '/' },
        { icon: ShoppingBag, label: 'कृषि बाज़ार (Store)', path: '/products' },
        { icon: TrendingUp, label: 'ताजा मंडी भाव (Mandi)', path: '/mandi' },
        { icon: Camera, label: 'फसल रोग जाँच (Detection)', path: '/disease' },
        { icon: CloudSun, label: 'मौसम पूर्वानुमान (Weather)', path: '/weather' },
      ]
    },
    {
      title: "कृषि गाइड और टूल",
      items: [
        { icon: Calendar, label: 'फसल कैलेंडर', path: '/calendar' },
        { icon: Bug, label: 'रोग-कीट निर्देशिका', path: '/encyclopedia' },
        { icon: Landmark, label: 'सरकारी योजनाएं', path: '/schemes' },
        { icon: Calculator, label: 'खेती कैलकुलेटर', path: '/calculator' },
        { icon: Newspaper, label: 'ताज़ा समाचार (Agri News)', path: '/news' },
      ]
    },
    {
      title: "सपोर्ट और विशेषज्ञ",
      items: [
        { icon: Sparkles, label: 'AI कृषि विशेषज्ञ कॉल', path: '/ai-call', isSpecial: true },
        { icon: Phone, label: 'हेल्पलाइन डायरेक्टरी', path: '/helpline' },
      ]
    },
    {
      title: "खाता",
      items: [
        { icon: User, label: 'मेरा प्रोफाइल (Profile)', path: '/profile' },
      ]
    }
  ];

  const sidebarIsActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] md:bg-[#F5F2ED] flex flex-row w-full md:max-w-none md:mx-0 md:shadow-none max-w-md mx-auto shadow-2xl relative overflow-hidden md:overflow-visible font-sans">
      <OfflineIndicator />

      {/* ======================================================== */}
      {/* 1. DESKTOP LEFT SIDEBAR (Sticky on scroll, desktop-only) */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-72 lg:w-80 bg-white border-r border-gray-200/80 flex-col h-screen sticky top-0 flex-shrink-0 z-40 select-none">
        
        {/* LOGO & BRANDING BLOCK */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-[#2D5A27]/5 rounded-xl border border-[#2D5A27]/10 flex items-center justify-center p-1.5 overflow-hidden">
            <SmartImage 
              src={branding.logo} 
              fallbackSrc="/icon-192.png"
              alt="Logo" 
              className="w-full h-full" 
              objectFit="contain" 
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-extrabold text-[#4A3728] tracking-tight truncate leading-tight">
              {branding.name}
            </h1>
            <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5 leading-none">
              {branding.tagline}
            </p>
          </div>
        </div>

        {/* NAVIGATION MENUS WITH SCROLL */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              {group.title && (
                <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => {
                  const active = sidebarIsActive(item.path);
                  return (
                    <NavLink
                      key={`${item.path}-${itemIdx}`}
                      to={item.path}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group text-sm font-bold ${
                        active 
                          ? "bg-[#2D5A27] text-white shadow-md shadow-[#2D5A27]/10" 
                          : item.isSpecial 
                            ? "text-[#2D5A27] hover:bg-[#2D5A27]/5 bg-emerald-500/5" 
                            : "text-gray-600 hover:bg-gray-50 hover:text-[#2D5A27]"
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${
                        active 
                          ? "text-white" 
                          : item.isSpecial 
                            ? "text-[#2D5A27] animate-pulse" 
                            : "text-gray-400 group-hover:text-[#2D5A27]"
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ADMIN LINK (COMPATIBLE WITH SCREENS) */}
          {isAdmin && (
            <div className="space-y-1.5 border-t border-gray-100 pt-3">
              <h3 className="px-3 text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> प्रशासक (ADMIN)
              </h3>
              <div className="space-y-1">
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all font-bold text-sm ${
                    isActive 
                      ? "bg-red-600 text-white shadow-md shadow-red-600/10" 
                      : "text-red-600 hover:bg-red-50"
                  }`}
                >
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <span>एडमिन पैनल (Admin)</span>
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* LOGGED IN USER SECTION */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <button 
            onClick={() => navigate('/profile')} 
            className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 bg-white flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            {user.photoURL ? (
              <SmartImage 
                src={user.photoURL} 
                alt="User profile" 
                className="w-full h-full" 
                objectFit="cover" 
              />
            ) : (
              <div className="w-full h-full bg-[#2D5A27]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#2D5A27]" />
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0 leading-tight">
            <h4 className="text-xs font-bold text-gray-800 truncate">
              {user.displayName || 'किसान साथी'}
            </h4>
            <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">
              {user.email || 'guest@farm.com'}
            </p>
          </div>
        </div>

      </aside>

      {/* ======================================================== */}
      {/* 2. DYNAMIC WORKSPACE (Fluid right section) */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-screen md:h-screen bg-[#F5F2ED] relative md:overflow-y-auto">
        
        {/* MOBILE HEADER (md:hidden) */}
        <div className="md:hidden">
          <Header />
        </div>

        {/* DESKTOP HEADER BAR (sticky top-0, desktop-only) */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#F5F2ED] border-b border-gray-200/50 sticky top-0 z-30 select-none">
          
          {/* WELCOME / DATE BANNER */}
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-[#2D5A27]" />
            <div>
              <p className="text-sm font-black text-gray-800 leading-none">
                स्वागत है, {user.displayName?.split(' ')[0] || 'किसान साथी'}!
              </p>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">
                {getHindiDateStr()}
              </p>
            </div>
          </div>

          {/* SEARCH, ACTION BUTTONS & MINI PROFILE */}
          <div className="flex items-center gap-4">
            
            {/* SEARCH FORM */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="दवाई या बीज खोजें..." 
                className="bg-white border border-gray-200/80 rounded-full py-2.5 pl-10 pr-4 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27] text-gray-700 font-medium transition-all"
              />
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            </form>

            {/* GOLD AI TRIGGER PILL */}
            <button 
              onClick={() => navigate('/ai-call')}
              className="border border-[#D4AF37] text-[#B25E00] bg-[#FFDF73]/5 hover:bg-[#FFDF73]/15 px-4 py-2.5 rounded-full font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              AI विशेषज्ञ परामर्श
            </button>

            {/* QUICK ACTIONS SIGN OUT */}
            <button 
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full overflow-hidden border border-white hover:border-[#2D5A27] transition-colors focus:outline-none cursor-pointer"
              title="मेरा प्रोफाइल"
            >
              {user.photoURL ? (
                <SmartImage 
                  src={user.photoURL} 
                  alt="Avatar" 
                  className="w-full h-full" 
                  objectFit="cover" 
                />
              ) : (
                <div className="w-full h-full bg-[#2D5A27] flex items-center justify-center text-white text-xs font-bold">
                  {user.displayName?.charAt(0) || 'K'}
                </div>
              )}
            </button>

          </div>

        </header>

        {/* MAIN ROUTE VIEW */}
        <main className="flex-1 pb-24 pt-36 px-4 md:pb-12 md:pt-6 md:px-8 max-w-full md:max-w-7xl md:mx-auto md:w-full">
          <Outlet />
        </main>

        {/* MOBILE NAVIGATION BAR (md:hidden) */}
        <div className="md:hidden">
          <BottomNav />
        </div>

      </div>

    </div>
  );
};

export default Layout;
