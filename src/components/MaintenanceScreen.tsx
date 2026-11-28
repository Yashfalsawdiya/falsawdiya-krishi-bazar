import React from 'react';
import { Clock, HeartHandshake, RefreshCw, ShieldAlert, Wrench } from 'lucide-react';
import { ImageSource, MaintenanceNoticeConfig } from '../types';
import SmartImage from './SmartImage';
import { cn } from '../lib/utils';

export const DEFAULT_MAINTENANCE_NOTICE: Required<MaintenanceNoticeConfig> = {
  badgeText: 'रखरखाव कार्य जारी (Maintenance Mode)',
  title: 'ऐप अभी बंद है',
  message:
    'नमस्ते किसान भाइयों! ऐप में कुछ महत्वपूर्ण सुधार व रखरखाव कार्य चल रहा है, इसलिए यह अभी अस्थायी रूप से उपलब्ध नहीं है।\n\nकृपया कुछ समय बाद पुनः प्रयास करें। आपकी असुविधा के लिए खेद है।',
  signature: 'फल्सावदिया कृषि बाजार',
};

interface MaintenanceScreenProps {
  config?: MaintenanceNoticeConfig;
  logo?: string | ImageSource;
  isPreview?: boolean;
  onRetry?: () => void | Promise<void>;
  retrying?: boolean;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  config,
  logo,
  isPreview = false,
  onRetry,
  retrying = false,
}) => {
  const badgeText = (config?.badgeText || DEFAULT_MAINTENANCE_NOTICE.badgeText).trim();
  const title = (config?.title || DEFAULT_MAINTENANCE_NOTICE.title).trim();
  const rawMessage = (config?.message || DEFAULT_MAINTENANCE_NOTICE.message).trim();
  const signature = (config?.signature || DEFAULT_MAINTENANCE_NOTICE.signature).trim();

  const paragraphs = rawMessage
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      className={cn(
        'bg-[#F5F2ED] flex flex-col items-center justify-center relative overflow-hidden',
        isPreview ? 'p-4 sm:p-5 rounded-3xl border border-rose-200/80' : 'min-h-screen p-4 sm:p-6'
      )}
    >
      {/* Subtle Ambient Background Accents */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

      <div
        className={cn(
          'relative bg-white w-full rounded-3xl shadow-xl border border-rose-200/80 overflow-hidden',
          isPreview ? 'max-w-md' : 'max-w-lg'
        )}
      >
        {/* Top Accent Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-[#4A3728] via-rose-500 to-[#2D5A27]" />

        <div className={cn('space-y-5', isPreview ? 'p-5 sm:p-6' : 'p-6 sm:p-8')}>
          {/* Brand Logo + Maintenance Badge */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-18 h-18 bg-white rounded-2xl shadow-md border border-rose-100 flex items-center justify-center p-2 overflow-hidden">
              <SmartImage
                src={logo || '/icon-192.png'}
                fallbackSrc="/icon-192.png"
                alt="Maintenance"
                className="w-full h-full opacity-75 grayscale"
                objectFit="contain"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-extrabold tracking-wide">
              <Wrench className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{badgeText}</span>
            </div>

            <h1
              className={cn(
                'font-black text-[#4A3728] leading-snug tracking-tight',
                isPreview ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'
              )}
            >
              {title}
            </h1>
          </div>

          {/* Main Message Body */}
          <div className="bg-[#FAF8F5] border border-gray-200/80 rounded-2xl p-4 sm:p-5 space-y-3 text-left">
            {paragraphs.map((para, idx) => (
              <p
                key={idx}
                className={cn(
                  'text-gray-700 leading-relaxed whitespace-pre-line font-medium',
                  isPreview ? 'text-xs sm:text-[13px]' : 'text-sm sm:text-[15px]',
                  idx === 0 && 'font-bold text-[#4A3728]'
                )}
              >
                {para}
              </p>
            ))}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50/70 border border-rose-200/70">
              <div className="w-8 h-8 rounded-xl bg-white text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                  ऐप स्थिति
                </p>
                <p className="text-xs font-bold text-gray-800">सुधार कार्य सक्रिय</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/70">
              <div className="w-8 h-8 rounded-xl bg-white text-[#2D5A27] flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  सुविधा बहाली
                </p>
                <p className="text-xs font-bold text-gray-800">जल्द पुनः शुरू होगी</p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-[#2D5A27]">
            <HeartHandshake className="w-4 h-4 text-[#2D5A27] shrink-0" />
            <span>— {signature}</span>
          </div>

          {/* Refresh Status Button */}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="w-full py-3 px-4 rounded-2xl bg-[#2D5A27] hover:bg-[#23471E] active:scale-[0.99] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={cn('w-4 h-4', retrying && 'animate-spin')} />
              <span>{retrying ? 'ऐप स्थिति जांची जा रही है...' : 'पुनः जांचें (Refresh Status)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
