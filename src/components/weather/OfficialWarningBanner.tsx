import React from 'react';
import { ShieldAlert, AlertTriangle, Info, Clock, MapPin } from 'lucide-react';
import type { OfficialWeatherWarning } from '../../services/weatherService';
import { formatHindiDateTime } from '../../lib/dateUtils';
import { cn } from '../../lib/utils';

interface OfficialWarningBannerProps {
  warnings: OfficialWeatherWarning[];
}

const SEVERITY_META: Record<
  OfficialWeatherWarning['severity'],
  { label: string; container: string; iconColor: string; labelColor: string; Icon: React.ElementType }
> = {
  Extreme: {
    label: 'रेड अलर्ट · अत्यधिक गंभीर',
    container: 'bg-rose-50/90 border-rose-300',
    iconColor: 'text-rose-700',
    labelColor: 'text-rose-800',
    Icon: ShieldAlert,
  },
  Severe: {
    label: 'ऑरेंज अलर्ट · गंभीर चेतावनी',
    container: 'bg-orange-50/90 border-orange-300',
    iconColor: 'text-orange-700',
    labelColor: 'text-orange-800',
    Icon: AlertTriangle,
  },
  Moderate: {
    label: 'येलो अलर्ट · सतर्क रहें',
    container: 'bg-amber-50/90 border-amber-300',
    iconColor: 'text-amber-700',
    labelColor: 'text-amber-800',
    Icon: AlertTriangle,
  },
  Minor: {
    label: 'सामान्य सूचना',
    container: 'bg-sky-50/90 border-sky-200',
    iconColor: 'text-sky-700',
    labelColor: 'text-sky-800',
    Icon: Info,
  },
  Unknown: {
    label: 'सरकारी मौसम सूचना',
    container: 'bg-amber-50/80 border-amber-200',
    iconColor: 'text-amber-700',
    labelColor: 'text-amber-800',
    Icon: Info,
  },
};

export const OfficialWarningBanner: React.FC<OfficialWarningBannerProps> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <section aria-label="आधिकारिक सरकारी मौसम चेतावनी" className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
          <h2 className="text-sm font-bold text-[#4A3728]">
            आधिकारिक सरकारी चेतावनी (IMD / NDMA सचेत)
          </h2>
        </div>
        <span className="text-xs font-medium text-gray-500 tabular-nums">
          {warnings.length} सक्रिय अलर्ट
        </span>
      </div>

      <div className="space-y-2.5">
        {warnings.map((w) => {
          const meta = SEVERITY_META[w.severity] || SEVERITY_META.Unknown;
          const IconComp = meta.Icon;
          const expiresFormatted = w.expires ? formatHindiDateTime(w.expires) : '';

          return (
            <article
              key={w.id}
              className={cn(
                'rounded-2xl border p-4 sm:p-5 transition-colors',
                meta.container
              )}
            >
              <div className="flex items-start gap-3">
                <IconComp className={cn('w-5 h-5 shrink-0 mt-0.5', meta.iconColor)} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
                    <span className={meta.labelColor}>{meta.label}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-700">{w.event}</span>
                    {w.isLocalMatch && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-[#2D5A27] font-bold">मंदसौर / मालवा क्षेत्र</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                    {w.headline || w.event}
                  </h3>

                  {w.description && w.description !== w.headline && (
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {w.description}
                    </p>
                  )}

                  {w.instruction && (
                    <p className="text-xs sm:text-sm text-gray-800 font-medium pt-1 border-t border-black/[0.06]">
                      बचाव निर्देश: {w.instruction}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-gray-600 tabular-nums">
                    {w.areaDesc && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{w.areaDesc}</span>
                      </span>
                    )}
                    {expiresFormatted && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>वैधता: {expiresFormatted} तक</span>
                      </span>
                    )}
                    <span className="text-gray-500">स्रोत: {w.sender}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
