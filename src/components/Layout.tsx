import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Footer from './Footer';
import OfflineIndicator from './OfflineIndicator';
import SmartImage from './SmartImage';
import { useAppContext } from '../context/AppContext';
import { LogIn, Sprout, Loader2, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

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
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Soft Modern Ambient Gradient Glows in Background */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-200/35 rounded-full blur-3xl pointer-events-none" />

        {/* Elevated Glassmorphic Main Login Card */}
        <div className="relative bg-white/95 backdrop-blur-xl max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center">
          {/* Top Subtle Brand Accent Line */}
          <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 via-[#2D5A27] to-teal-500 rounded-full mb-5" />

          {/* Floating Logo Badge with Ambient Glow */}
          <div className="relative group mb-4">
            <div className="w-22 h-22 sm:w-24 sm:h-24 bg-white rounded-3xl shadow-md border border-gray-100 flex items-center justify-center p-2.5 transition-transform duration-300 group-hover:scale-105">
              <SmartImage 
                src={branding.logo} 
                fallbackSrc="/icon-192.png" 
                alt="Logo" 
                className="w-full h-full object-contain relative z-10" 
                priority
              />
            </div>
            <div className="absolute -inset-1 bg-emerald-500/10 rounded-3xl blur-sm -z-10" />
          </div>

          {/* Brand Name & Tagline */}
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
            {branding.name}
          </h1>
          <p className="text-gray-500 mt-1 mb-6 font-semibold text-xs sm:text-sm">
            {branding.tagline}
          </p>

          {/* Redesigned Modern Information / Notice Section */}
          <div className="w-full mb-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-teal-50/30 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 text-left shadow-2xs">
              {/* Top Accent Icon & Badge */}
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-800 shrink-0 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
                  सुरक्षित किसान प्रमाणीकरण
                </span>
              </div>

              {/* Main Notice Message */}
              <p className="text-xs sm:text-sm font-medium text-gray-700 leading-relaxed">
                {loginText}
              </p>
            </div>
          </div>

          {/* Modern Tactile Google Login Button */}
          <button 
            type="button"
            onClick={login}
            className="w-full bg-gradient-to-r from-[#2D5A27] to-[#1f421a] hover:from-[#23481f] hover:to-[#173313] text-white py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md shadow-[#2D5A27]/25 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer group"
          >
            {/* Crisp Official Google 'G' Icon */}
            <svg className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0 shadow-2xs" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-sm sm:text-base font-extrabold tracking-wide">
              Google से लॉगिन करें
            </span>
            <ArrowRight className="w-4 h-4 text-emerald-300 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          {/* Trust & Privacy Security Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>सुरक्षित और सत्यापित • Powered by Google</span>
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
        className="flex-1 w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1740px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pb-24 lg:pb-12 pt-36 md:pt-24 lg:pt-[156px] transition-all"
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
