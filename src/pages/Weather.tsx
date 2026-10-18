import React, { useEffect, useState } from 'react';
import { CloudSun, Wind, Droplets, Sun, CloudRain, Thermometer, Loader2, Cloud, CloudLightning, RefreshCw, Navigation, Moon, CloudMoon, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchWeather, WeatherData } from '../services/weatherService';
import { 
  getHindiCondition,
  formatWeekday, 
  formatFullDate,
  formatShortDate,
  formatWeatherTime, 
  parseLocalDate,
  getLocalizedCity 
} from '../utils/weatherLocalization';
import { cn } from '../lib/utils';

const language = 'hi';

const Weather: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('शामगढ़, मध्य प्रदेश');

  const loadWeather = async (lat: number = 24.1864, lon: number = 75.6328, force: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(lat, lon, force);
      setWeather(data);
    } catch (err: any) {
      console.error("Weather Page Error:", err);
      setError("मौसम की जानकारी प्राप्त करने में समस्या आई।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  const handleRefresh = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationName('आपकी वर्तमान लोकेशन');
          loadWeather(pos.coords.latitude, pos.coords.longitude, true);
        },
        () => {
          loadWeather(24.1864, 75.6328, true);
        }
      );
    } else {
      loadWeather(24.1864, 75.6328, true);
    }
  };

  const getEstRainProbability = (condition: string): number => {
    const cond = condition.toLowerCase();
    if (cond.includes('भारी ओले') || cond.includes('भारी बारिश') || cond.includes('तेज बारिश')) return 90;
    if (cond.includes('गरज') || cond.includes('बौछारें') || cond.includes('तेज')) return 80;
    if (cond.includes('बारिश') || cond.includes('बूंदाबांदी') || cond.includes('बौछार')) return 65;
    if (cond.includes('बादल छाए')) return 40;
    if (cond.includes('आंशिक')) return 20;
    if (cond.includes('कोहरा')) return 15;
    return 10;
  };

  const getSanitizedHourlyInfo = (hour: { time: string; temp: number; condition: string; rainProb: number; isNight?: boolean; weatherCode?: number }) => {
    let condition = hour.condition;
    const rainProb = hour.rainProb;
    const isNight = hour.isNight ?? false;
    
    // Only show rain percentage if rain probability is strictly greater than 40%
    const showProb = rainProb > 40;

    if (rainProb >= 40) {
      if (rainProb >= 75) {
        condition = 'गरज के साथ वर्षा';
      } else {
        condition = 'वर्षा';
      }
    } else if (rainProb >= 20) {
      condition = 'आंशिक बादल';
    } else {
      condition = isNight ? 'साफ रात' : 'धूप';
    }

    const isBad = rainProb >= 50 && (condition.includes('वर्षा') || condition.includes('गरज') || condition.includes('बारिश') || condition.includes('ओले') || condition.includes('बौछारें'));

    return {
      condition,
      showProb,
      rainProb,
      isBad,
      isNight
    };
  };

  const getSanitizedDailyInfo = (item: { day: string; temp: string; condition: string; rainProb?: number; weatherCode?: number; dateStr?: string }) => {
    let condition = item.condition;
    const rainProb = item.rainProb ?? getEstRainProbability(item.condition);

    const showProb = rainProb > 30;

    if (rainProb <= 30) {
      if (condition.includes('बारिश') || condition.includes('बूंदाबांदी') || condition.includes('बौछार') || condition.includes('गरज') || condition.includes('ओले')) {
        if (rainProb > 15) {
          condition = 'आंशिक बादल';
        } else {
          condition = 'धूप';
        }
      }
    }

    return {
      condition,
      showProb,
      rainProb
    };
  };

  const getDynamicAlert = (data: WeatherData) => {
    const temp = data.temp;
    const humidity = data.humidity;
    
    let maxRainProb = 0;
    if (data.hourly && data.hourly.length > 0) {
      maxRainProb = Math.max(...data.hourly.slice(0, 24).map(h => h.rainProb));
    } else if (data.forecast && data.forecast.length > 0) {
      maxRainProb = Math.max(...data.forecast.slice(0, 3).map(f => f.rainProb ?? getEstRainProbability(f.condition)));
    }

    const isWindy = data.windSpeed > 20;

    if (maxRainProb >= 50) {
      return {
        title: "वर्षा की चेतावनी (हाई अलर्ट)",
        message: `अगले 24 घंटे में वर्षा की संभावना अधिक (${maxRainProb}%) है। कीटनाशक छिड़काव और उर्वरक प्रयोग स्थगित रखें। कटी हुई फसलों को सुरक्षित स्थान पर रखें और सिंचाई तुरंत रोकें।`,
        type: "rain",
        icon: CloudRain
      };
    }

    if (maxRainProb >= 20 && maxRainProb < 50) {
      return {
        title: "मौसम सलाह (सामान्य बदलाव)",
        message: `अगले 24 घंटे में मौसम में आंशिक बदलाव या हल्की वर्षा की सामान्य संभावना (${maxRainProb}%) है। सिंचाई केवल आवश्यकतानुसार ही करें।`,
        type: "normal",
        icon: CloudSun
      };
    }

    if (temp >= 40) {
      return {
        title: "अत्यधिक गर्मी और धूप की चेतावनी",
        message: "आज वर्षा की संभावना बहुत कम है। तापमान अधिक होने की वजह से दोपहर में सिंचाई न करें, इससे फसल जल सकती है।",
        type: "heat",
        icon: Sun
      };
    }

    if (isWindy) {
      return {
        title: "तेज़ हवा की चेतावनी",
        message: "तेज़ हवाओं में कीटनाशकों का छिड़काव न करें, क्योंकि दवा हवा के साथ बिखर जाएगी।",
        type: "wind",
        icon: Wind
      };
    }

    if (humidity > 80) {
      return {
        title: "उच्च नमी और आर्दता चेतावनी",
        message: "हवा में नमी अधिक होने से कीट एवं फफूंद जनित रोगों का खतरा बढ़ सकता है।",
        type: "humidity",
        icon: Droplets
      };
    }

    if (temp <= 15) {
      return {
        title: "शीतलहर और ठंड की चेतावनी",
        message: "तापमान कम होने से पाला पड़ने की संभावना हो सकती है। फसल में हल्की सिंचाई करें।",
        type: "cold",
        icon: Thermometer
      };
    }

    return {
      title: "स्मार्ट निर्णय सलाह (मौसम अनुकूल)",
      message: "आज वर्षा की संभावना बहुत कम है। मौसम पूर्णतः खेती के अनुकूल है। फसलों में आवश्यकतानुसार सिंचाई की जा सकती है।",
      type: "normal",
      icon: CloudSun
    };
  };

  const getIcon = (condition: string, isNight?: boolean) => {
    if (condition.includes('गरज') || condition.includes('thunder')) return CloudLightning;
    if (condition.includes('बारिश') || condition.includes('बौछारें') || condition.includes('बूंदाबांदी') || condition.includes('वर्षा') || condition.includes('ओले') || condition.includes('rain')) return CloudRain;
    
    if (isNight) {
      if (condition.includes('बादल') || condition.includes('आंशिक') || condition.includes('cloud')) return CloudMoon;
      if (condition.includes('साफ') || condition.includes('धूप') || condition.includes('मुख्यतः साफ') || condition.includes('रात') || condition.includes('clear')) return Moon;
      return Cloud;
    } else {
      if (condition.includes('बादल') || condition.includes('आंशिक') || condition.includes('cloud')) return CloudSun;
      if (condition.includes('साफ') || condition.includes('धूप') || condition.includes('मुख्यतः साफ') || condition.includes('clear') || condition.includes('sunny')) return Sun;
      return Cloud;
    }
  };

  const getConditionLabel = (condition: string, weatherCode?: number): string => {
    return getHindiCondition(condition, weatherCode);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
        <p className="text-sm text-gray-500 font-bold">मौसम की जानकारी लोड हो रही है...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 border border-red-200 rounded-2xl">
        <p className="text-red-800 font-bold">{error}</p>
        <button onClick={() => loadWeather()} className="mt-2 text-xs text-red-600 underline font-bold">
          दोबारा प्रयास करें
        </button>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728]">
          मौसम की जानकारी
        </h2>
        <p className="text-sm text-gray-500">
          खेती के लिए सटीक मौसम अपडेट
        </p>
      </div>

      {/* Main Card */}
      {(() => {
        const isNowNight = weather.hourly && weather.hourly.length > 0 ? weather.hourly[0].isNight : (new Date().getHours() < 6 || new Date().getHours() >= 19);
        const MainIcon = getIcon(weather.condition, isNowNight);

        const cond = weather.condition.toLowerCase();
        const isRain = cond.includes('बारिश') || cond.includes('बूंदाबांदी') || cond.includes('बौछार') || cond.includes('गरज') || cond.includes('ओले');
        const isSunny = !isNowNight && (cond.includes('साफ') || cond.includes('धूप') || cond.includes('sunny'));

        // Ambient atmospheric glow behind the weather pod
        const ambientGlowColor = isRain
          ? "from-sky-400/20 via-blue-400/10 to-transparent"
          : isSunny
          ? "from-amber-400/25 via-orange-400/15 to-transparent"
          : isNowNight
          ? "from-indigo-500/20 via-purple-500/10 to-transparent"
          : "from-emerald-400/20 via-teal-400/10 to-transparent";

        // Modern Hero Weather Pod
        const heroPodStyle = isRain
          ? "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50/80 text-sky-600 border-sky-200/90 shadow-sky-500/10"
          : isSunny
          ? "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 text-amber-500 border-amber-200/90 shadow-amber-500/10"
          : isNowNight
          ? "bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 text-indigo-500 border-indigo-200/90 shadow-indigo-500/10"
          : "bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 text-[#2D5A27] border-emerald-200/90 shadow-emerald-500/10";

        const todayDate = weather.dateStr ? parseLocalDate(weather.dateStr) : new Date();
        const todayDayLabel = formatWeekday(todayDate, language);
        const todayFullDate = formatFullDate(todayDate, language);

        return (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative bg-white rounded-3xl p-5 sm:p-7 shadow-sm hover:shadow-md border border-gray-200/90 transition-all duration-300 overflow-hidden"
          >
            {/* Ambient Atmospheric Glow */}
            <div 
              className={cn(
                "absolute -top-16 -right-16 w-64 h-64 rounded-full bg-radial blur-3xl pointer-events-none transition-all duration-700",
                ambientGlowColor
              )} 
            />

            <div className="relative z-10 flex flex-col justify-between">
              {/* Top Bar: Location + Today Date Badge + Refresh Action */}
              <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[#2D5A27] bg-[#2D5A27]/5 px-3 py-1 rounded-full border border-[#2D5A27]/10">
                    <Navigation className="w-3.5 h-3.5 text-[#2D5A27] shrink-0" />
                    <span className="text-xs sm:text-sm font-bold tracking-tight">
                      {getLocalizedCity(locationName, language)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-black text-white bg-[#2D5A27] px-2.5 py-0.5 rounded-md shadow-2xs">
                      आज
                    </span>
                    <span className="font-bold text-gray-800">
                      {todayDayLabel}
                    </span>
                    {todayFullDate && (
                      <span className="font-semibold text-gray-500 font-mono">
                        {todayFullDate}
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleRefresh}
                  title="ताज़ा मौसम लोड करें"
                  className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A27] bg-[#2D5A27]/5 hover:bg-[#2D5A27]/10 px-3 py-1.5 rounded-xl border border-[#2D5A27]/15 transition-all active:scale-95 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">ताज़ा करें</span>
                </button>
              </div>

              {/* Hero Weather Section: Left = Temperature & Conditions | Right = Eye-catching Weather Pod */}
              <div className="flex items-center justify-between gap-4 py-1">
                {/* Left Side */}
                <div className="min-w-0">
                  <div className="flex items-baseline">
                    <span className="text-6xl sm:text-7xl font-black text-gray-900 tracking-tight font-mono leading-none">
                      {weather.temp}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#2D5A27] font-mono ml-1">
                      °C
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <p className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                      {getConditionLabel(weather.condition, weather.weatherCode)}
                    </p>
                  </div>

                  {/* High / Low Pills */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 font-mono shadow-2xs">
                      <ArrowUp className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>हाई {weather.maxTemp}°</span>
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 font-mono shadow-2xs">
                      <ArrowDown className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>लो {weather.minTemp}°</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Hero Weather Pod */}
                <div className="shrink-0 pl-2">
                  <div className={cn(
                    "w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center border shadow-sm transition-transform duration-300 hover:scale-105",
                    heroPodStyle
                  )}>
                    <MainIcon className="w-12 h-12 sm:w-14 sm:h-14 stroke-[1.9]" />
                  </div>
                </div>
              </div>

              {/* Bottom Micro-Cards Grid */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-5 mt-5 border-t border-gray-100">
                {/* Humidity */}
                <div className="bg-sky-50/50 hover:bg-sky-50/80 rounded-2xl p-3 border border-sky-100/80 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      नमी
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600">
                      <Droplets className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-black text-gray-900 font-mono">
                    {weather.humidity}%
                  </p>
                </div>

                {/* Wind */}
                <div className="bg-emerald-50/40 hover:bg-emerald-50/70 rounded-2xl p-3 border border-emerald-100/80 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      हवा
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-[#2D5A27]">
                      <Wind className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-black text-gray-900 font-mono truncate">
                    {weather.windSpeed} <span className="text-xs font-semibold text-gray-500">km/h</span>
                  </p>
                </div>

                {/* Rain */}
                <div className="bg-blue-50/40 hover:bg-blue-50/70 rounded-2xl p-3 border border-blue-100/80 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      बारिश
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <CloudRain className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-base sm:text-lg font-black text-gray-900 font-mono">
                    {weather.rain} <span className="text-xs font-semibold text-gray-500">mm</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Hourly Forecast */}
      {weather.hourly && weather.hourly.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2D5A27]" />
              <h3 className="font-black text-gray-900 text-sm tracking-tight">
                प्रति घंटा पूर्वानुमान
              </h3>
            </div>
            <span className="text-[10px] font-bold text-[#2D5A27] bg-[#2D5A27]/10 px-2 py-0.5 rounded-md font-mono">
              अगले 24 घंटे
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 -mx-4 px-4 hide-scrollbar snap-x scroll-smooth">
            {weather.hourly.map((hour, idx) => {
              const sanitized = getSanitizedHourlyInfo(hour);
              const Icon = getIcon(sanitized.condition, sanitized.isNight);
              const isBadWeather = sanitized.isBad;
              const formattedTime = hour.timeIso ? formatWeatherTime(hour.timeIso, language) : hour.time;
              const isCurrentHour = idx === 0;

              // Weather-aware icon pod styles
              const cond = sanitized.condition.toLowerCase();
              const isRain = cond.includes('बारिश') || cond.includes('बूंदाबांदी') || cond.includes('बौछार') || cond.includes('गरज') || cond.includes('ओले') || sanitized.rainProb >= 40;
              const isSunny = !sanitized.isNight && (cond.includes('साफ') || cond.includes('धूप') || cond.includes('sunny'));
              const isNight = sanitized.isNight;

              const iconPodStyle = isRain
                ? "bg-gradient-to-br from-sky-50 to-blue-100/70 text-sky-600 border-sky-200/80 shadow-sky-500/5"
                : isSunny
                ? "bg-gradient-to-br from-amber-50 to-orange-100/70 text-amber-500 border-amber-200/80 shadow-amber-500/5"
                : isNight
                ? "bg-gradient-to-br from-indigo-50/80 to-slate-100 text-indigo-500 border-indigo-200/70 shadow-indigo-500/5"
                : "bg-gradient-to-br from-emerald-50 to-teal-100/70 text-[#2D5A27] border-emerald-200/80 shadow-emerald-500/5";

              const cardStyle = isBadWeather
                ? "bg-gradient-to-b from-sky-50/80 via-white to-blue-50/40 border-sky-300 shadow-sky-500/5"
                : "bg-white border-gray-200/80 hover:border-[#2D5A27]/40 shadow-2xs hover:shadow-sm";

              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.25) }}
                  className={cn(
                    "flex-[0_0_92px] sm:flex-[0_0_98px] snap-start min-w-0 h-[152px] rounded-2xl p-2.5 flex flex-col items-center justify-between border transition-all duration-200 select-none group relative overflow-hidden",
                    cardStyle
                  )}
                >
                  {/* Top: Time Label (Exact same styling for 'अभी' as other hours) */}
                  <div className="flex flex-col items-center justify-center w-full min-h-[22px]">
                    <span className="text-[11px] font-bold text-gray-500 font-mono tracking-tight whitespace-nowrap">
                      {isCurrentHour ? 'अभी' : formattedTime}
                    </span>
                  </div>

                  {/* Center: Modern Squircle Pod + Bold Temperature */}
                  <div className="flex flex-col items-center gap-1.5 my-auto">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105 shadow-2xs",
                      iconPodStyle
                    )}>
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    <div className="flex items-baseline justify-center">
                      <span className="text-base sm:text-lg font-black text-gray-900 font-mono tracking-tight">
                        {hour.temp}
                      </span>
                      <span className="text-xs font-bold text-[#2D5A27] ml-0.5">°C</span>
                    </div>
                  </div>

                  {/* Bottom: Rain Probability, Caution Pill, or Condition */}
                  <div className="w-full flex items-center justify-center min-h-[20px]">
                    {sanitized.showProb ? (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-200/80 shadow-2xs font-mono">
                        <Droplets className="w-2.5 h-2.5 text-sky-500 shrink-0" />
                        <span>{sanitized.rainProb}%</span>
                      </div>
                    ) : isBadWeather ? (
                      <span className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shadow-2xs">
                        सावधान
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-400 truncate max-w-full px-1">
                        {sanitized.condition}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7-Day Forecast */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2D5A27]" />
            <h3 className="font-black text-gray-900 text-sm tracking-tight">
              अगले 7 दिन का पूर्वानुमान
            </h3>
          </div>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
            दैनिक अपडेट
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {weather.forecast.map((item, idx) => {
          const sanitized = getSanitizedDailyInfo(item);
          const Icon = getIcon(sanitized.condition);
          
          // Dynamically calculate actual Hindi weekday and full date strictly from date
          const parsedDate = item.dateStr 
            ? parseLocalDate(item.dateStr) 
            : new Date(Date.now() + (idx + 1) * 86400000);
          const dayLabel = formatWeekday(parsedDate, language);
          const fullFormattedDate = formatFullDate(parsedDate, language);
          const conditionLabel = getConditionLabel(sanitized.condition, item.weatherCode);

          // Weather-aware icon pod styles
          const cond = sanitized.condition.toLowerCase();
          const isRain = cond.includes('बारिश') || cond.includes('बूंदाबांदी') || cond.includes('बौछार') || cond.includes('गरज') || cond.includes('ओले') || sanitized.rainProb >= 40;
          const isSunny = cond.includes('साफ') || cond.includes('धूप') || cond.includes('sunny');

          const iconPodStyle = isRain
            ? "bg-gradient-to-br from-sky-50 to-blue-50/80 text-sky-600 border-sky-200/80 shadow-sky-500/5"
            : isSunny
            ? "bg-gradient-to-br from-amber-50 to-orange-50/80 text-amber-500 border-amber-200/80 shadow-amber-500/5"
            : "bg-gradient-to-br from-emerald-50 to-teal-50/80 text-[#2D5A27] border-emerald-200/80 shadow-emerald-500/5";

          // Extract pure numeric temperatures for clean display
          const maxTempClean = (item.maxTemp || item.temp || '').replace(/[^0-9.-]/g, '');
          const minTempClean = (item.minTemp || '').replace(/[^0-9.-]/g, '');

          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.3) }}
              className="group relative bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-200/80 hover:border-[#2D5A27]/40 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 select-none overflow-hidden"
            >
              {/* Left Side: Modern Dual-tone Squircle Icon + Day/Date/Condition Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105",
                  iconPodStyle
                )}>
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="font-black text-gray-900 text-sm sm:text-base tracking-tight whitespace-nowrap group-hover:text-[#2D5A27] transition-colors">
                      {dayLabel}
                    </p>
                    {fullFormattedDate && (
                      <span className="text-xs font-bold text-gray-500 font-mono tracking-tight whitespace-nowrap">
                        {fullFormattedDate}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 font-semibold mt-0.5 truncate">
                    {conditionLabel}
                  </p>

                  {/* Rain Probability / Weather Indicator */}
                  {sanitized.showProb ? (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/70 w-fit shadow-2xs">
                      <Droplets className="w-3 h-3 text-sky-500 shrink-0" />
                      <span>वर्षा संभावना: <strong className="font-black font-mono">{sanitized.rainProb}%</strong></span>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-gray-400">
                      <Droplets className="w-2.5 h-2.5 text-gray-300 shrink-0" />
                      <span>वर्षा: {sanitized.rainProb}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Temperature High/Low Display */}
              <div className="text-right shrink-0 pl-3">
                <div className="flex items-baseline justify-end gap-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-[#1B4318] tracking-tight font-mono">
                    {maxTempClean || '30'}
                  </span>
                  <span className="text-xs font-bold text-[#2D5A27]">°C</span>
                </div>

                {minTempClean ? (
                  <div className="text-[10px] font-mono font-bold text-gray-400 mt-0.5 flex items-center justify-end gap-1">
                    <span className="text-slate-500 bg-slate-50 px-1 py-0.2 rounded border border-slate-200/80">
                      लो {minTempClean}°
                    </span>
                    <span className="text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/80">
                      हाई {maxTempClean}°
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-gray-400 block mt-0.5">
                    अधिकतम
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
        </div>
      </div>

      {/* Farming Alert & Smart Farmer Advisory Box */}
      {(() => {
        const alert = getDynamicAlert(weather);
        const AlertIcon = alert.icon;
        const colorClasses = {
          heat: "bg-amber-50 border-amber-200 text-amber-800",
          rain: "bg-blue-50 border-blue-200 text-blue-800",
          wind: "bg-gray-50 border-gray-200 text-gray-800",
          humidity: "bg-cyan-50 border-cyan-200 text-cyan-800",
          cold: "bg-indigo-50 border-indigo-200 text-indigo-800",
          normal: "bg-green-50 border-green-200 text-green-800"
        }[alert.type as keyof typeof colorClasses] || "bg-green-50 border-green-200 text-green-800";

        const iconBg = {
          heat: "bg-amber-500",
          rain: "bg-blue-500",
          wind: "bg-gray-500",
          humidity: "bg-cyan-500",
          cold: "bg-indigo-500",
          normal: "bg-green-600"
        }[alert.type as keyof typeof iconBg] || "bg-green-600";

        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${colorClasses} border-2 rounded-2xl p-4 flex items-start gap-4 shadow-sm`}
          >
            <div className={`${iconBg} p-2.5 rounded-xl shrink-0 shadow-sm`}>
              <AlertIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-base">{alert.title}</h4>
              <p className="text-sm mt-1 leading-relaxed opacity-95">{alert.message}</p>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
};

export default Weather;
