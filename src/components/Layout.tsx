import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import OfflineIndicator from './OfflineIndicator';
import SmartImage from './SmartImage';
import { useAppContext } from '../context/AppContext';
import { 
  LogIn, Sprout, Loader2, Home, ShoppingBag, 
  TrendingUp, Camera, CloudSun, Calendar, Bug, 
  Landmark, Calculator, Newspaper, Phone, 
  PhoneCall, User, Shield, LogOut, Search, Sparkles 
} from 'lucide-react';

const Layout: React.FC = () => {
  const { user, loading, login, logout, appContent, isAdmin } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [desktopSearch, setDesktopSearch] = useState('');

  const branding = appContent?.branding || {
    name: 'फल्सावदिया कृषि बाज़ार',
    tagline: 'किसान का भरोसा, हमारी पहचान',
    logo: ''
  };

  const loginText = appContent?.loginText || 'ऐप की सुविधाओं का उपयोग करने के लिए कृपया अपनी Gmail ID से लॉगिन करें।';

  const getHindiDateStr = () => {
    const months = [
      'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
      'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
    ];
    const today = new Date();
    const day = today.getDate();
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleDesktopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (desktopSearch.trim()) {
      navigate(`/products?search=${encodeURIComponent(desktopSearch.trim())}`);
    }
  };

  // Sidebar navigation data arrays
  const mainNavItems = [
    { icon: Home, label: 'होम (Home)', path: '/' },
    { icon: ShoppingBag, label: 'कृषि बाज़ार (Store)', path: '/products' },
    { icon: TrendingUp, label: 'ताजा मंडी भाव (Mandi)', path: '/mandi' },
    { icon: Camera, label: 'फसल रोग जाँच (Detection)', path: '/disease' },
    { icon: CloudSun, label: 'मौसम पूर्वानुमान (Weather)', path: '/weather' }
  ];

  const guideNavItems = [
    { icon: Calendar, label: 'फसल कैलेंडर', path: '/calendar' },
    { icon: Bug, label: 'रोग-कीट निर्देशिका', path: '/encyclopedia' },
    { icon: Landmark, label: 'सरकारी योजनाएं', path: '/schemes' },
    { icon: Calculator, label: 'खेती कैलकुलेटर', path: '/calculator' },
    { icon: Newspaper, label: 'ताज़ा समाचार (Agri News)', path: '/news' }
  ];

  const supportNavItems = [
    { icon: Phone, label: 'AI कृषि विशेषज्ञ कॉल', path: '/ai-call' },
    { icon: PhoneCall, label: 'हेल्पलाइन डायरेक्टरी', path: '/helpline' }
  ];

  const accountNavItems = [
    { icon: User, label: 'मेरा प्रोफाइल (Profile)', path: '/profile' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center max-w-sm mx-auto shadow-2xl">
        <OfflineIndicator />
        <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
        <p className="mt-4 text-sm font-bold text-[#2D5A27]">लोड हो रहा है...</p>
      </div>
    );
  }

  // Maintenance / App Inactive Mode
  if (appContent?.isAppActive === false && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center max-w-md mx-auto shadow-2xl p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border-2 border-red-100 overflow-hidden p-2">
          <SmartImage 
            src="/icon-192.png" 
            alt="Maintenance" 
            className="w-full h-full opacity-50 grayscale" 
            objectFit="contain" 
          />
        </div>
        <h1 className="text-2xl font-black text-[#4A3728] mb-4">ऐप अभी बंद है</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          नमस्ते किसान भाइयों! ऐप में कुछ सुधार कार्य चल रहा है, इसलिए यह अभी उपलब्ध नहीं है। कृपया कुछ समय बाद प्रयास करें।
        </p>
        <div className="p-4 bg-white rounded-2xl border border-gray-100 w-full">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            Maintenance Mode Active
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden md:max-w-none md:shadow-none md:flex-row md:items-stretch">
        {/* Left Side Branding Visual on Desktop (Hidden on Mobile) */}
        <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-[#2D5A27] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1.5 shadow-md">
              <SmartImage src={branding.logo} fallbackSrc="/icon-192.png" alt="Logo" className="w-full h-full" objectFit="contain" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">{branding.name}</h2>
              <p className="text-[11px] text-[#EAB308] font-bold">{branding.tagline}</p>
            </div>
          </div>
          <div className="relative z-10 my-auto max-w-lg space-y-4">
            <h1 className="text-4xl font-black leading-tight text-white mb-2">किसान का भरोसा, तकनीक और उन्नति का संगम।</h1>
            <p className="text-green-100/90 text-lg">फसलों की सुरक्षा, उच्च उत्पादकता, दैनिक मंडी भाव और विशेषज्ञ सलाह बस एक क्लिक की दूरी पर।</p>
          </div>
          <div className="relative z-10 text-xs text-green-200/50 font-bold uppercase tracking-widest">
            Falsawdiya Krishi Bazaar © 2026
          </div>
        </div>

        {/* Right Side Login form (Centered on mobile, right panel on desktop) */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center md:max-w-xl md:bg-white md:shadow-2xl z-10 relative">
          <div className="w-24 h-24 bg-transparent rounded-3xl shadow-xl flex items-center justify-center mb-8 border-2 border-[#2D5A27]/10 overflow-hidden p-2 relative">
            <SmartImage 
              src={branding.logo} 
              fallbackSrc="/icon-192.png"
              alt="Logo" 
              className="w-full h-full relative z-10" 
              objectFit="contain" 
              priority
            />
            <div className="absolute inset-0 bg-white/40 -z-10" />
          </div>
          <h1 className="text-3xl font-black text-[#4A3728] mb-2">{branding.name}</h1>
          <p className="text-gray-500 mb-12 font-medium">{branding.tagline}</p>
          
          <div className="w-full space-y-4 max-w-md mx-auto">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8">
              <p className="text-sm text-gray-600 leading-relaxed">
                {loginText}
              </p>
            </div>
            
            <button 
              onClick={login}
              className="w-full bg-[#2D5A27] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform cursor-pointer"
            >
              <LogIn className="w-6 h-6" /> Google से लॉगिन करें
            </button>
          </div>
          <div className="p-6 text-center absolute bottom-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Safe & Secure Login • Powered by Google
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex flex-col md:flex-row md:max-w-none md:shadow-none max-w-md mx-auto shadow-2xl relative overflow-hidden">
      <OfflineIndicator />
      
      {/* 📱 MOBILE NAVIGATION BAR - Hidden on Desktop */}
      <div className="block md:hidden">
        <Header />
      </div>

      {/* 🖥️ DESKTOP LEFT SIDEBAR - Hidden on Mobile */}
      <aside className="hidden md:flex flex-col md:w-64 lg:w-80 bg-white text-gray-700 h-screen shrink-0 border-r border-gray-100 z-20 shadow-sm">
        {/* Sidebar Header: Branding logo and Name */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1.5 shrink-0 shadow-sm border border-gray-100">
            <SmartImage 
              src={branding.logo} 
              fallbackSrc="/icon-192.png" 
              alt="Logo" 
              className="w-full h-full" 
              objectFit="contain" 
            />
          </div>
          <div>
            <h1 className="text-base font-black leading-tight tracking-tight text-[#2D5A27]">{branding.name}</h1>
            <p className="text-[10px] text-amber-600 font-bold">{branding.tagline}</p>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto py-5 px-4 space-y-6 scrollbar-thin">
          {/* Group 1: मुख्य */}
          <div className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-[#2D5A27]/8 text-[#2D5A27] shadow-sm font-black' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#2D5A27]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Group 2: कृषि गाइड और टूल */}
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest pl-4 mb-2">कृषि गाइड और टूल</p>
            {guideNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-[#2D5A27]/8 text-[#2D5A27] shadow-sm font-black' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#2D5A27]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Group 3: सपोर्ट और विशेषज्ञ */}
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest pl-4 mb-2">सपोर्ट और विशेषज्ञ</p>
            {supportNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-[#2D5A27]/8 text-[#2D5A27] shadow-sm font-black' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#2D5A27]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Group 4: खाता */}
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest pl-4 mb-2">खाता</p>
            {accountNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-[#2D5A27]/8 text-[#2D5A27] shadow-sm font-black' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-[#2D5A27]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Admin panel if user is admin */}
          {isAdmin && (
            <div className="space-y-1 pt-2">
              <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest pl-4 mb-2">प्रशासक (ADMIN)</p>
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  location.pathname === '/admin' 
                    ? 'bg-rose-50 text-rose-700 shadow-sm font-black' 
                    : 'text-gray-600 hover:bg-rose-50/50 hover:text-rose-700'
                }`}
              >
                <Shield className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                <span className={location.pathname === '/admin' ? 'text-rose-700' : 'text-gray-600'}>एडमिन पैनल (Admin)</span>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar Footer User Profile Row */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-2 shrink-0 bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full border border-gray-200 object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 font-black text-sm text-[#2D5A27]">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'K'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate leading-none mb-1">
                {user?.displayName || 'किसान भाई'}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
            title="लॉगआउट"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* 🖥️ DESKTOP MAIN SPACE */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden bg-[#F8F6F2]">
        
        {/* DESKTOP HEADER - Hidden on Mobile */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100 flex-shrink-0 z-10 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{getHindiDateStr()}</span>
            <h2 className="text-lg font-black text-gray-800 mt-1 flex items-center gap-1.5">
              <Sprout className="w-5 h-5 text-[#2D5A27]" />
              स्वागत है, <span className="text-[#2D5A27]">{user?.displayName || 'किसान साथी'}!</span>
            </h2>
          </div>

          <div className="flex items-center gap-6">
            {/* Functional search bar in modern style */}
            <form onSubmit={handleDesktopSearchSubmit} className="relative w-64 lg:w-80">
              <input 
                type="text" 
                value={desktopSearch}
                onChange={(e) => setDesktopSearch(e.target.value)}
                placeholder="दवाई या बीज खोजें..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-[#2D5A27] focus:bg-white placeholder:text-gray-400 text-gray-700 font-bold"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </form>

            {/* AI Call Expert Button */}
            <button 
              onClick={() => navigate('/ai-call')}
              className="bg-amber-400 hover:bg-amber-500 text-[#2D5A27] text-xs font-black px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer select-none"
            >
              <Sparkles className="w-4 h-4 animate-pulse text-[#2D5A27]" />
              AI विशेषज्ञ परामर्श
            </button>

            {/* User Avatar linking to profile */}
            <Link to="/profile" className="w-10 h-10 select-none cursor-pointer flex-shrink-0">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  className="w-full h-full rounded-full object-cover border-2 border-[#2D5A27]" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 bg-[#2D5A27]/5 text-[#2D5A27] border-2 border-[#2D5A27]/20 rounded-full flex items-center justify-center font-black text-sm">
                  {user?.displayName?.charAt(0) || 'K'}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT ROUTER ROOT AREA */}
        <main className="flex-1 overflow-y-auto pb-24 pt-36 px-4 md:pb-8 md:pt-8 md:px-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 📱 MOBILE NAVIGATION BAR - Hidden on Desktop */}
      <div className="block md:hidden">
        <BottomNav />
      </div>
    </div>
  );
};

export default Layout;
