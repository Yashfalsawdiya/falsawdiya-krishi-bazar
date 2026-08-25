import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Key, ExternalLink, Save, LogOut, LogIn, ChevronRight, Info, Youtube, RefreshCw, CheckCircle2, AlertCircle, Loader2, ShieldCheck, FileText, RotateCcw, AlertTriangle, PhoneCall, ShieldAlert, Award, Scale, Truck, HelpCircle, Package, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import SmartImage from '../components/SmartImage';

const Profile: React.FC = () => {
  const { user, userSettings, updateUserSettings, login, logout, loading, appContent } = useAppContext();
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [quotaStatus, setQuotaStatus] = useState<'idle' | 'checking' | 'available' | 'exhausted'>('idle');

  useEffect(() => {
    if (userSettings) {
      setApiKey(userSettings.geminiApiKey || '');
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

  const testApiKey = async () => {
    if (!apiKey) {
      setSaveMessage('कृपया पहले Key डालें।');
      return;
    }
    setTestStatus('testing');
    setSaveMessage('');
    try {
      const genAI: any = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      const result = await genAI.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: "test" 
      });
      
      if (result) {
        setTestStatus('success');
        setSaveMessage('✅ Valid API Key');
      }
    } catch (error: any) {
      console.error("Key test failed:", error);
      setTestStatus('error');
      setSaveMessage('❌ Invalid API Key');
    } finally {
      setTimeout(() => {
        setTestStatus('idle');
        setSaveMessage('');
      }, 6000);
    }
  };

  const checkQuota = async () => {
    if (!apiKey) {
      setSaveMessage('कृपया पहले Key डालें।');
      return;
    }
    setQuotaStatus('checking');
    setSaveMessage('');
    try {
      const genAI: any = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      // Test with a real generation call
      const result = await genAI.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: "hi" 
      });
      
      if (result) {
        setQuotaStatus('available');
        setSaveMessage('🟢 आपकी Gemini API Key की आज की limit अभी उपलब्ध है।');
      }
    } catch (error: any) {
      console.error("Quota check failed:", error);
      // 429 is the status code for quota exhaustion
      const errorMsg = error.message?.toLowerCase() || "";
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('exhausted')) {
        setQuotaStatus('exhausted');
        setSaveMessage('🔴 आपकी Gemini API Key की आज की limit समाप्त हो चुकी है। कृपया कल पुनः प्रयास करें।');
      } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        setQuotaStatus('exhausted');
        setSaveMessage('❌ Model not found. कृपया अपडेट की प्रतीक्षा करें।');
      } else {
        setQuotaStatus('exhausted');
        setSaveMessage('❌ Quota की जानकारी नहीं मिल सकी। कृपया अपनी API Key चेक करें।');
      }
    } finally {
      setTimeout(() => {
        setQuotaStatus('idle');
        setSaveMessage('');
      }, 8000);
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
            <SmartImage 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`} 
              alt="Profile" 
              className="w-full h-full" 
              objectFit="cover"
            />
          ) : (
            <User className="w-8 h-8 text-gray-300" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#4A3728]">{user.displayName}</h2>
          <p className="text-xs text-gray-500 font-medium">{user.email}</p>
        </div>
      </div>

      {/* Orders Quick Navigation */}
      <Link
        to="/orders"
        className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-[#2D5A27]/30 transition-all group active:scale-98"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#2D5A27]/10 flex items-center justify-center text-[#2D5A27]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 group-hover:text-[#2D5A27] transition-colors">
              मेरे ऑनलाइन ऑर्डर (My Orders)
            </h3>
            <p className="text-[11px] text-gray-400">ऑर्डर स्थिति, लाइव ट्रैकिंग व रसीद देखें</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2D5A27] group-hover:translate-x-0.5 transition-all" />
      </Link>

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
          <div className="flex justify-between items-end mb-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">अपनी Gemini API Key</label>
            <div className="flex gap-2">
              {apiKey && (
                <>
                  <button 
                    onClick={testApiKey}
                    disabled={testStatus === 'testing' || quotaStatus === 'checking'}
                    className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded border transition-colors flex items-center gap-1",
                      testStatus === 'idle' && "text-blue-600 border-blue-200 bg-blue-50",
                      testStatus === 'testing' && "text-gray-400 border-gray-200 bg-gray-50",
                      testStatus === 'success' && "text-green-600 border-green-200 bg-green-50",
                      testStatus === 'error' && "text-red-600 border-red-200 bg-red-50"
                    )}
                  >
                    {testStatus === 'testing' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "🔑"}
                    Key चेक करें
                  </button>

                  <button 
                    onClick={checkQuota}
                    disabled={testStatus === 'testing' || quotaStatus === 'checking'}
                    className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded border transition-colors flex items-center gap-1",
                      quotaStatus === 'idle' && "text-purple-600 border-purple-200 bg-purple-50",
                      quotaStatus === 'checking' && "text-gray-400 border-gray-200 bg-gray-50",
                      quotaStatus === 'available' && "text-green-600 border-green-200 bg-green-50",
                      quotaStatus === 'exhausted' && "text-red-600 border-red-200 bg-red-50"
                    )}
                  >
                    {quotaStatus === 'checking' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "📊"}
                    Quota चेक करें
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="relative">
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-4 pr-12 outline-none transition-all font-mono text-sm"
              placeholder="AIzaSy..."
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
              {testStatus === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : testStatus === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Key className="w-5 h-5 text-gray-300" />
              )}
            </div>
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
                // 1. Clear Service Workers
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (const registration of registrations) {
                      registration.unregister();
                    }
                  });
                }

                // 2. Clear Cache Storage (Images, Assets)
                if ('caches' in window) {
                  caches.keys().then(names => {
                    for (const name of names) {
                      caches.delete(name);
                    }
                  });
                }

                // 3. Clear Web Storage (Settings, Tokens)
                localStorage.clear();
                sessionStorage.clear();

                // 4. Clear IndexedDB (Firebase, Offline Data)
                // This is crucial for fixing Firestore/Data issues
                if (window.indexedDB && window.indexedDB.databases) {
                  window.indexedDB.databases().then(databases => {
                    for (const db of databases) {
                      if (db.name) window.indexedDB.deleteDatabase(db.name);
                    }
                  });
                }

                // 5. Clear Cookies
                const cookies = document.cookie.split(";");
                for (let i = 0; i < cookies.length; i++) {
                  const cookie = cookies[i];
                  const eqPos = cookie.indexOf("=");
                  const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                }

                // 6. Perform a clean-state redirect
                window.location.replace(window.location.origin + '?reset=' + new Date().getTime());
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

      {/* About Us & Privacy Policy Cards */}
      <div className="space-y-2.5">
        <Link 
          to="/about"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">हमारे बारे में (About Us)</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">फल्सावदिया कृषि बाजार की जानकारी व सेवाएँ</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2D5A27] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          to="/licensing-disclaimer"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">वैधानिक लाइसेंस एवं DAESI</h4>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">Statutory</span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">उर्वरक, बीज व कीटनाशक लाइसेंस एवं गुणवत्ता अस्वीकरण</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2D5A27] group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          to="/privacy"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">गोपनीयता नीति (Privacy Policy)</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">डेटा सुरक्षा एवं निजता नियम</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          to="/terms"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">नियम एवं शर्तें (Terms & Conditions)</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">उपयोग के नियम, ऑर्डर व डिलीवरी शर्तें</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          to="/refund-policy"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 group-hover:scale-105 transition-transform">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">वापसी एवं रिफंड नीति (Refund Policy)</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">वापसी, रिप्लेसमेंट व कैंसिलेशन नियम</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          to="/disclaimer"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-yellow-50 text-yellow-700 flex items-center justify-center border border-yellow-100 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">कृषि एवं AI अस्वीकरण (AI Disclaimer)</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">सटीकता, खुराक एवं सुरक्षा अस्वीकरण</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          to="/safety-guidelines"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center border border-red-100 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">रासायनिक सुरक्षा निर्देश (Safety Guidelines)</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">कीटनाशक छिड़काव, PPE एवं प्राथमिक चिकित्सा</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          to="/grievance"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">शिकायत अधिकारी (Grievance Officer)</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">उपभोक्ता शिकायत निवारण व नोडल अधिकारी</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          to="/contact"
          className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-xs hover:border-[#2D5A27]/30 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#2D5A27] flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#4A3728] text-sm leading-tight">संपर्क करें (Contact Us)</h4>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">कॉल, WhatsApp, ईमेल व पता</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2D5A27] group-hover:translate-x-0.5 transition-all" />
        </Link>
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
