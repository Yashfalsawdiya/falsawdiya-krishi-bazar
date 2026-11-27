import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CloudSun,
  Wind,
  Droplets,
  Sun,
  CloudRain,
  CloudFog,
  CloudHail,
  Loader2,
  Cloud,
  CloudLightning,
  RefreshCw,
  MapPin,
  Moon,
  CloudMoon,
  ArrowUp,
  ArrowDown,
  Sunrise,
  Sunset,
  Eye,
  Thermometer,
  WifiOff,
  Gauge,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  fetchOfficialWarnings,
  fetchWeather,
  OfficialWeatherWarning,
  WeatherData,
} from '../services/weatherService';
import {
  formatVisibilityHindi,
  formatWeatherTime,
  formatWeekday,
  getHindiCondition,
  getWindDirectionHindi,
  parseLocalDate,
} from '../utils/weatherLocalization';
import { formatHindiDate, formatHindiDateTime, formatHindiTime } from '../lib/dateUtils';
import {
  getDailyRiskMap,
  getFarmerWeatherAdvice,
  getNext24hRainMm,
} from '../utils/agriWeatherEngine';
import { OfficialWarningBanner } from '../components/weather/OfficialWarningBanner';
import { FarmerWeatherAdviceCard } from '../components/weather/FarmerWeatherAdviceCard';
import { cn } from '../lib/utils';

const DEFAULT_COORDS = {
  label: 'शामगढ़, मध्य प्रदेश',
  lat: 24.1864,
  lon: 75.6328,
};

