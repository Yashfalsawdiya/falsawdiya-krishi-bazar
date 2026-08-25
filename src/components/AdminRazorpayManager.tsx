import React, { useState, useEffect } from 'react';
import { 
  CreditCard, ShieldCheck, CheckCircle2, AlertCircle, 
  Key, Eye, EyeOff, Loader2, Save, RefreshCw, Copy, Check,
  Zap, Lock, ShieldAlert, Radio, HelpCircle, ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';
import { RazorpayAdminSettings } from '../types';
import { 
  fetchRazorpayAdminSettings, 
  updateRazorpayAdminSettings, 
  testRazorpayConnection 
} from '../services/razorpayService';

const AdminRazorpayManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    mode?: string;
  } | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Form State
  const [enabled, setEnabled] = useState<boolean>(true);
  const [mode, setMode] = useState<'test' | 'live'>('test');
  
  const [testKeyId, setTestKeyId] = useState('');
  const [testKeySecret, setTestKeySecret] = useState('');
  const [testSecretIsSet, setTestSecretIsSet] = useState(false);
  const [showTestSecret, setShowTestSecret] = useState(false);

  const [liveKeyId, setLiveKeyId] = useState('');
  const [liveKeySecret, setLiveKeySecret] = useState('');
  const [liveSecretIsSet, setLiveSecretIsSet] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);

  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookSecretIsSet, setWebhookSecretIsSet] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/razorpay/webhook` 
    : 'https://your-domain.com/api/razorpay/webhook';

  const loadSettings = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const data: RazorpayAdminSettings = await fetchRazorpayAdminSettings();
      setEnabled(data.enabled !== false);
      setMode(data.mode || 'test');
      setTestKeyId(data.testKeyId || '');
      setTestSecretIsSet(Boolean(data.hasTestSecret));
      setLiveKeyId(data.liveKeyId || '');
      setLiveSecretIsSet(Boolean(data.hasLiveSecret));
      setWebhookSecretIsSet(Boolean(data.hasWebhookSecret));
    } catch (err: any) {
      console.error('Failed to load Razorpay admin settings:', err);
      setNotification({
        type: 'error',
        text: err.message || 'Razorpay सेटिंग्स लोड करने में समस्या आई।'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setNotification(null);
    setTestResult(null);

    try {
      const payload: any = {
        enabled,
        mode,
        testKeyId: testKeyId.trim(),
        liveKeyId: liveKeyId.trim(),
      };

      if (testKeySecret.trim()) {
        payload.testKeySecret = testKeySecret.trim();
      }
      if (liveKeySecret.trim()) {
        payload.liveKeySecret = liveKeySecret.trim();
      }
      if (webhookSecret.trim()) {
        payload.webhookSecret = webhookSecret.trim();
      }

      const res = await updateRazorpayAdminSettings(payload);
      setNotification({
        type: 'success',
        text: 'Razorpay सेटिंग्स सफलतापूर्वक सुरक्षित कर ली गई हैं।'
      });

      // Clear plain secrets from input fields and mark set
      if (testKeySecret) {
        setTestKeySecret('');
        setTestSecretIsSet(true);
      }
      if (liveKeySecret) {
        setLiveKeySecret('');
        setLiveSecretIsSet(true);
      }
      if (webhookSecret) {
        setWebhookSecret('');
        setWebhookSecretIsSet(true);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'सेटिंग्स अपडेट करने में विफल रहा।'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setNotification(null);

    try {
      const payload: any = {
        mode,
        testKeyId: testKeyId.trim() || undefined,
        liveKeyId: liveKeyId.trim() || undefined,
      };

      if (testKeySecret.trim()) payload.testKeySecret = testKeySecret.trim();
      if (liveKeySecret.trim()) payload.liveKeySecret = liveKeySecret.trim();

      const result = await testRazorpayConnection(payload);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection Test Failed — सर्वर से संपर्क नहीं हो सका।',
        mode,
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhookUrl(true);
    setTimeout(() => setCopiedWebhookUrl(false), 2500);
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#2D5A27] animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-500">Razorpay सेटिंग्स लोड हो रही हैं...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Title & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#2D5A27]/10 rounded-2xl flex items-center justify-center text-[#2D5A27] shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#4A3728]">Razorpay Payment Gateway</h3>
            <p className="text-xs text-gray-500 font-medium">
              सुरक्षित UPI, डेबिट/क्रेडिट कार्ड और नेटबैंकिंग भुगतान प्रबंधन
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${
            enabled 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {enabled ? '● गेटवे चालू (ENABLED)' : '○ गेटवे बंद (DISABLED)'}
          </span>
          <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${
            mode === 'live' 
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}>
            {mode === 'live' ? '⚡ LIVE MODE' : '🛠️ TEST MODE'}
          </span>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-700"
          >
            बंद करें
          </button>
        </motion.div>
      )}

      {/* 1. Master ON/OFF Switch */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-[#4A3728]">
              Razorpay Payment Gateway: {enabled ? 'ON (सक्रिय)' : 'OFF (अक्रिय)'}
            </h4>
            <p className="text-xs text-gray-400">
              {enabled
                ? 'ग्राहक कार्ट से Razorpay के माध्यम से सुरक्षित ऑनलाइन भुगतान कर सकते हैं।'
                : 'चेकआउट पृष्ठ पर ऑनलाइन भुगतान बंद रहेगा और ग्राहकों को सूचना दिखेगी।'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-14 h-8 rounded-full relative transition-colors duration-200 cursor-pointer ${
              enabled ? 'bg-[#2D5A27]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-200 shadow-sm ${
                enabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Mode Selector: Test Mode vs Live Mode */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-sm text-[#4A3728]">
            गेटवे संचालन मोड (Operation Mode)
          </h4>
          <p className="text-xs text-gray-400">
            चुने गए मोड की Key ID और Secret का उपयोग चेकआउट व वेरिफिकेशन के लिए होगा।
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('test')}
            className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
              mode === 'test'
                ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-xs text-amber-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                Test Mode (टेस्ट मोड)
              </span>
              {mode === 'test' && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              )}
            </div>
            <p className="text-[11px] text-amber-800/80 font-medium">
              डेवलपमेंट और टेस्टिंग के लिए। इसमें असली पैसे नहीं कटते।
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('live')}
            className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
              mode === 'live'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-xs text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Live Mode (लाइव मोड)
              </span>
              {mode === 'live' && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              )}
            </div>
            <p className="text-[11px] text-emerald-800/80 font-medium">
              वास्तविक ग्राहकों से असली भुगतान प्राप्त करने के लिए।
            </p>
          </button>
        </div>
      </div>

      {/* 3. Credentials Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Test Mode Card */}
        <div className={`p-5 rounded-3xl border-2 space-y-4 ${
          mode === 'test' ? 'bg-white border-amber-400 shadow-sm' : 'bg-gray-50/70 border-gray-200 opacity-90'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                Test Mode Credentials
              </h4>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              rzp_test_...
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                Razorpay Test Key ID
              </label>
              <input
                type="text"
                value={testKeyId}
                onChange={(e) => setTestKeyId(e.target.value)}
                placeholder="rzp_test_XXXXXXXXXXXX"
                className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-gray-600">
                  Razorpay Test Key Secret
                </label>
                {testSecretIsSet && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Secret सर्वर पर सुरक्षित है
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showTestSecret ? 'text' : 'password'}
                  value={testKeySecret}
                  onChange={(e) => setTestKeySecret(e.target.value)}
                  placeholder={testSecretIsSet ? '•••••••••••••••••••••••• (सुरक्षित)' : 'Test Key Secret दर्ज करें'}
                  className="w-full bg-gray-50 border border-gray-200 pl-3.5 pr-10 py-2.5 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowTestSecret(!showTestSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showTestSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {testSecretIsSet ? 'Secret पहले से सेव है। बदलने के लिए नया secret टाइप करें।' : 'नया Secret दर्ज करें।'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Mode Card */}
        <div className={`p-5 rounded-3xl border-2 space-y-4 ${
          mode === 'live' ? 'bg-white border-emerald-600 shadow-sm' : 'bg-gray-50/70 border-gray-200 opacity-90'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                Live Mode Credentials
              </h4>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              rzp_live_...
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                Razorpay Live Key ID
              </label>
              <input
                type="text"
                value={liveKeyId}
                onChange={(e) => setLiveKeyId(e.target.value)}
                placeholder="rzp_live_XXXXXXXXXXXX"
                className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-gray-600">
                  Razorpay Live Key Secret
                </label>
                {liveSecretIsSet && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Secret सर्वर पर सुरक्षित है
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showLiveSecret ? 'text' : 'password'}
                  value={liveKeySecret}
                  onChange={(e) => setLiveKeySecret(e.target.value)}
                  placeholder={liveSecretIsSet ? '•••••••••••••••••••••••• (सुरक्षित)' : 'Live Key Secret दर्ज करें'}
                  className="w-full bg-gray-50 border border-gray-200 pl-3.5 pr-10 py-2.5 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowLiveSecret(!showLiveSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showLiveSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {liveSecretIsSet ? 'Secret पहले से सेव है। बदलने के लिए नया secret टाइप करें।' : 'नया Secret दर्ज करें।'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Webhook Settings Card */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#2D5A27]" />
            <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
              Webhook Configuration (ऑटोमैटिक पेमेंट स्टेटस सिंक)
            </h4>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">वैकल्पिक परंतु अनुशंसित</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-gray-600 block mb-1">
              Webhook URL (Razorpay Dashboard में दर्ज करें)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-mono text-gray-700 select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl)}
                className="px-4 bg-[#2D5A27] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
              >
                {copiedWebhookUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    कॉपी हो गया!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    कॉपी करें
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Razorpay Dashboard &gt; Settings &gt; Webhooks में जोड़ें। सक्रिय इवेंट्स: <code>order.paid</code>, <code>payment.captured</code>, <code>payment.failed</code>
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-gray-600">
                Webhook Secret Key
              </label>
              {webhookSecretIsSet && (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Webhook Secret सेट है
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder={webhookSecretIsSet ? '•••••••••••••••••••••••• (सुरक्षित)' : 'Webhook Secret दर्ज करें'}
                className="w-full bg-gray-50 border border-gray-200 pl-3.5 pr-10 py-2.5 rounded-xl text-xs font-mono text-gray-800 focus:outline-none focus:border-[#2D5A27] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Test Connection Result Card */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border text-xs space-y-1 ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
          <p className="text-[11px] text-gray-600 pl-6">
            जाँच किया गया मोड: <strong>{testResult.mode === 'live' ? 'Live Mode' : 'Test Mode'}</strong>
          </p>
        </motion.div>
      )}

      {/* 6. Action Controls (Test Connection & Save) */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          disabled={testing || saving}
          onClick={handleTestConnection}
          className="flex-1 bg-white hover:bg-gray-50 border-2 border-gray-200 text-[#4A3728] py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#2D5A27]" />
              <span>कनेक्शन जाँच हो रही है...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-[#2D5A27]" />
              <span>कनेक्शन टेस्ट करें (Test Connection)</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={saving || testing}
          onClick={handleSave}
          className="flex-1 bg-[#2D5A27] hover:bg-[#2D5A27]/90 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#2D5A27]/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>सेटिंग्स सुरक्षित हो रही हैं...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>सेटिंग्स सुरक्षित करें (Save Razorpay Settings)</span>
            </>
          )}
        </button>
      </div>

      {/* Security & Guidance Note */}
      <div className="bg-[#F5F2ED] p-4 rounded-2xl border border-[#4A3728]/10 space-y-1.5 text-xs text-gray-600">
        <div className="flex items-center gap-1.5 font-bold text-[#4A3728]">
          <ShieldAlert className="w-4 h-4 text-[#2D5A27]" />
          <span>सुरक्षा निर्देश (Security Notice)</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          सभी Key Secrets सुरक्षित रूप से केवल बैकएंड सर्वर पर सेव होते हैं और कभी भी ब्राउज़र या पब्लिक नेटवर्क पर एक्सपोज़ नहीं किए जाते। भुगतान सत्यापन (HMAC SHA-256 Signature) सर्वर पर पूरा होता है।
        </p>
      </div>
    </div>
  );
};

export default AdminRazorpayManager;
