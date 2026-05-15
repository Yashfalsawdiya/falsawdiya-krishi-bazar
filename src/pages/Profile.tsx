import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'motion/react';
import { User, Key, ExternalLink, Save, LogOut, LogIn, ChevronRight, Info, Youtube, RefreshCw } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, userSettings, updateUserSettings, login, logout, loading, appContent } = useAppContext();
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (userSettings) {
      setApiKey(userSettings.geminiApiKey);
    }
  }, [userSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserSettings({ geminiApiKey: apiKey });
      setSaveMessage('API Key सुरक्षित कर दी गई है!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveMessage('त्रुटि: सुरक्षित नहीं हो सका');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenew = () => {
    setApiKey('');
    window.open('https://aistudio.google.com/app/apikey', '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-[#4A3728] mb-2">लॉगिन करें</h2>
        <p className="text-gray-500 mb-8">अपनी सेटिंग्स और API Key सुरक्षित रखने के लिए कृपया लॉगिन करें।</p>
        <button 
          onClick={login}
          className="w-full max-w-xs bg-[#2D5A27] text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
        >
          <LogIn className="w-5 h-5" /> Google से लॉगिन करें
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* User Info Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#2D5A27]/20 flex items-center justify-center bg-gray-50">
          {(user.photoURL || user.displayName) ? (
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`} 
              alt="Profile" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <User className="w-8 h-8 text-gray-300" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#4A3728]">{user.displayName}</h2>
          <p className="text-xs text-gray-500 font-medium">{user.email}</p>
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 text-[#2D5A27]">
          <Key className="w-5 h-5" />
          <h3 className="font-bold">Gemini API Key सेटिंग्स</h3>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
          <div className="flex items-start gap-2 text-blue-800">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold leading-relaxed">
                फ्री कोटा और रीसेट जानकारी (Daily Reset)
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Gemini API का फ्री कोटा हर दिन अपने-आप रीसेट हो जाता है। किसान भाई को बार-बार Key बदलने की ज़रूरत नहीं है, एक बार सेट करने पर यह रोज़ाना काम करेगी।
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 border-t border-blue-200/50">
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
            >
              अपनी फ्री Key यहाँ से लें <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href={appContent?.apiKeyGuideVideoUrl || "https://www.youtube.com/results?search_query=how+to+get+gemini+api+key"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2D5A27] hover:underline"
            >
              वीडियो गाइड देखें <Youtube className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">अपनी Gemini API Key यहाँ डालें</label>
          <div className="relative">
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 pr-12 outline-none transition-all font-mono text-sm"
              placeholder="AIzaSy..."
            />
            <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#2D5A27] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Save className="w-5 h-5" /> सुरक्षित करें
            </>
          )}
        </button>

        <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
          <button 
            onClick={() => {
              if (confirm('क्या आप ऐप की पुरानी कैश (Cache) साफ करके रिफ्रेश करना चाहते हैं? इससे पुराने ग्लिचेस ठीक हो जाएंगे।')) {
                // Clear Service Workers
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (const registration of registrations) {
                      registration.unregister();
                    }
                  });
                }
                // Clear Cache Storage
                if ('caches' in window) {
                  caches.keys().then(names => {
                    for (const name of names) {
                      caches.delete(name);
                    }
                  });
                }
                // Clear Web Storage
                localStorage.clear();
                sessionStorage.clear();
                // Perform a hard-like reload
                window.location.href = window.location.origin + '?clear_cache=' + new Date().getTime();
              }
            }}
            className="w-full py-4 text-orange-600 text-[10px] font-bold flex items-center justify-center gap-2 bg-orange-50 rounded-xl border border-orange-100 active:scale-95 transition-transform shadow-sm"
          >
            <RefreshCw className="w-3 h-3" /> ऐप कैश साफ करें (Clear Cache & Reset)
          </button>

          <button 
            onClick={handleRenew}
            className="w-full py-3 text-[#2D5A27] text-[10px] font-bold flex items-center justify-center gap-2 bg-[#2D5A27]/5 rounded-xl border border-[#2D5A27]/10 active:scale-95 transition-transform"
          >
            <RefreshCw className="w-3 h-3" /> नई Key जनरेट करें (Renew)
          </button>
        </div>

        {saveMessage && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center text-xs font-bold ${saveMessage.includes('त्रुटि') ? 'text-red-500' : 'text-green-600'}`}
          >
            {saveMessage}
          </motion.p>
        )}
      </div>

      {/* Help Guide */}
      <div className="bg-[#F5F2ED] p-6 rounded-3xl border border-[#4A3728]/10 space-y-4">
        <h4 className="font-bold text-[#4A3728]">API Key कैसे प्राप्त करें?</h4>
        <ul className="space-y-3">
          {[
            "ऊपर दिए गए 'फ्री Key' लिंक पर क्लिक करें।",
            "Google AI Studio में लॉगिन करें।",
            "'Create API Key' बटन पर क्लिक करें।",
            "Key को कॉपी करें और यहाँ पेस्ट करें।"
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
              <span className="flex-shrink-0 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-[#2D5A27] shadow-sm">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      {/* Logout Button */}
      <button 
        onClick={logout}
        className="w-full bg-white text-red-600 border-2 border-red-50 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <LogOut className="w-5 h-5" /> लॉगआउट करें (Logout)
      </button>
    </div>
  );
};

export default Profile;
