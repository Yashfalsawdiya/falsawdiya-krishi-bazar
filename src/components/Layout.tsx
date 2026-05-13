import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import OfflineIndicator from './OfflineIndicator';
import { useAppContext } from '../context/AppContext';
import { LogIn, Sprout, Loader2 } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, loading, login, appContent, isAdmin } = useAppContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center max-w-md mx-auto shadow-2xl">
        <OfflineIndicator />
        <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
        <p className="mt-4 text-sm font-bold text-[#2D5A27]">डेटा लोड हो रहा है, कृपया प्रतीक्षा करें...</p>
      </div>
    );
  }

  // Maintenance / App Inactive Mode
  if (appContent?.isAppActive === false && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center justify-center max-w-md mx-auto shadow-2xl p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border-2 border-red-100 overflow-hidden p-2">
          <img src="/icon-192.png" alt="Maintenance" className="w-full h-full object-contain opacity-50 grayscale" />
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
    const branding = appContent?.branding || {
      name: 'फल्सावदिया कृषि बाज़ार',
      tagline: 'किसान का भरोसा, हमारी पहचान',
      logo: ''
    };
    const loginText = appContent?.loginText || 'ऐप की सुविधाओं का उपयोग करने के लिए कृपया अपनी Gmail ID से लॉगिन करें।';

    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border-2 border-[#2D5A27]/10 overflow-hidden p-2">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <img src="/icon-192.png" alt="Logo" className="w-full h-full object-contain" />
            )}
          </div>
          <h1 className="text-3xl font-black text-[#4A3728] mb-2">{branding.name}</h1>
          <p className="text-gray-500 mb-12 font-medium">{branding.tagline}</p>
          
          <div className="w-full space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
              <p className="text-sm text-gray-600 leading-relaxed">
                {loginText}
              </p>
            </div>
            
            <button 
              onClick={login}
              className="w-full bg-[#2D5A27] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
            >
              <LogIn className="w-6 h-6" /> Google से लॉगिन करें
            </button>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Safe & Secure Login • Powered by Google
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
      <OfflineIndicator />
      <Header />
      <main className="flex-1 overflow-y-auto pb-24 pt-36 px-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