function getConditionIcon(condition: string, weatherCode?: number, isNight?: boolean): React.ElementType {
  if (weatherCode === 96 || weatherCode === 99 || condition.includes('ओले')) return CloudHail;
  if (weatherCode === 95 || condition.includes('गरज') || condition.includes('तूफान')) return CloudLightning;
  if (weatherCode === 45 || weatherCode === 48 || condition.includes('कोहरा') || condition.includes('धुंध')) {
    return CloudFog;
  }
  if (
    (weatherCode !== undefined && [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) ||
    condition.includes('बारिश') ||
    condition.includes('बौछार') ||
    condition.includes('बूंदाबांदी') ||
    condition.includes('वर्षा')
  ) {
    return CloudRain;
  }
  if (isNight) {
    if (weatherCode === 2 || weatherCode === 3 || condition.includes('बादल') || condition.includes('आंशिक')) {
      return CloudMoon;
    }
    return Moon;
  }
  if (weatherCode === 3 || condition.includes('घने बादल')) return Cloud;
  if (weatherCode === 2 || condition.includes('आंशिक') || condition.includes('बादल')) return CloudSun;
  return Sun;
}

function getHeroIconSurface(condition: string, weatherCode?: number, isNight?: boolean) {
  if (weatherCode === 45 || weatherCode === 48 || condition.includes('कोहरा') || condition.includes('धुंध')) {
    return {
      container: 'bg-slate-100/90 border-slate-200',
      icon: 'text-slate-600',
    };
  }
  if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99 || condition.includes('गरज') || condition.includes('तूफान') || condition.includes('ओले')) {
    return {
      container: 'bg-indigo-50 border-indigo-200',
      icon: 'text-indigo-700',
    };
  }
  if (
    (weatherCode !== undefined && [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) ||
    condition.includes('बारिश') ||
    condition.includes('बूंदाबांदी') ||
    condition.includes('बौछार') ||
    condition.includes('वर्षा')
  ) {
    return {
      container: 'bg-sky-50 border-sky-200',
      icon: 'text-sky-600',
    };
  }
  if (isNight) {
    return {
      container: 'bg-slate-100 border-indigo-200/80',
      icon: 'text-indigo-600',
    };
  }
  if (weatherCode === 3 || condition.includes('घने बादल')) {
    return {
      container: 'bg-cyan-50/90 border-cyan-200',
      icon: 'text-cyan-700',
    };
  }
  if (weatherCode === 2 || condition.includes('आंशिक') || condition.includes('बादल')) {
    return {
      container: 'bg-orange-50/90 border-orange-200',
      icon: 'text-orange-500',
    };
  }
  return {
    container: 'bg-amber-50/90 border-amber-200',
    icon: 'text-amber-500',
  };
}

const Weather: React.FC = () => {
  const [activeLoc, setActiveLoc] = useState(DEFAULT_COORDS);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [warnings, setWarnings] = useState<OfficialWeatherWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllWeatherData = useCallback(
    async (loc: { label: string; lat: number; lon: number }, force: boolean = false, isSilentRefresh: boolean = false) => {
      if (isSilentRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [weatherRes, warningsRes] = await Promise.allSettled([
          fetchWeather(loc.lat, loc.lon, force),
          fetchOfficialWarnings(),
        ]);

        if (weatherRes.status === 'fulfilled') {
          setWeather(weatherRes.value);
        } else {
          setError('मौसम की जानकारी प्राप्त करने में समस्या आई। कृपया पुनः प्रयास करें।');
        }

        if (warningsRes.status === 'fulfilled') {
          setWarnings(warningsRes.value.warnings);
        }
      } catch {
        setError('मौसम की जानकारी प्राप्त करने में समस्या आई।');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    try {
      localStorage.removeItem('fkb_weather_active_location_v1');
    } catch {
      // Ignore
    }
    loadAllWeatherData(DEFAULT_COORDS, false, false);
  }, [loadAllWeatherData]);

  const handleManualRefresh = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const gpsLoc = {
            label: 'आपकी वर्तमान लोकेशन',
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4)),
          };
          setActiveLoc(gpsLoc);
          loadAllWeatherData(gpsLoc, true, true);
        },
        () => {
          loadAllWeatherData(activeLoc, true, true);
        },
        { enableHighAccuracy: false, timeout: 6000 }
      );
    } else {
      loadAllWeatherData(activeLoc, true, true);
    }
  };

  const next24hRainMm = useMemo(() => {
    if (!weather) return 0;
    return getNext24hRainMm(weather);
  }, [weather]);

  const dailyRiskMap = useMemo(() => {
    if (!weather) return {};
    return getDailyRiskMap(weather);
  }, [weather]);

  const farmerAdvice = useMemo(() => {
    if (!weather) return null;
    return getFarmerWeatherAdvice(weather, warnings);
  }, [weather, warnings]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-3">
        <Loader2 className="w-9 h-9 text-[#2D5A27] animate-spin" />
        <p className="text-sm font-semibold text-gray-600">
          कृषि मौसम और सरकारी अलर्ट लोड हो रहे हैं...
        </p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="max-w-xl mx-auto text-center p-6 bg-white border border-rose-200 rounded-2xl space-y-3">
        <WifiOff className="w-8 h-8 text-rose-600 mx-auto" />
        <p className="text-sm font-bold text-gray-900">
          {error || 'मौसम डेटा उपलब्ध नहीं हो सका।'}
        </p>
        <button
          type="button"
          onClick={() => loadAllWeatherData(activeLoc, true, false)}
          className="min-h-[44px] px-5 py-2 rounded-xl bg-[#2D5A27] text-white text-sm font-semibold cursor-pointer"
        >
          दोबारा प्रयास करें
        </button>
      </div>
    );
  }

  const isNowNight =
    weather.hourly && weather.hourly.length > 0
      ? Boolean(weather.hourly[0].isNight)
      : new Date().getHours() < 6 || new Date().getHours() >= 19;

  const heroConditionText = getHindiCondition(weather.condition, weather.weatherCode);
  const HeroIcon = getConditionIcon(heroConditionText, weather.weatherCode, isNowNight);
  const heroSurface = getHeroIconSurface(heroConditionText, weather.weatherCode, isNowNight);
  const sunriseText = weather.sunrise ? formatWeatherTime(weather.sunrise, 'hi') : '';
  const sunsetText = weather.sunset ? formatWeatherTime(weather.sunset, 'hi') : '';

  const isFetchedToday = weather.fetchedAt
    ? new Date(weather.fetchedAt).toDateString() === new Date().toDateString()
    : false;
  const lastUpdatedLabel = weather.fetchedAt
    ? isFetchedToday
      ? `${formatHindiTime(weather.fetchedAt)} (आज)`
      : formatHindiDateTime(weather.fetchedAt)
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Styled Page Header */}
      <div className="text-center bg-gradient-to-br from-[#2D5A27]/10 via-[#2D5A27]/5 to-transparent p-6 rounded-3xl border border-[#2D5A27]/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D5A27]/5 rounded-full blur-2xl -z-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -z-10" />

        <div className="flex justify-center mb-2">
          <div className="bg-[#2D5A27] text-white p-2.5 rounded-2xl shadow-lg shadow-[#2D5A27]/20 flex items-center justify-center">
            <CloudSun className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-[#2D5A27] tracking-tight">मौसम की जानकारी</h2>
        <p className="text-xs text-gray-500 font-medium mt-1">
          खेती-किसानी के लिए सटीक तापमान, पूर्वानुमान और ताज़ा मौसम अपडेट
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
          {lastUpdatedLabel ? (
            <span className="text-[9px] text-gray-500 font-bold bg-gray-100/80 border border-gray-200/50 px-2.5 py-1.5 rounded-full tabular-nums">
              अंतिम सफल अपडेट: {lastUpdatedLabel}
            </span>
          ) : (
            <span className="text-[9px] text-amber-700 font-bold bg-amber-50 border border-amber-200/60 px-2.5 py-1.5 rounded-full">
              अपडेट प्रतीक्षित
            </span>
          )}
        </div>
      </div>

      {/* Honest Stale / Offline / Fallback Notice */}
      {(weather.isFallback || weather.isStale) && (
        <div
          role="status"
          className="rounded-2xl border border-amber-300 bg-amber-50/90 px-4 py-3 flex items-start justify-between gap-3 text-xs sm:text-sm text-amber-950"
        >
          <div className="flex items-start gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {weather.isFallback
                ? 'इंटरनेट या मौसम सर्वर से संपर्क नहीं हो पा रहा है। लाइव डेटा उपलब्ध न होने के कारण तापमान प्रदर्शित नहीं हो सका।'
                : `इंटरनेट धीमा होने से पिछली सहेजी गई जानकारी दिखाई जा रही है (${
                    weather.fetchedAt ? formatHindiDateTime(weather.fetchedAt) : 'पुराना डेटा'
                  })।`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="text-xs font-bold text-[#2D5A27] underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            पुनः प्रयास
          </button>
        </div>
      )}

      {/* Official IMD / NDMA Sachet Warnings (when active) */}
      <OfficialWarningBanner warnings={warnings} />

      {/* Current Weather Hero Card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        aria-label="वर्तमान मौसम"
        className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#2D5A27] min-w-0">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="text-sm font-bold truncate">{activeLoc.label}</span>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#2D5A27]/40 text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="मौसम अपडेट करें"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 shrink-0', refreshing && 'animate-spin')} />
            <span>ताज़ा करें</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <div className="text-5xl sm:text-6xl font-bold text-gray-900 tabular-nums tracking-tight">
                {weather.isFallback ? '—' : `${weather.temp}°C`}
              </div>
              {!weather.isFallback && weather.feelsLike !== undefined && (
                <span className="text-xs sm:text-sm font-medium text-gray-600 tabular-nums">
                  महसूस तापमान: {weather.feelsLike}°C
                </span>
              )}
            </div>

            <p className="text-base font-semibold text-gray-800">
              {heroConditionText}
            </p>

            {/* Unboxed High / Low + Sunrise / Sunset Telemetry Row */}
            {!weather.isFallback && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-gray-600 tabular-nums pt-0.5">
                <span className="inline-flex items-center gap-1 text-amber-800">
                  <ArrowUp className="w-3.5 h-3.5 shrink-0" />
                  अधिकतम {weather.maxTemp}°C
                </span>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1 text-sky-800">
                  <ArrowDown className="w-3.5 h-3.5 shrink-0" />
                  न्यूनतम {weather.minTemp}°C
                </span>
                {sunriseText && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Sunrise className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      सूर्योदय {sunriseText}
                    </span>
                  </>
                )}
                {sunsetText && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Sunset className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      सूर्यास्त {sunsetText}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div
            className={cn(
              'w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border flex items-center justify-center shrink-0',
              heroSurface.container
            )}
          >
            <HeroIcon className={cn('w-11 h-11 sm:w-13 sm:h-13 stroke-[1.8]', heroSurface.icon)} />
          </div>
        </div>

        {/* 6-Cell Farmer Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-gray-100 tabular-nums">
          <div className="rounded-xl bg-[#F5F2ED]/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>नमी</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {weather.isFallback ? '—' : `${weather.humidity}%`}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F2ED]/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <Wind className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>हवा ({getWindDirectionHindi(weather.windDirection)})</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {weather.isFallback
                ? '—'
                : weather.windGusts && weather.windGusts > weather.windSpeed + 4
                ? `${weather.windSpeed} (झोंका ${weather.windGusts}) km/h`
                : `${weather.windSpeed} km/h`}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F2ED]/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <CloudRain className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>वर्षा (24 घंटे)</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {weather.isFallback ? '—' : `${next24hRainMm} mm`}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F2ED]/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <Thermometer className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>ओसांक (Dew Point)</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {weather.dewPoint !== undefined ? `${weather.dewPoint}°C` : '—'}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F2ED]/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <Eye className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>दृश्यता</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {formatVisibilityHindi(weather.visibility)}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F2ED]/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <Gauge className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>वाष्पीकरण (ET₀)</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-0.5">
              {weather.et0 !== undefined ? `${weather.et0} mm/दिन` : '—'}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Hourly Forecast (Preserving true WMO condition — no fog overwrite bug) */}
      {weather.hourly && weather.hourly.length > 0 && (
        <section aria-label="प्रति घंटा पूर्वानुमान" className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm sm:text-base font-bold text-[#4A3728]">
              प्रति घंटा पूर्वानुमान
            </h2>
            <span className="text-xs font-medium text-gray-500 tabular-nums">
              अगले 24 घंटे
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 hide-scrollbar snap-x scroll-smooth">
            {weather.hourly.map((hour, idx) => {
              const condText = getHindiCondition(hour.condition, hour.weatherCode);
              const IconComp = getConditionIcon(condText, hour.weatherCode, hour.isNight);
              const formattedTime = hour.timeIso ? formatWeatherTime(hour.timeIso, 'hi') : hour.time;
              const isRainAlert =
                hour.rainProb >= 40 || (hour.rainMm !== undefined && hour.rainMm >= 0.5);
              const isFog = hour.weatherCode === 45 || hour.weatherCode === 48;

              return (
                <div
                  key={hour.timeIso || idx}
                  className={cn(
                    'flex-[0_0_98px] snap-start rounded-2xl p-3 flex flex-col items-center justify-between gap-2 border bg-white tabular-nums',
                    isRainAlert
                      ? 'border-sky-300 bg-sky-50/40'
                      : isFog
                      ? 'border-slate-300 bg-slate-50/60'
                      : 'border-gray-200/80'
                  )}
                >
                  <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                    {idx === 0 ? 'अभी' : formattedTime}
                  </span>

                  <IconComp
                    className={cn(
                      'w-6 h-6 stroke-[1.9]',
                      isRainAlert
                        ? 'text-sky-600'
                        : isFog
                        ? 'text-slate-600'
                        : hour.isNight
                        ? 'text-indigo-600'
                        : 'text-amber-500'
                    )}
                  />

                  <span className="text-base font-bold text-gray-900">
                    {hour.temp}°C
                  </span>

                  <span className="text-[11px] text-gray-600 text-center truncate w-full">
                    {condText}
                  </span>

                  <div className="text-[10px] text-gray-500 text-center whitespace-nowrap">
                    {hour.rainProb >= 25
                      ? `वर्षा ${hour.rainProb}%`
                      : hour.windSpeed !== undefined
                      ? `हवा ${hour.windSpeed} km/h`
                      : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 7-Day Forecast (Strict DD MMMM YYYY + Full Condition Integrity) */}
      <section aria-label="अगले 7 दिन का पूर्वानुमान" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 className="text-sm sm:text-base font-bold text-[#4A3728]">
            अगले 7 दिन का पूर्वानुमान
          </h2>
          <span className="text-xs text-gray-500">
            दिन 1–3 अधिक सटीक · दिन 4–7 सामान्य रुझान
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {weather.forecast.map((item, idx) => {
            const parsedDate = item.dateStr
              ? parseLocalDate(item.dateStr)
              : new Date(Date.now() + (idx + 1) * 86400000);
            const dayLabel = formatWeekday(parsedDate, 'hi');
            const fullDateLabel = formatHindiDate(parsedDate);
            const conditionText = getHindiCondition(item.condition, item.weatherCode);
            const IconComp = getConditionIcon(conditionText, item.weatherCode, false);
            const daySurface = getHeroIconSurface(conditionText, item.weatherCode, false);
            const maxClean = (item.maxTemp || item.temp || '').replace(/[^0-9.-]/g, '');
            const minClean = (item.minTemp || '').replace(/[^0-9.-]/g, '');
            const riskNote = dailyRiskMap[item.dateStr || item.day];

            return (
              <article
                key={item.dateStr || idx}
                className="bg-white rounded-2xl p-4 border border-gray-200/80 flex items-center justify-between gap-3 tabular-nums"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0',
                      daySurface.container
                    )}
                  >
                    <IconComp
                      className={cn(
                        'w-5 h-5 stroke-[2]',
                        daySurface.icon
                      )}
                    />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-bold text-gray-900 whitespace-nowrap">
                        {dayLabel}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {fullDateLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-600">
                      <span>{conditionText}</span>
                      {riskNote && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="font-semibold text-amber-800">{riskNote}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-gray-500">
                      {(item.rainProb !== undefined && item.rainProb >= 20) || (item.rainMm !== undefined && item.rainMm > 0) ? (
                        <span className="text-sky-700 font-medium">
                          वर्षा: {item.rainProb ?? 0}%{item.rainMm ? ` (${item.rainMm} mm)` : ''}
                        </span>
                      ) : (
                        <span>शुष्क मौसम</span>
                      )}
                      {item.windGustsMax !== undefined && item.windGustsMax >= 25 && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>झोंका {item.windGustsMax} km/h</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <div className="text-lg sm:text-xl font-bold text-gray-900">
                    {maxClean ? `${maxClean}°C` : '—'}
                  </div>
                  {minClean && (
                    <div className="text-xs text-gray-500">
                      न्यूनतम {minClean}°C
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Weather-Responsive Farmer Advice Card */}
      {farmerAdvice && <FarmerWeatherAdviceCard advice={farmerAdvice} />}
    </div>
  );
};

export default Weather;
