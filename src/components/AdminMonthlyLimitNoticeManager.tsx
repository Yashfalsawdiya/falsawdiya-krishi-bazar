import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  Loader2,
  Maximize2,
  Radio,
  RotateCcw,
  Save,
  ServerCrash,
  ShieldAlert,
  Smartphone,
  X,
} from 'lucide-react';
import { AppContent } from '../context/AppContext';
import { MonthlyLimitNoticeConfig } from '../types';
import { DEFAULT_MONTHLY_LIMIT_NOTICE } from '../utils/vercelPauseDetector';
import MonthlyLimitNoticeScreen from './MonthlyLimitNoticeScreen';
import { cn } from '../lib/utils';

interface AdminMonthlyLimitNoticeManagerProps {
  contentForm: AppContent | null;
  setContentForm: React.Dispatch<React.SetStateAction<AppContent | null>>;
  onSaveContent: (updated: AppContent) => Promise<void>;
  onForcePush: (message?: string) => Promise<any>;
}

export const AdminMonthlyLimitNoticeManager: React.FC<AdminMonthlyLimitNoticeManagerProps> = ({
  contentForm,
  setContentForm,
  onSaveContent,
  onForcePush,
}) => {
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [isPushingNotice, setIsPushingNotice] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  if (!contentForm) return null;

  const currentNotice: MonthlyLimitNoticeConfig = {
    enabled: contentForm.monthlyLimitNotice?.enabled === true,
    autoDetectVercelPause: contentForm.monthlyLimitNotice?.autoDetectVercelPause !== false,
    badgeText: contentForm.monthlyLimitNotice?.badgeText ?? DEFAULT_MONTHLY_LIMIT_NOTICE.badgeText,
    title: contentForm.monthlyLimitNotice?.title ?? DEFAULT_MONTHLY_LIMIT_NOTICE.title,
    message: contentForm.monthlyLimitNotice?.message ?? DEFAULT_MONTHLY_LIMIT_NOTICE.message,
    signature: contentForm.monthlyLimitNotice?.signature ?? DEFAULT_MONTHLY_LIMIT_NOTICE.signature,
  };

  const updateNoticeField = (patch: Partial<MonthlyLimitNoticeConfig>) => {
    setContentForm((prev) => {
      if (!prev) return prev;
      const mergedNotice: MonthlyLimitNoticeConfig = {
        enabled: prev.monthlyLimitNotice?.enabled === true,
        autoDetectVercelPause: prev.monthlyLimitNotice?.autoDetectVercelPause !== false,
        badgeText: prev.monthlyLimitNotice?.badgeText ?? DEFAULT_MONTHLY_LIMIT_NOTICE.badgeText,
        title: prev.monthlyLimitNotice?.title ?? DEFAULT_MONTHLY_LIMIT_NOTICE.title,
        message: prev.monthlyLimitNotice?.message ?? DEFAULT_MONTHLY_LIMIT_NOTICE.message,
        signature: prev.monthlyLimitNotice?.signature ?? DEFAULT_MONTHLY_LIMIT_NOTICE.signature,
        ...patch,
      };
      return {
        ...prev,
        monthlyLimitNotice: mergedNotice,
      };
    });
  };

  const buildUpdatedContent = (overrideNotice?: Partial<MonthlyLimitNoticeConfig>): AppContent => ({
    ...contentForm,
    monthlyLimitNotice: {
      ...currentNotice,
      ...overrideNotice,
    },
  });

  const handleSaveOnly = async () => {
    setIsSavingNotice(true);
    setFeedback(null);
    try {
      const updated = buildUpdatedContent();
      setContentForm(updated);
      await onSaveContent(updated);
      setFeedback({
        type: 'success',
        text: 'मासिक फ्री सीमा सूचना सेटिंग्स सफलतापूर्वक सेव हो गईं!',
      });
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'सेटिंग्स सेव करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsSavingNotice(false);
    }
  };

  const handleSaveAndForcePush = async () => {
    setIsPushingNotice(true);
    setFeedback(null);
    try {
      const updated = buildUpdatedContent();
      setContentForm(updated);
      await onSaveContent(updated);
      await onForcePush(
        updated.monthlyLimitNotice?.enabled
          ? 'एडमिन द्वारा मासिक निःशुल्क सेवा सीमा सूचना तुरंत सक्रिय की गई है।'
          : 'एडमिन द्वारा सेवा स्थिति अपडेट तुरंत लाइव पुश किया गया है।'
      );
      setFeedback({
        type: 'success',
        text: updated.monthlyLimitNotice?.enabled
          ? 'मासिक सीमा संदेश सेव होकर सभी किसानों के लिए तुरंत लाइव हो गया है (Admin ऐप सामान्य रूप से चालू रहेगा)।'
          : 'सेटिंग्स सेव होकर सभी किसानों को तुरंत पुश कर दी गई हैं!',
      });
      setTimeout(() => setFeedback(null), 8000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'सेव या पुश करने में समस्या आई। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsPushingNotice(false);
    }
  };

  const handleResetDefault = () => {
    updateNoticeField({
      badgeText: DEFAULT_MONTHLY_LIMIT_NOTICE.badgeText,
      title: DEFAULT_MONTHLY_LIMIT_NOTICE.title,
      message: DEFAULT_MONTHLY_LIMIT_NOTICE.message,
      signature: DEFAULT_MONTHLY_LIMIT_NOTICE.signature,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-[#4A3728] flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          मासिक फ्री सीमा व सेवा विराम संदेश (Monthly Limit Notice & Live Preview)
        </h3>
        <span
          className={cn(
            'text-[11px] font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5',
            currentNotice.enabled
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          )}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              currentNotice.enabled ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            )}
          />
          {currentNotice.enabled ? 'सूचना सक्रिय (किसानों को यही संदेश दिख रहा है)' : 'निष्क्रिय (ऐप सामान्य चल रहा है)'}
        </span>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-amber-200/80 space-y-6">
        {/* Top Guidance Banner */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-3">
          <ServerCrash className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950/90 leading-relaxed space-y-1">
            <p className="font-bold">यह कैसे काम करता है?</p>
            <p>
              जब Vercel की ओर से <strong>75% या 90% फ्री लिमिट चेतावनी ईमेल</strong> आए, तो साइट पूरी तरह रुकने से पहले ही ऊपर दिया गया स्विच चालू करके <strong>"सेव व तुरंत पुश करें"</strong> दबा दें। इससे नए व पुराने सभी किसानों को यह सम्मानजनक हिंदी संदेश दिखेगा। साथ ही, यदि इंस्टॉल किए गए ऐप (PWA) में कभी अचानक Vercel Pause (402) आता है, तो ऐप अपने आप भी यही संदेश दिखा देगा। <strong>एडमिन के लिए ऐप हमेशा खुला रहेगा।</strong>
            </p>
          </div>
        </div>

        {/* Two Column: Left Editor + Right Live Mobile UI Preview */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT: Switches + Message Editor */}
          <div className="xl:col-span-6 space-y-4">
            {/* Switch 1: Manual Monthly Limit Notice */}
            <div
              className={cn(
                'flex items-center justify-between gap-4 p-4 rounded-2xl border transition-colors',
                currentNotice.enabled
                  ? 'bg-amber-50/90 border-amber-300'
                  : 'bg-gray-50 border-gray-200/70'
              )}
            >
              <div>
                <h4 className="font-bold text-gray-800 text-sm">
                  मासिक फ्री सीमा सूचना चालू करें (Activate Limit Notice)
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  चालू होने पर सामान्य किसानों को मुख्य ऐप की जगह यह संदेश दिखेगा।
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateNoticeField({ enabled: !currentNotice.enabled })}
                className={cn(
                  'w-14 h-8 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer',
                  currentNotice.enabled ? 'bg-amber-600' : 'bg-gray-300'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-200 shadow-sm',
                    currentNotice.enabled ? 'left-7' : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Switch 2: Auto Detect Vercel 402 Pause */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200/70">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">
                  Vercel Pause (402) होने पर अपने आप दिखाएँ
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  इंस्टॉल्ड PWA ऐप में यदि सर्वर से 402 Pause मिले, तो स्वतः यही संदेश खुले।
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateNoticeField({ autoDetectVercelPause: !currentNotice.autoDetectVercelPause })
                }
                className={cn(
                  'w-14 h-8 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer',
                  currentNotice.autoDetectVercelPause ? 'bg-[#2D5A27]' : 'bg-gray-300'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-200 shadow-sm',
                    currentNotice.autoDetectVercelPause ? 'left-7' : 'left-1'
                  )}
                />
              </button>
            </div>

            {/* Editable Fields */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  संदेश संपादित करें (Edit Message)
                </span>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="text-xs font-bold text-[#2D5A27] hover:text-emerald-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>विकल्प 1 डिफ़ॉल्ट वापस लाएँ</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  ऊपरी बैज टैग (Top Badge)
                </label>
                <input
                  type="text"
                  value={currentNotice.badgeText || ''}
                  onChange={(e) => updateNoticeField({ badgeText: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm"
                  placeholder={DEFAULT_MONTHLY_LIMIT_NOTICE.badgeText}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  मुख्य शीर्षक (Main Title)
                </label>
                <input
                  type="text"
                  value={currentNotice.title || ''}
                  onChange={(e) => updateNoticeField({ title: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-bold text-sm"
                  placeholder={DEFAULT_MONTHLY_LIMIT_NOTICE.title}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  किसानों के लिए पूरा संदेश (Full Message Body)
                </label>
                <textarea
                  value={currentNotice.message || ''}
                  onChange={(e) => updateNoticeField({ message: e.target.value })}
                  rows={9}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-medium text-sm leading-relaxed"
                  placeholder={DEFAULT_MONTHLY_LIMIT_NOTICE.message}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  नीचे का हस्ताक्षर (Signature)
                </label>
                <input
                  type="text"
                  value={currentNotice.signature || ''}
                  onChange={(e) => updateNoticeField({ signature: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2D5A27] focus:bg-white rounded-2xl p-3.5 outline-none transition-all font-bold text-sm"
                  placeholder={DEFAULT_MONTHLY_LIMIT_NOTICE.signature}
                />
              </div>
            </div>

            {feedback && (
              <div
                className={cn(
                  'p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-bold',
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                )}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={handleSaveOnly}
                disabled={isSavingNotice || isPushingNotice}
                className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSavingNotice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>केवल सेव करें</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndForcePush}
                disabled={isSavingNotice || isPushingNotice}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPushingNotice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Radio className="w-4 h-4" />
                )}
                <span>सेव व तुरंत पुश करें</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Live Real-Time Farmer UI Preview */}
          <div className="xl:col-span-6 space-y-3">
            <div className="flex items-center justify-between gap-2 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-200/70">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#2D5A27]" />
                <span className="text-xs font-extrabold text-gray-800">
                  लाइव किसान UI प्रीव्यू (Live User Preview)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFullPreview(true)}
                className="text-xs font-bold text-[#2D5A27] hover:text-emerald-800 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 shadow-xs hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>पूर्ण स्क्रीन प्रीव्यू देखें</span>
              </button>
            </div>

            <div className="bg-slate-900/5 p-2 sm:p-3 rounded-[2rem] border border-gray-200 shadow-inner">
              <MonthlyLimitNoticeScreen
                config={currentNotice}
                logo={contentForm.branding?.logo}
                isPreview={true}
                onRetry={() => {}}
              />
            </div>
            <p className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-gray-400" />
              <span>बाईं ओर जो भी बदलाव करेंगे, वह ऊपर रियल-टाइम में किसानों की स्क्रीन जैसा दिखेगा।</span>
            </p>
          </div>
        </div>
      </div>

      {/* Full Screen Interactive Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#2D5A27]" />
              <span className="text-xs sm:text-sm font-extrabold text-gray-800">
                पूर्ण स्क्रीन किसान प्रीव्यू (जैसा किसानों के फ़ोन में दिखेगा)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowFullPreview(false)}
              className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>प्रीव्यू बंद करें</span>
            </button>
          </div>
          <MonthlyLimitNoticeScreen
            config={currentNotice}
            logo={contentForm.branding?.logo}
            onRetry={() => {}}
          />
        </div>
      )}
    </div>
  );
};

export default AdminMonthlyLimitNoticeManager;
