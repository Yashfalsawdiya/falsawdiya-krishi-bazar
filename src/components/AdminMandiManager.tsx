import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Database,
  Clock,
  Loader2,
  Radio,
  Trash2,
  Building2,
  SlidersHorizontal,
  Globe,
  CalendarClock,
  Activity,
  History,
  Server,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { formatHindiDateTime } from '../lib/dateUtils';
import {
  AdminMandiSettingsResponse,
  getAdminMandiSettings,
  saveAdminMandiSettings,
  testAdminMandiConnection,
  syncAdminMandiGovt,
  importAdminMandiCache,
  buildAdminMandiSyncUrl,
  publishMandiSyncDocsToFirestore,
} from '../services/mandiService';
import { cn } from '../lib/utils';

const SYNC_STATE_OPTIONS = [
  { value: 'Madhya Pradesh', label: 'मध्यप्रदेश (Madhya Pradesh)' },
  { value: 'Rajasthan', label: 'राजस्थान (Rajasthan)' },
  { value: 'Maharashtra', label: 'महाराष्ट्र (Maharashtra)' },
  { value: 'Uttar Pradesh', label: 'उत्तर प्रदेश (Uttar Pradesh)' },
  { value: 'Gujarat', label: 'गुजरात (Gujarat)' },
  { value: 'ALL', label: 'पूरा भारत (All India — Top Records)' },
];

const AdminMandiManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [settings, setSettings] = useState<AdminMandiSettingsResponse | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [limitInput, setLimitInput] = useState<string>('1000');
  const [syncStateFilter, setSyncStateFilter] = useState<string>('Madhya Pradesh');

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    blockedFromServer?: boolean;
    message: string;
  } | null>(null);

  const [lastSyncDelta, setLastSyncDelta] = useState<{
    rawCount: number;
    newMarketsCount: number;
    updatedMarketsCount: number;
    unchangedCount: number;
    noChange?: boolean;
  } | null>(null);

  const getValidatedLimit = (): number | null => {
    const trimmed = limitInput.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 10000) {
      return null;
    }
    return parsed;
  };

  const publishFirestoreSharedCache = async (syncPayload: any) => {
    try {
      return await publishMandiSyncDocsToFirestore(syncPayload);
    } catch (err) {
      console.warn('[AdminMandi] Failed publishing shared cache to Firestore:', err);
      return false;
    }
  };

  const restorePrivateKeyIfNeeded = async (serverData: AdminMandiSettingsResponse) => {
    const uid = auth.currentUser?.uid;
    if (!uid || serverData.configured) return serverData;
    try {
      const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'mandiConfig'));
      if (privSnap.exists()) {
        const privData = privSnap.data();
        if (privData?.apiKey && typeof privData.apiKey === 'string') {
          await saveAdminMandiSettings({
            apiKey: privData.apiKey,
            enabled: privData.enabled ?? serverData.enabled,
            defaultLimit: privData.defaultLimit ?? serverData.defaultLimit,
            syncStateFilter: privData.syncStateFilter ?? serverData.syncStateFilter,
          });
          return await getAdminMandiSettings();
        }
      }
    } catch {
      // Non-fatal
    }
    return serverData;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let data = await getAdminMandiSettings();
      data = await restorePrivateKeyIfNeeded(data);
      setSettings(data);
      setEnabled(data.enabled !== false);
      setLimitInput(String(data.defaultLimit || 1000));
      setSyncStateFilter(data.syncStateFilter || 'Madhya Pradesh');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'सरकारी मंडी सेटिंग्स लोड करने में त्रुटि हुई।',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusMessage(null);
    setTestResult(null);

    const validatedLimit = getValidatedLimit();
    if (validatedLimit === null) {
      setStatusMessage({
        type: 'error',
        text: 'कृपया डेटा रिकॉर्ड लिमिट में 1 से 10000 के बीच कोई सही पूर्ण संख्या दर्ज करें।',
      });
      return;
    }

    setSaving(true);
    try {
      const cleanedKey = apiKeyInput.trim();
      const res = await saveAdminMandiSettings({
        apiKey: cleanedKey || undefined,
        enabled,
        defaultLimit: validatedLimit,
        syncStateFilter,
      });

      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          const privRef = doc(db, 'users', uid, 'private', 'mandiConfig');
          const existingPriv = await getDoc(privRef).catch(() => null);
          const existingKey = existingPriv?.exists() ? existingPriv.data()?.apiKey : '';
          await setDoc(privRef, {
            apiKey: cleanedKey || existingKey || '',
            enabled,
            defaultLimit: validatedLimit,
            syncStateFilter,
            updatedAt: Date.now(),
          });
        } catch (fsErr) {
          console.warn('[AdminMandi] Private key backup warning:', fsErr);
        }
      }

      setApiKeyInput('');
      setStatusMessage({
        type: 'success',
        text: res.message || 'सेटिंग्स सफलतापूर्वक सुरक्षित कर ली गई हैं।',
      });
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'सेटिंग्स सेव करने में विफल रहा।',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await saveAdminMandiSettings({ clearKey: true });
      const uid = auth.currentUser?.uid;
      if (uid) {
        await deleteDoc(doc(db, 'users', uid, 'private', 'mandiConfig')).catch(() => {});
      }
      setApiKeyInput('');
      setStatusMessage({
        type: 'info',
        text: 'Admin Panel से सहेजी गई सरकारी API Key हटा दी गई है।',
      });
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'API Key हटाने में त्रुटि हुई।',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setStatusMessage(null);

    try {
      const cleaned = apiKeyInput.trim();
      const res = await testAdminMandiConnection(cleaned || undefined);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'कनेक्शन जांच विफल रही।',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleOneClickSync = async () => {
    const validatedLimit = getValidatedLimit();
    if (validatedLimit === null) {
      setStatusMessage({
        type: 'error',
        text: 'कृपया डेटा रिकॉर्ड लिमिट में 1 से 10000 के बीच कोई सही संख्या दर्ज करें।',
      });
      return;
    }

    setSyncing(true);
    setStatusMessage(null);
    setTestResult(null);

    const cleanedKey = apiKeyInput.trim();

    try {
      // Step 1: Try server-side Govt OGD Sync
      const serverRes = await syncAdminMandiGovt({
        apiKey: cleanedKey || undefined,
        limit: validatedLimit,
        stateFilter: syncStateFilter,
      });

      if (serverRes.success) {
        const fsOk = await publishFirestoreSharedCache(serverRes);
        setLastSyncDelta({
          rawCount: serverRes.rawCount || 0,
          newMarketsCount: serverRes.newMarketsCount || 0,
          updatedMarketsCount: serverRes.updatedMarketsCount || 0,
          unchangedCount: serverRes.unchangedCount || 0,
          noChange: Boolean(serverRes.noChange),
        });
        setStatusMessage({
          type: 'success',
          text: `${serverRes.message}${fsOk ? ' सभी किसानों के लिए राज्यवार साझा कैश व 30-दिन इतिहास अपडेट हो गया है।' : ''}`,
        });
        await loadData();
        return;
      }

      // Step 2: If server IP is outside India and blocked by NIC, try Admin's Indian Browser direct fetch
      const urlRes = await buildAdminMandiSyncUrl({
        limit: validatedLimit,
        state: syncStateFilter,
        apiKey: cleanedKey || undefined,
      }).catch(() => null);

      const syncUrl = urlRes?.syncUrl;

      if (serverRes.blockedFromServer && syncUrl) {
        try {
          const browserRes = await fetch(syncUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });
          if (browserRes.ok) {
            const browserJson = await browserRes.json();
            if (browserJson && Array.isArray(browserJson.records) && browserJson.records.length > 0) {
              const importRes = await importAdminMandiCache({
                rawPayload: browserJson,
                mergeExisting: true,
                sourceLabel: 'browser_sync',
              });
              const fsOk = await publishFirestoreSharedCache(importRes);
              setLastSyncDelta({
                rawCount: importRes.rawCount || 0,
                newMarketsCount: importRes.newMarketsCount || 0,
                updatedMarketsCount: 0,
                unchangedCount: 0,
              });
              setStatusMessage({
                type: 'success',
                text: `भारत ब्राउज़र डायरेक्ट सिंक सफल! ${importRes.message}${fsOk ? ' साझा कैश लाइव हो गया।' : ''}`,
              });
              await loadData();
              return;
            }
          }
        } catch {
          // CORS blocked by data.gov.in in browser
        }

        setStatusMessage({
          type: 'info',
          text: 'यह सर्वर भारत के बाहर स्थित होने व ब्राउज़र CORS सुरक्षा के कारण data.gov.in ने सीधा कनेक्शन रोका है। भारत-आधारित सर्वर पर होस्ट होने पर 1-Click सिंक तुरंत चलेगा; तब तक MandiPulse लाइव बैकअप चालू है।',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: serverRes.error || 'सरकारी डेटा सिंक नहीं हो सका।',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'सिंक करने में त्रुटि हुई।',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#2D5A27] animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-500">सरकारी मंडी API व कैश सेटिंग्स लोड हो रही हैं...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center shrink-0 shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                सरकारी मंडी भाव API व साझा कैश प्रबंधन
              </h3>
              <span
                className={cn(
                  'text-[10px] font-black px-2.5 py-0.5 rounded-full border',
                  settings?.configured
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                )}
              >
                {settings?.configured ? 'Govt API Key सक्रिय' : 'Key सेट नहीं है'}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              प्राथमिक स्रोत: भारत सरकार OGD (data.gov.in AGMARKNET) • स्वचालित बैकअप: MandiPulse.com (सदा सक्रिय)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>रिफ्रेश करें</span>
        </button>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={cn(
            'p-4 rounded-2xl border text-xs font-bold flex items-start gap-2.5',
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'info'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-900'
          )}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{statusMessage.text}</span>
        </div>
      )}

      {/* Auto-Sync Scheduler Status & Zero-Cost Architecture Strip */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#2D5A27] shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-black text-[#1B4318]">
                100% मुफ्त स्वचालित सरकारी सिंक एवं 30-दिन इतिहास सिस्टम
              </p>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                1) दिन में 10 बार स्वतः AGMARKNET OGD सिंक (09:30 AM – 11:00 PM IST) → 2) राज्यवार 10-दिन स्मार्ट कैश + 30-दिन FIFO इतिहास → 3) MandiPulse लाइव बैकअप सदा चालू।
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
              <CalendarClock className="w-3 h-3 text-emerald-700" />
              10 बार/दिन ऑटो सिंक (IST)
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              <Radio className="w-3 h-3 text-teal-600" />
              MandiPulse बैकअप: चालू
            </span>
          </div>
        </div>

        {/* Readiness & Auto-Cron Telemetry Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-emerald-200/50">
          <div className="bg-white/90 rounded-2xl p-2.5 border border-emerald-100">
            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
              <Server className="w-3 h-3 text-[#2D5A27]" />
              <span>Service Account</span>
            </span>
            <span className={cn(
              'text-[11px] font-black mt-0.5 block',
              settings?.serviceAccountConfigured ? 'text-emerald-700' : 'text-amber-700'
            )}>
              {settings?.serviceAccountConfigured ? 'सक्रिय (Spark Auto-Write)' : 'सेटअप प्रतीक्षारत'}
            </span>
          </div>

          <div className="bg-white/90 rounded-2xl p-2.5 border border-emerald-100">
            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#2D5A27]" />
              <span>Cron Secret सुरक्षा</span>
            </span>
            <span className={cn(
              'text-[11px] font-black mt-0.5 block',
              settings?.cronSecretConfigured ? 'text-emerald-700' : 'text-amber-700'
            )}>
              {settings?.cronSecretConfigured ? 'सक्रिय (Verified)' : 'सेटअप प्रतीक्षारत'}
            </span>
          </div>

          <div className="bg-white/90 rounded-2xl p-2.5 border border-emerald-100">
            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#2D5A27]" />
              <span>OGD API शेष कोटा</span>
            </span>
            <span className="text-[11px] font-black text-gray-900 font-mono mt-0.5 block">
              {settings?.rateLimitRemaining !== null && settings?.rateLimitRemaining !== undefined
                ? `${settings.rateLimitRemaining} कॉल शेष`
                : 'सामान्य (उपलब्ध)'}
            </span>
          </div>

          <div className="bg-white/90 rounded-2xl p-2.5 border border-emerald-100">
            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
              <History className="w-3 h-3 text-[#2D5A27]" />
              <span>30-दिन इतिहास ट्रैक</span>
            </span>
            <span className="text-[11px] font-black text-gray-900 font-mono mt-0.5 block">
              {settings?.historyMarketsCount ?? 0} मंडियाँ संग्रहित
            </span>
          </div>
        </div>

        {/* Warning banner when background failures > 0 or Vercel Secrets missing */}
        {((settings?.consecutiveFailures || 0) > 0 || !settings?.serviceAccountConfigured || !settings?.cronSecretConfigured) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-amber-950 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {(settings?.consecutiveFailures || 0) > 0 && (
                <p className="font-black text-red-800">
                  लगातार {settings?.consecutiveFailures} बार सिंक विफल रहा: {settings?.lastError || settings?.lastSyncMessage}
                </p>
              )}
              {(!settings?.serviceAccountConfigured || !settings?.cronSecretConfigured) && (
                <p className="font-semibold text-amber-900">
                  बैकग्राउंड ऑटो-सिंक चालू करने हेतु Vercel Environment Variables में CRON_SYNC_SECRET और FIREBASE_SERVICE_ACCOUNT_JSON सेट करें (जब तक सेट न हो, तब तक नीचे 1-Click बटन से मैन्युअल सिंक करें)।
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form: API Key + Custom Fetch Limit + State Filter */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#2D5A27]" />
            <h4 className="text-sm font-black text-gray-900">
              data.gov.in सरकारी API Key एवं सीमा सेटिंग्स
            </h4>
          </div>
          {settings?.configured && (
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200">
              स्रोत: {settings.keySource === 'env' ? 'Environment Secret' : 'Admin Saved'} ({settings.maskedKey})
            </span>
          )}
        </div>

        {/* Enable / Disable Toggle */}
        <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-200/70">
          <div>
            <p className="text-xs font-black text-gray-800">सरकारी AGMARKNET OGD को प्राथमिक स्रोत रखें</p>
            <p className="text-[11px] text-gray-500 font-medium">
              चालू रहने पर पहले सरकारी डेटा दिखेगा; डेटा न मिलने पर स्वतः MandiPulse बैकअप दिखेगा।
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={cn(
              'w-12 h-7 rounded-full transition-all p-1 cursor-pointer shrink-0',
              enabled ? 'bg-[#2D5A27]' : 'bg-gray-300'
            )}
            aria-label="सरकारी स्रोत चालू या बंद करें"
          >
            <div
              className={cn(
                'w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                enabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* API Key Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-700 flex items-center justify-between">
            <span>नई data.gov.in API Key दर्ज करें (बदलने या जोड़ने के लिए)</span>
            {settings?.keySource === 'admin' && (
              <button
                type="button"
                onClick={handleClearKey}
                disabled={saving}
                className="text-red-600 hover:text-red-700 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                सहेजी Key हटाएं
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                settings?.configured
                  ? `वर्तमान सहेजी Key: ${settings.maskedKey} (बदलने के लिए नई Key पेस्ट करें)`
                  : 'अपनी data.gov.in OGD API Key यहाँ पेस्ट करें...'
              }
              className="w-full pl-4 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27]"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
              title={showApiKey ? 'छिपाएं' : 'दिखाएं'}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 font-medium">
            सुरक्षा नियम: आपकी Key केवल सुरक्षित सर्वर व Admin निजी स्टोरेज में रहती है, आम यूज़र्स को कभी दिखाई नहीं जाती।
          </p>
        </div>

        {/* Custom Manual Fetch Limit & State Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-700 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#2D5A27]" />
              <span>डेटा रिकॉर्ड लिमिट (Fetch Limit)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={10000}
                step={1}
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="जैसे: 1000 या 5000"
                className="w-full pl-4 pr-24 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                रिकॉर्ड (1–10000)
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              आप अपनी आवश्यकता अनुसार कोई भी कस्टम संख्या (1 से 10000 तक, जैसे 500, 1000, 3000, 5000) मैन्युअली टाइप कर सकते हैं।
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#2D5A27]" />
              <span>सिंक के लिए प्राथमिकता राज्य</span>
            </label>
            <select
              value={syncStateFilter}
              onChange={(e) => setSyncStateFilter(e.target.value)}
              className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27]"
            >
              {SYNC_STATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 rounded-2xl bg-[#2D5A27] hover:bg-[#23461e] text-white text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>सेटिंग्स सुरक्षित करें</span>
          </button>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4 text-[#2D5A27]" />}
            <span>कनेक्शन टेस्ट करें</span>
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={cn(
              'p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2.5',
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            )}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}
      </form>

      {/* 1-Click Sync & Shared Cache Card */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
          <div>
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2D5A27]" />
              <span>1-Click सरकारी डेटा सिंक एवं साझा कैश पब्लिश</span>
            </h4>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              एक बार सिंक होने पर सभी किसानों को बिना किसी अतिरिक्त API कॉल के तुरंत सरकारी भाव दिखेंगे।
            </p>
          </div>

          <button
            type="button"
            onClick={handleOneClickSync}
            disabled={syncing}
            className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{syncing ? 'सिंक हो रहा है...' : '1-Click सरकारी डेटा सिंक करें'}</span>
          </button>
        </div>

        {/* Cache Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 block">साझा कैश मंडियाँ</span>
            <span className="text-lg font-black text-gray-900 font-mono mt-0.5 block">
              {settings?.cachedMandisCount ?? 0}
            </span>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 block">कुल फसल भाव</span>
            <span className="text-lg font-black text-[#2D5A27] font-mono mt-0.5 block">
              {settings?.cachedRecordsCount ?? 0}
            </span>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>अंतिम सफल सिंक</span>
            </span>
            <span className="text-xs font-black text-gray-800 mt-1 block">
              {settings?.lastSuccessfulSyncAt
                ? formatHindiDateTime(settings.lastSuccessfulSyncAt)
                : settings?.cacheUpdatedAt
                ? formatHindiDateTime(settings.cacheUpdatedAt)
                : 'अभी तक सिंक नहीं हुआ'}
            </span>
          </div>

          <div className="bg-emerald-50/70 rounded-2xl p-3 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              <span>अगला स्वचालित सिंक (IST)</span>
            </span>
            <span className="text-xs font-black text-emerald-950 mt-1 block">
              {settings?.nextScheduledSyncAt
                ? formatHindiDateTime(settings.nextScheduledSyncAt)
                : 'सुबह 09:30 AM – रात 11:00 PM'}
            </span>
          </div>
        </div>

        {/* Last Delta Summary Strip */}
        {lastSyncDelta && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800">
              प्राप्त रिकॉर्ड: {lastSyncDelta.rawCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              नई मंडियाँ: {lastSyncDelta.newMarketsCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
              अपडेट मंडियाँ: {lastSyncDelta.updatedMarketsCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
              अपरिवर्तित: {lastSyncDelta.unchangedCount}
            </span>
          </div>
        )}

        {/* Preview of Cached Markets */}
        {settings?.previewMarkets && settings.previewMarkets.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <span className="text-[11px] font-black text-gray-600 block">
              साझा कैश में उपलब्ध प्रमुख मंडियाँ:
            </span>
            <div className="flex flex-wrap gap-2">
              {settings.previewMarkets.map((m, i) => (
                <div
                  key={`${m.market}_${i}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-[11px] font-bold text-emerald-950 flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#2D5A27]" />
                  <span>
                    {m.market} ({m.district}) — {m.cropCount} फसलें • {m.sourceDate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync History Log (Last 20 Runs) */}
        {settings?.syncHistory && settings.syncHistory.length > 0 && (
          <div className="space-y-2.5 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-gray-700 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#2D5A27]" />
                <span>पिछले सिंक इतिहास लॉग (अंतिम {settings.syncHistory.length} रन)</span>
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {settings.syncHistory.map((entry, idx) => (
                <div
                  key={`${entry.timestamp}_${idx}`}
                  className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          'text-[9px] font-black px-2 py-0.5 rounded-md border',
                          entry.status === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : entry.status === 'no_change'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        )}
                      >
                        {entry.status === 'success'
                          ? 'सफल'
                          : entry.status === 'no_change'
                          ? 'कोई बदलाव नहीं'
                          : entry.status === 'blocked'
                          ? 'ब्लॉक'
                          : 'त्रुटि'}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700">
                        {entry.trigger === 'auto_cron' ? 'ऑटो Cron' : 'Admin मैन्युअल'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500">
                        {formatHindiDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-700 font-medium truncate">
                      {entry.error ? entry.error : entry.message}
                    </p>
                  </div>

                  <div className="text-[10px] font-mono font-bold text-gray-500 shrink-0">
                    {entry.rawCount} रिकार्ड • +{entry.newMarkets} नई • ~{entry.updatedMarkets} अपडेट
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMandiManager;
