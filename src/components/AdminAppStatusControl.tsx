import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Maximize2,
  Power,
  Radio,
  RotateCcw,
  Save,
  Smartphone,
  Wrench,
  X,
} from 'lucide-react';
import { AppContent } from '../context/AppContext';
import { MaintenanceNoticeConfig } from '../types';
import { MetadataCollectionKey } from '../utils/dataSyncManager';
import MaintenanceScreen, { DEFAULT_MAINTENANCE_NOTICE } from './MaintenanceScreen';
import { cn } from '../lib/utils';

interface AdminAppStatusControlProps {
  contentForm: AppContent | null;
  setContentForm: React.Dispatch<React.SetStateAction<AppContent | null>>;
  onSaveContent: (updated: AppContent) => Promise<void>;
  onForcePush: (message?: string, changedCollections?: MetadataCollectionKey[]) => Promise<any>;
}

export const AdminAppStatusControl: React.FC<AdminAppStatusControlProps> = ({
  contentForm,
  setContentForm,
  onSaveContent,
  onForcePush,
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [isPushingNotice, setIsPushingNotice] = useState(false);
  const [showPreviewEditor, setShowPreviewEditor] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!contentForm) return null;

  // Strictly normalize undefined -> true so the 1st click always flips to false cleanly
  const isAppActive = contentForm.isAppActive !== false;

  const currentNotice: MaintenanceNoticeConfig = {
    badgeText: contentForm.maintenanceNotice?.badgeText ?? DEFAULT_MAINTENANCE_NOTICE.badgeText,
    title: contentForm.maintenanceNotice?.title ?? DEFAULT_MAINTENANCE_NOTICE.title,
    message: contentForm.maintenanceNotice?.message ?? DEFAULT_MAINTENANCE_NOTICE.message,
    signature: contentForm.maintenanceNotice?.signature ?? DEFAULT_MAINTENANCE_NOTICE.signature,
  };

  const buildUpdatedContent = (
    overrideActive?: boolean,
    overrideNotice?: Partial<MaintenanceNoticeConfig>
  ): AppContent => ({
    ...contentForm,
    isAppActive: typeof overrideActive === 'boolean' ? overrideActive : isAppActive,
    maintenanceNotice: {
      ...currentNotice,
      ...overrideNotice,
    },
  });

  const updateNoticeField = (patch: Partial<MaintenanceNoticeConfig>) => {
    setContentForm((prev) => {
      if (!prev) return prev;
      const merged: MaintenanceNoticeConfig = {
        badgeText: prev.maintenanceNotice?.badgeText ?? DEFAULT_MAINTENANCE_NOTICE.badgeText,
        title: prev.maintenanceNotice?.title ?? DEFAULT_MAINTENANCE_NOTICE.title,
        message: prev.maintenanceNotice?.message ?? DEFAULT_MAINTENANCE_NOTICE.message,
        signature: prev.maintenanceNotice?.signature ?? DEFAULT_MAINTENANCE_NOTICE.signature,
        ...patch,
      };
      return {
        ...prev,
        isAppActive: prev.isAppActive !== false,
        maintenanceNotice: merged,
      };
    });
  };

  const handleToggleAppStatus = async () => {
    if (isToggling || isSavingNotice || isPushingNotice) return;
    const nextIsAppActive = !isAppActive;
    const updated = buildUpdatedContent(nextIsAppActive);
    setContentForm(updated);
    if (!nextIsAppActive) {
      setShowPreviewEditor(true);
    }
    setIsToggling(true);
    setFeedback(null);
    try {
      await onSaveContent(updated);
      setFeedback({
        type: 'success',
        text: nextIsAppActive
          ? 'ऐप स्टेटस "चालू (Active)" तुरंत सेव हो गया! सभी किसानों पर तुरंत लागू करने के लिए "सेव व तुरंत पुश करें" दबाएं।'
          : 'ऐप स्टेटस "बंद (Maintenance Mode)" तुरंत सेव हो गया! सभी किसानों पर तुरंत लागू करने के लिए "सेव व तुरंत पुश करें" दबाएं।',
      });
      setTimeout(() => setFeedback(null), 7000);
    } catch (err: any) {
      // Revert local toggle state on failure
      setContentForm((prev) => (prev ? { ...prev, isAppActive } : prev));
      setFeedback({
        type: 'error',
        text: err?.message || 'ऐप स्टेटस सेव करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleSaveOnly = async () => {
    setIsSavingNotice(true);
    setFeedback(null);
    try {
      const updated = buildUpdatedContent();
      setContentForm(updated);
      await onSaveContent(updated);
      setFeedback({
        type: 'success',
        text: 'ऐप स्टेटस व रखरखाव संदेश सफलतापूर्वक सेव हो गया!',
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
        updated.isAppActive === false
          ? 'एडमिन द्वारा ऐप अस्थायी रखरखाव (Maintenance Mode) पर रखा गया है।'
          : 'एडमिन द्वारा ऐप पुनः सभी किसानों के लिए चालू कर दिया गया है।',
        ['content']
      );
      setFeedback({
        type: 'success',
        text:
          updated.isAppActive === false
            ? 'ऐप बंद (Maintenance Mode) सेव होकर सभी किसानों के लिए तुरंत पुश कर दिया गया है! (Admin के लिए ऐप हमेशा खुला रहेगा।)'
            : 'ऐप चालू (Live) होकर सभी किसानों के लिए तुरंत पुश कर दिया गया है!',
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
      badgeText: DEFAULT_MAINTENANCE_NOTICE.badgeText,
      title: DEFAULT_MAINTENANCE_NOTICE.title,
      message: DEFAULT_MAINTENANCE_NOTICE.message,
      signature: DEFAULT_MAINTENANCE_NOTICE.signature,
    });
  };

  const isExpanded = showPreviewEditor || !isAppActive;

  return (
    <div className="space-y-4">
      {/* Main Instant App Status Switch Row */}
      <div
        className={cn(
          'p-4 rounded-2xl border transition-colors space-y-3',
          isAppActive
            ? 'bg-emerald-50/60 border-emerald-200/80'
            : 'bg-rose-50/80 border-rose-200'
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                <Power className={cn('w-4 h-4', isAppActive ? 'text-[#2D5A27]' : 'text-rose-600')} />
                <span>ऐप स्टेटस (App Status)</span>
              </h4>
              <span
                className={cn(
                  'text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1',
                  isAppActive
                    ? 'bg-emerald-100/80 text-[#2D5A27] border-emerald-300'
                    : 'bg-rose-100 text-rose-700 border-rose-300'
                )}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isAppActive ? 'bg-[#2D5A27]' : 'bg-rose-600 animate-pulse'
                  )}
                />
                {isAppActive ? 'चालू (Live)' : 'बंद (Maintenance Mode)'}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              इसे बंद करने पर यह <strong>तुरंत सेव</strong> हो जाता है और सामान्य किसानों को ऐप की जगह आपका रखरखाव संदेश दिखता है। (Admin हमेशा ऐप इस्तेमाल कर पाएंगे।)
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleAppStatus}
            disabled={isToggling || isPushingNotice}
            aria-label="ऐप स्टेटस बदलें"
            className={cn(
              'w-14 h-8 rounded-full relative transition-colors duration-200 shrink-0 cursor-pointer disabled:opacity-60',
              isAppActive ? 'bg-[#2D5A27]' : 'bg-rose-500'
            )}
          >
            <div
              className={cn(
                'absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-200 shadow-sm flex items-center justify-center',
                isAppActive ? 'left-7' : 'left-1'
              )}
            >
              {isToggling && <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />}
            </div>
          </button>
        </div>

        {/* Quick Toolbar: Force Push Now + Toggle Editor/Preview */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/70">
          <button
            type="button"
            onClick={() => setShowPreviewEditor((v) => !v)}
            className="text-xs font-bold text-[#4A3728] hover:text-[#2D5A27] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-xs transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#2D5A27]" />
            <span>बंद स्क्रीन संदेश व लाइव प्रीव्यू</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleSaveAndForcePush}
            disabled={isToggling || isSavingNotice || isPushingNotice}
            className="text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPushingNotice ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Radio className="w-3.5 h-3.5" />
            )}
            <span>सेव व तुरंत पुश करें</span>
          </button>
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

      {/* Collapsible Maintenance Message Editor + Live Farmer UI Preview */}
      {isExpanded && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gray-50/70 border border-gray-200/80 space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT: Message Editor */}
            <div className="xl:col-span-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#4A3728] flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-rose-600" />
                  <span>रखरखाव संदेश संपादित करें (Maintenance Screen Text)</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="text-[11px] font-bold text-[#2D5A27] hover:text-emerald-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>डिफ़ॉल्ट संदेश वापस लाएँ</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  ऊपरी बैज (Top Badge)
                </label>
                <input
                  type="text"
                  value={currentNotice.badgeText || ''}
                  onChange={(e) => updateNoticeField({ badgeText: e.target.value })}
                  className="w-full bg-white border border-gray-200 focus:border-[#2D5A27] rounded-2xl p-3 outline-none transition-all font-medium text-sm"
                  placeholder={DEFAULT_MAINTENANCE_NOTICE.badgeText}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  मुख्य शीर्षक (Heading)
                </label>
                <input
                  type="text"
                  value={currentNotice.title || ''}
                  onChange={(e) => updateNoticeField({ title: e.target.value })}
                  className="w-full bg-white border border-gray-200 focus:border-[#2D5A27] rounded-2xl p-3 outline-none transition-all font-bold text-sm"
                  placeholder={DEFAULT_MAINTENANCE_NOTICE.title}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  किसानों को दिखने वाला संदेश (Message)
                </label>
                <textarea
                  value={currentNotice.message || ''}
                  onChange={(e) => updateNoticeField({ message: e.target.value })}
                  rows={5}
                  className="w-full bg-white border border-gray-200 focus:border-[#2D5A27] rounded-2xl p-3 outline-none transition-all font-medium text-sm leading-relaxed"
                  placeholder={DEFAULT_MAINTENANCE_NOTICE.message}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                  हस्ताक्षर (Signature)
                </label>
                <input
                  type="text"
                  value={currentNotice.signature || ''}
                  onChange={(e) => updateNoticeField({ signature: e.target.value })}
                  className="w-full bg-white border border-gray-200 focus:border-[#2D5A27] rounded-2xl p-3 outline-none transition-all font-bold text-sm"
                  placeholder={DEFAULT_MAINTENANCE_NOTICE.signature}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSaveOnly}
                  disabled={isToggling || isSavingNotice || isPushingNotice}
                  className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
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
                  disabled={isToggling || isSavingNotice || isPushingNotice}
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
              <div className="flex items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#2D5A27]" />
                  <span className="text-xs font-extrabold text-gray-800">
                    लाइव किसान UI प्रीव्यू (Live User Preview)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullPreview(true)}
                  className="text-xs font-bold text-[#2D5A27] hover:text-emerald-800 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>पूर्ण स्क्रीन प्रीव्यू</span>
                </button>
              </div>

              <div className="bg-slate-900/5 p-2 sm:p-3 rounded-[2rem] border border-gray-200 shadow-inner">
                <MaintenanceScreen
                  config={currentNotice}
                  logo={contentForm.branding?.logo}
                  isPreview={true}
                  onRetry={() => {}}
                />
              </div>
              <p className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span>ऐप बंद करने पर किसानों के फ़ोन में यही स्क्रीन दिखेगी।</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Interactive Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#2D5A27]" />
              <span className="text-xs sm:text-sm font-extrabold text-gray-800">
                पूर्ण स्क्रीन किसान प्रीव्यू (ऐप बंद / रखरखाव स्क्रीन)
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
          <MaintenanceScreen
            config={currentNotice}
            logo={contentForm.branding?.logo}
            onRetry={() => {}}
          />
        </div>
      )}
    </div>
  );
};

export default AdminAppStatusControl;
