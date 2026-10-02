import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Footer from './Footer';
import OfflineIndicator from './OfflineIndicator';
import SmartImage from './SmartImage';
import { useAppContext } from '../context/AppContext';
import { LogIn, Sprout, Loader2 } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, loading, login, appContent, isAdmin } = useAppContext();

  // Dynamic header top offset strictly for Laptop & Desktop (window.innerWidth >= 1024)
  const [desktopHeaderOffset, setDesktopHeaderOffset] = useState<number | null>(null);

  useEffect(() => {
    const updateHeaderOffset = () => {
      // Strictly Laptop & Desktop ONLY (lg+)
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        const headerEl = document.getElementById('app-header') || document.querySelector('header');
        if (headerEl) {
          const rect = headerEl.getBoundingClientRect();
          const height = rect.height || headerEl.offsetHeight;
          if (height > 0) {
            // Actual header height + clean, professional vertical whitespace (28px)
            setDesktopHeaderOffset(Math.round(height + 28));
            return;
          }
        }
        // Baseline fallback for desktop (128px header + 28px gap = 156px)
        setDesktopHeaderOffset(156);
      } else {
        // Leave mobile and tablet completely untouched
        setDesktopHeaderOffset(null);
      }
    };

    updateHeaderOffset();
    window.addEventListener('resize', updateHeaderOffset);

    // Also observe header resizing dynamically (e.g. font loading, zoom)
    const headerEl = document.getElementById('app-header') || document.querySelector('header');
    let resizeObserver: ResizeObserver | null = null;
    if (headerEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateHeaderOffset();
      });
      resizeObserver.observe(headerEl);
    }

    return () => {
      window.removeEventListener('resize', updateHeaderOffset);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4">
        <OfflineIndicator />
        <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
        <p className="mt-4 text-sm font-bold text-[#2D5A27]">लोड हो रहा है...</p>
      </div>
    );
  }

  // Maintenance / App Inactive Mode
  if (appContent?.isAppActive === false && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-xl border border-red-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-md flex items-center justify-center mb-6 border-2 border-red-100 overflow-hidden p-2">
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

  if (!user) {
    const branding = appContent?.branding || {
      name: 'फल्सावदिया कृषि बाजार',
      tagline: 'किसान का भरोसा, हमारी पहचान',
      logo: ''
    };
    const loginText = appContent?.loginText || 'ऐप की सुविधाओं का उपयोग करने के लिए कृपया अपनी Gmail ID से लॉगिन करें।';

    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md max-w-md w-full rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-transparent rounded-3xl shadow-md flex items-center justify-center mb-6 border-2 border-[#2D5A27]/10 overflow-hidden p-2 relative">
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
          <h1 className="text-2xl sm:text-3xl font-black text-[#4A3728] mb-2">{branding.name}</h1>
          <p className="text-gray-500 mb-8 font-medium text-xs sm:text-sm">{branding.tagline}</p>
          
          <div className="w-full space-y-4">
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 mb-6">
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {loginText}
              </p>
            </div>
            
            <button 
              onClick={login}
              className="w-full bg-[#2D5A27] hover:bg-[#23481f] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md active:scale-95 transition-all"
            >
              <LogIn className="w-5 h-5" /> Google से लॉगिन करें
            </button>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-100 w-full">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Safe & Secure Login • Powered by Google
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex flex-col w-full relative">
      <OfflineIndicator />
      <Header />
      <main 
        className="flex-1 w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1740px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pb-24 md:pb-12 pt-36 md:pt-24 lg:pt-[156px] transition-all"
        style={desktopHeaderOffset !== null ? { paddingTop: `${desktopHeaderOffset}px` } : undefined}
      >
        <Outlet />
      </main>
      <BottomNav />
      <Footer />
    </div>
  );
};

export default Layout;
