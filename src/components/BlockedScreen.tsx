import React from 'react';
import { ShieldAlert, LogOut, Phone } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BlockedScreen: React.FC = () => {
  const { logout, appContent } = useAppContext();

  return (
    <div className="fixed inset-0 z-[9999] bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center mb-8 relative">
        <ShieldAlert className="w-12 h-12 text-red-600" />
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full border-4 border-white animate-pulse" />
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-2">पहुँच वर्जित (Access Denied)</h1>
      <p className="text-gray-500 mb-8 max-w-xs mx-auto">
        आपकी आईडी को एडमिन द्वारा ब्लॉक कर दिया गया है। आप इस ऐप की सुविधाओं का उपयोग नहीं कर सकते।
      </p>

      <div className="w-full max-w-sm space-y-3">
        <a 
          href={`tel:${appContent?.contactInfo?.whatsapp || '918982338046'}`}
          className="w-full bg-[#2D5A27] text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
        >
          <Phone className="w-5 h-5" /> एडमिन से संपर्क करें
        </a>
        
        <button 
          onClick={logout}
          className="w-full bg-white text-gray-600 border-2 border-gray-100 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <LogOut className="w-5 h-5" /> लॉगआउट करें (Logout)
        </button>
      </div>

      <div className="mt-12 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
        {appContent?.branding?.name || 'फल्सावदिया कृषि बाज़ार'}
      </div>
    </div>
  );
};

export default BlockedScreen;
