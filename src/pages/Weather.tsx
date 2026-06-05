import React, { useEffect, useState } from 'react';
import { CloudSun, Wind, Droplets, Sun, CloudRain, Thermometer, Loader2, Cloud, CloudLightning, RefreshCw, Navigation, Moon, CloudMoon } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchWeather, WeatherData } from '../services/weatherService';

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

  const getSanitizedHourlyInfo = (hour: { time: string; temp: number; condition: string; rainProb: number; isNight?: boolean }) => {
    let condition = hour.condition;
    const rainProb = hour.rainProb;
    const isNight = hour.isNight ?? false;
    
    // Rule 1: Only show rain percentage if rain probability is strictly greater than 40%
    const showProb = rainProb > 40;

    // Rule 2: Smart Consistency Logic based on Rain Probability:
    // - >= 40%: Show Rain/CloudRain icon (condition = 'वर्षा') or Thunderstorm icon (condition = 'गरज के साथ वर्षा')
    // - 20% to 39%: Partly Cloudy / Mixed Weather Icon (condition = 'आंशिक बादल')
    // - < 20%: Sun / Clear Weather Icon (condition = 'धूप' or 'साफ रात')
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

    // Determine if weather is bad/critical for safety badge display
    const isBad = rainProb >= 50 && (condition.includes('वर्षा') || condition.includes('गरज') || condition.includes('बारिश') || condition.includes('ओले') || condition.includes('बौछारें'));

    return {
      condition,
      showProb,
      rainProb,
      isBad,
      isNight
    };
  };

  const getSanitizedDailyInfo = (item: { day: string; temp: string; condition: string; rainProb?: number }) => {
    let condition = item.condition;
    const rainProb = item.rainProb ?? getEstRainProbability(item.condition);

    // Rule 1: Only show rain percentage if rain probability is strictly greater than 30%
    const showProb = rainProb > 30;

    // Rule 2: If rain probability is 30% or less:
    // - Hide rain percentage (handled by showProb).
    // - Clean up rainy conditions/icons to a normal weather condition (e.g. 'धूप' or 'आंशिक बादल').
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

    // High rain alert: If probability >= 50%
    if (maxRainProb >= 50) {
      return {
        title: "वर्षा की चेतावनी (हाई अलर्ट)",
        message: `अगले 24 घंटे में वर्षा की संभावना अधिक (${maxRainProb}%) है। कीटनाशक छिड़काव और उर्वरक प्रयोग स्थगित रखें। कटी हुई फसलों को सुरक्षित स्थान पर रखें और सिंचाई तुरंत रोकें।`,
        type: "rain",
        icon: CloudRain
      };
    }

    // Mid rain probability alerts: 20% - 49%
    if (maxRainProb >= 20 && maxRainProb < 50) {
      return {
        title: "मौसम सलाह (सामान्य बदलाव)",
        message: `अगले 24 घंटे में मौसम में आंशिक बदलाव या हल्की वर्षा की सामान्य संभावना (${maxRainProb}%) है। सिंचाई केवल आवश्यकतानुसार ही करें। कीटनाशक छिड़काव करते समय ध्यान रखें कि हवा शांत हो।`,
        type: "normal",
        icon: CloudSun
      };
    }

    // Low rain/No rain advisories (rain probability < 20%)
    if (temp >= 40) {
      return {
        title: "अत्यधिक गर्मी और धूप की चेतावनी",
        message: "आज वर्षा की संभावना बहुत कम है। तापमान अधिक होने की वजह से दोपहर में सिंचाई न करें, इससे फसल जल सकती है। शाम या सुबह पानी देना बेहतर है। आज सिंचाई की जा सकती है।",
        type: "heat",
        icon: Sun
      };
    }

    if (isWindy) {
      return {
        title: "तेज़ हवा की चेतावनी",
        message: "तेज़ हवाओं में कीटनाशकों का छिड़काव न करें, क्योंकि दवा हवा के साथ बिखर जाएगी। सिंचाई सावधानी से करें। आज वर्षा की संभावना बहुत कम है।",
        type: "wind",
        icon: Wind
      };
    }

    if (humidity > 80) {
      return {
        title: "उच्च नमी और आर्दता चेतावनी",
        message: "हवा में नमी अधिक होने से कीट एवं फफूंद जनित रोगों का खतरा बढ़ सकता है। आज वर्षा की संभावना बहुत कम है, अतः आप सिंचाई और आवश्यकतानुसार छिड़काव का प्रबंधन कर सकते हैं।",
        type: "humidity",
        icon: Droplets
      };
    }

    if (temp <= 15) {
      return {
        title: "शीतलहर और ठंड की चेतावनी",
        message: "तापमान कम होने से पाला पड़ने की संभावना हो सकती है। फसल में हल्की सिंचाई करें। आज मौसम साफ रहेगा और वर्षा की संभावना नहीं है।",
        type: "cold",
        icon: Thermometer
      };
    }

    return {
      title: "स्मार्ट निर्णय सलाह (मौसम अनुकूल)",
      message: "आज वर्षा की संभावना बहुत कम है। मौसम पूर्णतः खेती के अनुकूल है। फसलों में आवश्यकतानुसार सिंचाई की जा सकती है, और खेतों में कीटनाशक छिड़काव व खाद डालने के लिए आज का दिन सर्वोत्तम है।",
      type: "normal",
      icon: CloudSun
    };
  };

  const getIcon = (condition: string, isNight?: boolean) => {
    if (condition.includes('गरज')) return CloudLightning;
    if (condition.includes('बारिश') || condition.includes('बौछारें') || condition.includes('बूंदाबांदी') || condition.includes('वर्षा') || condition.includes('ओले')) return CloudRain;
    
    if (isNight) {
      if (condition.includes('बादल') || condition.includes('आंशिक')) return CloudMoon;
      if (condition.includes('साफ') || condition.includes('धूप') || condition.includes('मुख्यतः साफ') || condition.includes('रात')) return Moon;
      return Cloud;
    } else {
      if (condition.includes('बादल') || condition.includes('आंशिक')) return CloudSun;
      if (condition.includes('साफ') || condition.includes('धूप') || condition.includes('मुख्यतः साफ')) return Sun;
      return Cloud;
    }
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
        <button onClick={() => loadWeather()} className="mt-2 text-xs text-red-600 underline font-bold">दोबारा प्रयास करें</button>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#4A3728]">मौसम की जानकारी</h2>
        <p className="text-sm text-gray-500">खेती के लिए सटीक मौसम अपडेट</p>
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          {(() => {
            const isNowNight = weather.hourly && weather.hourly.length > 0 ? weather.hourly[0].isNight : (new Date().getHours() < 6 || new Date().getHours() >= 19);
            const MainIcon = getIcon(weather.condition, isNowNight);
            return <MainIcon className="w-32 h-32 text-[#2D5A27]" />;
          })()}
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-[#2D5A27]">
              <Navigation className="w-3.5 h-3.5" />
              <span className="text-sm font-bold">{locationName}</span>
            </div>
            <button 
              onClick={handleRefresh}
              className="p-2 text-[#2D5A27] bg-[#2D5A27]/5 rounded-xl active:rotate-180 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-end gap-4 mb-6">
            <h1 className="text-6xl font-bold text-[#4A3728]">{weather.temp}°</h1>
            <div className="pb-2">
              <p className="text-lg font-bold text-[#2D5A27]">{weather.condition}</p>
              <p className="text-sm text-gray-400">अधिकतम: {weather.maxTemp}° | न्यूनतम: {weather.minTemp}°</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
            <div className="text-center">
              <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 uppercase">नमी (Humidity)</p>
              <p className="font-bold text-gray-700">{weather.humidity}%</p>
            </div>
            <div className="text-center">
              <Wind className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 uppercase">हवा (Wind)</p>
              <p className="font-bold text-gray-700">{weather.windSpeed} km/h</p>
            </div>
            <div className="text-center">
              <CloudRain className="w-6 h-6 text-blue-300 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400 uppercase">बारिश (Rain)</p>
              <p className="font-bold text-gray-700">{weather.rain} mm</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hourly Forecast */}
      {weather.hourly && weather.hourly.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-[#4A3728] px-1 flex items-center justify-between">
            प्रति घंटा पूर्वानुमान (Hourly Forecast)
            <span className="text-[10px] text-[#2D5A27] font-bold bg-[#2D5A27]/10 px-2 py-0.5 rounded-full">अगले 24 घंटे</span>
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 hide-scrollbar snap-x">
            {weather.hourly.map((hour, idx) => {
              const sanitized = getSanitizedHourlyInfo(hour);
              const Icon = getIcon(sanitized.condition, sanitized.isNight);
              const isBadWeather = sanitized.isBad;
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(idx * 0.03, 1) }}
                  className={`flex-[0_0_85px] snap-start min-w-0 rounded-2xl p-3 flex flex-col items-center gap-1 border transition-all ${
                    isBadWeather 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white border-gray-100'
                  }`}
                >
                  <p className="text-[10px] font-bold text-gray-500">{hour.time}</p>
                  <Icon className={`w-7 h-7 my-1 ${isBadWeather ? 'text-blue-500' : 'text-[#2D5A27]'}`} />
                  <p className="font-black text-gray-800">{hour.temp}°</p>
                  {sanitized.showProb && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Droplets className="w-2.5 h-2.5 text-blue-400" />
                      <span className="text-[9px] font-bold text-blue-600">{sanitized.rainProb}%</span>
                    </div>
                  )}
                  {isBadWeather && (
                    <span className="text-[8px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full mt-1">सावधान</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Forecast */}
      <div className="space-y-3">
        <h3 className="font-bold text-[#4A3728] px-1">अगले 7 दिन का पूर्वानुमान</h3>
        {weather.forecast.map((item, idx) => {
          const sanitized = getSanitizedDailyInfo(item);
          const Icon = getIcon(sanitized.condition);
          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="bg-[#F5F2ED] p-2 rounded-xl">
                  <Icon className="w-6 h-6 text-[#2D5A27]" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{item.day}</p>
                  <p className="text-xs text-gray-500">{sanitized.condition}</p>
                  {sanitized.showProb && (
                    <p className="text-[11px] font-black text-sky-700 mt-1.5 flex items-center gap-1 bg-sky-50/80 px-2.5 py-1 rounded-full border border-sky-100/80 w-fit">
                      <Droplets className="w-3 h-3 text-sky-500 shrink-0" />
                      वर्षा संभावना: {sanitized.rainProb}%
                    </p>
                  )}
                </div>
              </div>
              <p className="text-lg font-black text-[#2D5A27]">{item.temp}</p>
            </motion.div>
          );
        })}
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
