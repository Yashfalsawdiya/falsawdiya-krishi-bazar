import React from 'react';
import {
  CheckCircle2,
  CloudRain,
  Snowflake,
  CloudFog,
  ThermometerSun,
  Wind,
  AlertTriangle,
  Sprout,
} from 'lucide-react';
import type { FarmerWeatherAdvice, WeatherAdviceTone } from '../../utils/agriWeatherEngine';
import { cn } from '../../lib/utils';

interface FarmerWeatherAdviceCardProps {
  advice: FarmerWeatherAdvice;
}

const TONE_THEME: Record<
  WeatherAdviceTone,
  { card: string; iconWrap: string; icon: string; status: string; Icon: React.ElementType }
> = {
  favorable: {
    card: 'bg-white border-emerald-200/90',
    iconWrap: 'bg-emerald-50 border-emerald-200/80',
    icon: 'text-[#2D5A27]',
    status: 'text-[#2D5A27]',
    Icon: Sprout,
  },
  rain: {
    card: 'bg-sky-50/40 border-sky-200',
    iconWrap: 'bg-sky-50 border-sky-200',
    icon: 'text-sky-700',
    status: 'text-sky-800',
    Icon: CloudRain,
  },
  cold: {
    card: 'bg-indigo-50/40 border-indigo-200',
    iconWrap: 'bg-indigo-50 border-indigo-200',
    icon: 'text-indigo-700',
    status: 'text-indigo-800',
    Icon: Snowflake,
  },
  fog: {
    card: 'bg-slate-50/70 border-slate-200',
    iconWrap: 'bg-slate-100 border-slate-200',
    icon: 'text-slate-700',
    status: 'text-slate-800',
    Icon: CloudFog,
  },
  heat: {
    card: 'bg-amber-50/50 border-amber-200',
    iconWrap: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-700',
    status: 'text-amber-800',
    Icon: ThermometerSun,
  },
  wind: {
    card: 'bg-amber-50/40 border-amber-200',
    iconWrap: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-700',
    status: 'text-amber-800',
    Icon: Wind,
  },
  alert: {
    card: 'bg-rose-50/50 border-rose-200',
    iconWrap: 'bg-rose-50 border-rose-200',
    icon: 'text-rose-700',
    status: 'text-rose-800',
    Icon: AlertTriangle,
  },
};

export const FarmerWeatherAdviceCard: React.FC<FarmerWeatherAdviceCardProps> = ({ advice }) => {
  const theme = TONE_THEME[advice.tone];
  const IconComp = theme.Icon;

  return (
    <section aria-label="मौसम के अनुसार किसान सलाह">
      <article className={cn('rounded-3xl border p-5 sm:p-6 shadow-xs space-y-3.5', theme.card)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0',
                theme.iconWrap
              )}
            >
              <IconComp className={cn('w-5 h-5 stroke-[2]', theme.icon)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <CheckCircle2 className={cn('w-3.5 h-3.5 shrink-0', theme.status)} />
                <span className={theme.status}>{advice.statusLabel}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#4A3728] leading-snug mt-0.5">
                {advice.title}
              </h2>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
          {advice.summary}
        </p>

        <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700 pt-1">
          {advice.tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2 leading-relaxed">
              <span className="text-[#2D5A27] font-bold mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        <p className="text-[11px] text-gray-500 pt-2.5 border-t border-black/[0.06] leading-relaxed">
          नोट: {advice.disclaimer}
        </p>
      </article>
    </section>
  );
};
