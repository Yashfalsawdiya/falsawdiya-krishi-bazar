import React from 'react';
import { CalendarClock, HeartHandshake, RefreshCw, ShieldAlert, Server } from 'lucide-react';
import { ImageSource, MonthlyLimitNoticeConfig } from '../types';
import SmartImage from './SmartImage';
import { DEFAULT_MONTHLY_LIMIT_NOTICE } from '../utils/vercelPauseDetector';
import { cn } from '../lib/utils';

interface MonthlyLimitNoticeScreenProps {
  config?: MonthlyLimitNoticeConfig;
  logo?: string | ImageSource;
  isAutoDetected?: boolean;
  isPreview?: boolean;
  onRetry?: () => void | Promise<void>;
  retrying?: boolean;
}

export const MonthlyLimitNoticeScreen: React.FC<MonthlyLimitNoticeScreenProps> = ({
  config,
  logo,
  isAutoDetected = false,
  isPreview = false,
  onRetry,
  retrying = false,
}) => {
  const badgeText = (config?.badgeText || DEFAULT_MONTHLY_LIMIT_NOTICE.badgeText).trim();
  const title = (config?.title || DEFAULT_MONTHLY_LIMIT_NOTICE.title).trim();
  const rawMessage = (config?.message || DEFAULT_MONTHLY_LIMIT_NOTICE.message).trim();
  const signature = (config?.signature || DEFAULT_MONTHLY_LIMIT_NOTICE.signature).trim();

  const paragraphs = rawMessage
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      className={cn(
        'bg-[#F5F2ED] flex flex-col items-center justify-center relative overflow-hidden',
        isPreview ? 'p-4 sm:p-5 rounded-3xl border border-amber-200/80' : 'min-h-screen p-4 sm:p-6'
      )}
    >
      {/* Subtle Ambient Background Accents */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

      <div
        className={cn(
          'relative bg-white w-full rounded-3xl shadow-xl border border-amber-200/90 overflow-hidden',
          isPreview ? 'max-w-md' : 'max-w-lg'
        )}
      >
        {/* Top Accent Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-[#2D5A27] via-amber-500 to-[#2D5A27]" />

        <div className={cn('space-y-5', isPreview ? 'p-5 sm:p-6' : 'p-6 sm:p-8')}>
          {/* Brand Logo + Badge */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-md border border-emerald-100 flex items-center justify-center p-2 overflow-hidden">
              <SmartImage
                src={logo || '/icon-192.png'}
                fallbackSrc="/icon-192.png"
                alt="फल्सावदिया कृषि बाजार"
                className="w-full h-full"
                objectFit="contain"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold tracking-wide">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{badgeText}</span>
            </div>

            <h1
              className={cn(
                'font-black text-[#4A3728] leading-snug tracking-tight',
                isPreview ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
              )}
            >
              {title}
            </h1>
          </div>

          {/* Main Hindi Message Body */}
          <div className="bg-[#FAF8F5] border border-amber-100/90 rounded-2xl p-4 sm:p-5 space-y-3 text-left">
            {paragraphs.map((para, idx) => (
              <p
                key={idx}
                className={cn(
                  'text-gray-700 leading-relaxed whitespace-pre-line font-medium',
                  isPreview ? 'text-xs sm:text-[13px]' : 'text-sm sm:text-[15px]',
                  idx === 0 && 'font-bold text-[#2D5A27]'
                )}
              >
                {para}
              </p>
            ))}
          </div>

          {/* Reset & Zero-Cost Note Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/70">
              <div className="w-8 h-8 rounded-xl bg-white text-[#2D5A27] flex items-center justify-center shrink-0 shadow-xs">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  सेवा पुनः प्रारंभ
                </p>
                <p className="text-xs font-bold text-gray-800">अगले माह की 1 तारीख</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70">
              <div className="w-8 h-8 rounded-xl bg-white text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                <Server className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                  सेवा स्थिति
                </p>
                <p className="text-xs font-bold text-gray-800">
                  {isAutoDetected ? 'सर्वर मासिक सीमा पूर्ण' : 'निःशुल्क सीमा अस्थायी विराम'}
                </p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-[#2D5A27]">
            <HeartHandshake className="w-4 h-4 text-[#2D5A27] shrink-0" />
            <span>— {signature}</span>
          </div>

          {/* Optional Retry Check Button */}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="w-full py-3 px-4 rounded-2xl bg-[#2D5A27] hover:bg-[#23471E] active:scale-[0.99] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={cn('w-4 h-4', retrying && 'animate-spin')} />
              <span>{retrying ? 'सेवा स्थिति जांची जा रही है...' : 'पुनः जांचें (Refresh Status)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyLimitNoticeScreen;
