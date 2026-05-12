import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  MapPin, 
  User, 
  ChevronRight, 
  ShieldCheck, 
  Sprout, 
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { cn } from '../lib/utils';

const Onboarding: React.FC = () => {
  const { user, currentUserData, updateUserProfile, appContent, isVerified, sendNotification } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(currentUserData?.phone ? true : false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    displayName: currentUserData?.displayName || user?.displayName || '',
    phone: currentUserData?.phone || '',
    isFarmer: currentUserData?.isFarmer !== undefined ? currentUserData.isFarmer : true,
    village: currentUserData?.village || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Stricter validation for Indian Mobile Numbers
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('“कृपया सही Mobile Number दर्ज करें, अन्यथा आप App का उपयोग नहीं कर पाएँगे।”');
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      // Save details and set isVerified to false (pending)
      await updateUserProfile({
        ...formData,
        isVerified: false,
        updatedAt: new Date().toISOString()
      });

      // Send dynamic notification to Admin
      await sendNotification({
        title: '📩 नए किसान ने Verification Request भेजी है।',
        message: `👤 नाम: ${formData.displayName}\n📱 मोबाइल: ${formData.phone}\n📍 गाँव: ${formData.village || 'N/A'}\n📧 ID: ${user?.email}`,
        type: 'verification_request'
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError('जानकारी सुरक्षित करने में विफल। कृपया फिर से प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  if (submitted || (!isVerified && user?.phoneNumber === null && formData.phone === '' && user?.uid)) {
    // If we just submitted, show waiting screen
    // We also check if user has already submitted before (isVerified is false but data exists)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#FDFBF7] flex flex-col items-center overflow-y-auto no-scrollbar pb-10">
      
      {/* Header */}
      <div className="w-full max-w-md px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-[#2D5A27] rounded-[24px] flex items-center justify-center shadow-lg shadow-[#2D5A27]/20">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
              स्वागत है! (Welcome)
            </h1>
            <p className="text-gray-500 font-bold text-sm mt-1">अपना प्रोफाइल पूरा करें</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div 
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 space-y-6"
            >
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-12 h-12 text-amber-500" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-gray-900">वेरिफिकेशन पेंडिंग...</h3>
                <p className="text-gray-500 font-bold text-sm leading-relaxed px-4">
                  नमस्ते <span className="text-[#2D5A27]">{formData.displayName}</span>, आपकी जानकारी एडमिन के पास भेज दी गई है। 
                  आपकी पहचान सुनिश्चित होने के बाद आपका ऐप सक्रिय (Active) कर दिया जाएगा।
                </p>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[10px] text-amber-700 font-black uppercase tracking-widest">अनुमानित समय (ETA)</p>
                  <p className="text-amber-800 font-bold">1-2 घंटे (Working Hours)</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.form 
              key="info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Security Message */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl mb-4 flex gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                <p className="text-blue-700 text-xs font-bold leading-relaxed">
                  “घबराएँ नहीं, यह Verification केवल किसान उपयोगकर्ता की पहचान सुनिश्चित करने के लिए है।”
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">
                  पूरा नाम (Full Name)
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    required
                    type="text" 
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    placeholder="अपना नाम भरें"
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#2D5A27] font-bold transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">
                  मोबाइल नंबर (Mobile Number)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r-2 border-gray-100">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400 font-bold text-sm">+91</span>
                  </div>
                  <input 
                    required
                    type="tel" 
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                    placeholder="10 अंकों का नंबर"
                    className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-24 pr-4 outline-none focus:border-[#2D5A27] font-bold transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Farmer Toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">
                  क्या आप किसान हैं? (Are you a Farmer?)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, isFarmer: true})}
                    className={cn(
                      "py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all shadow-sm",
                      formData.isFarmer ? "bg-[#2D5A27] text-white border-[#2D5A27]" : "bg-white text-gray-400 border-gray-100"
                    )}
                  >
                    ✅ हाँ (Yes)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, isFarmer: false})}
                    className={cn(
                      "py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all shadow-sm",
                      !formData.isFarmer ? "bg-red-500 text-white border-red-500" : "bg-white text-gray-400 border-gray-100"
                    )}
                  >
                    ❌ नहीं (No)
                  </button>
                </div>
              </div>

              {/* Village */}
              <AnimatePresence>
                {formData.isFarmer && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">
                      गाँव का नाम (Village Name)
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input 
                        required={formData.isFarmer}
                        type="text" 
                        value={formData.village}
                        onChange={(e) => setFormData({...formData, village: e.target.value})}
                        placeholder="अपने गाँव का नाम लिखें"
                        className="w-full bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#2D5A27] font-bold transition-all shadow-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-xl">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E89B17] hover:bg-[#D48A10] text-white py-5 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:grayscale"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>वेरिफिकेशन भेजें <ChevronRight className="w-6 h-6" /></>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-auto py-8">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[3px]">
          {appContent?.branding?.name || 'फल्सावदिया कृषि बाज़ार'} SECURE
        </p>
      </footer>
    </div>
  );
};

export default Onboarding;
