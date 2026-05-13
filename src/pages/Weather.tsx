import React, { useEffect, useState } from 'react';
import { CloudSun, Wind, Droplets, Sun, CloudRain, Thermometer, Loader2, Cloud, CloudLightning, RefreshCw, Navigation } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchWeather, WeatherData } from '../services/weatherService';

const Weather: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('शामगढ़, मध्य प्रदेश');

  const loadWeather = async (lat: number = 24.1864, lon: number = 75.6328, force: boolean = false) => {
    setLoading(true);
    try {
      const data = await fetchWeather(lat, lon, force);
      setWeather(data);
    } catch (error) {
      console.error(error);
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
        () => loadWeather(24.1864, 75.6328, true)
      );
    } else {
      loadWeather(24.1864, 75.6328, true);
    }
  };

  const getDynamicAlert = (data: WeatherData) => {
    const temp = data.temp;
    const humidity = data.humidity;
    const isRainy = data.condition.includes('बारिश') || data.condition.includes('बौछारें');
    const isWindy = data.windSpeed > 20;

    if (isRainy) {
      return {
        title: "बारिश की संभावना",
        message: "खेत में जल निकासी की व्यवस्था करें। इस समय उर्वरक या कीटनाशक का छिड़काव न करें।",
        type: "rain",
        icon: CloudRain
      };
    }

    if (temp >= 40) {
      return {
        title: "अत्यधिक गर्मी (Heat Alert)",
        message: "दोपहर में सिंचाई न करें, इससे फसल जल सकती है। शाम या सुबह पानी देना बेहतर है।",
        type: "heat",
        icon: Sun
      };
    }

    if (isWindy) {
      return {
        title: "तेज़ हवा की चेतावनी",
        message: "तेज़ हवाओं में कीटनाशकों का छिड़काव न करें। ऊँची फसलों को सहारा देने की व्यवस्था करें।",
        type: "wind",
        icon: Wind
      };
    }

    if (humidity > 80) {
      return {
        title: "उच्च नमी (High Humidity)",
        message: "नमी अधिक होने से कीटों का खतरा बढ़ सकता है। फसल की नियमित जांच करते रहें।",
        type: "humidity",
        icon: Droplets
      };
    }

    if (temp <= 15) {
      return {
        title: "ठंड की चेतावनी",
        message: "पाला पड़ने की संभावना हो सकती है। फसल में हल्की सिंचाई करें और धुआं करें।",
        type: "cold",
        icon: Thermometer
      };
    }

    // Default Good Weather advice
    const dailyAdvices = [
      "मिट्टी की नमी की जांच करें और ज़रूरत के अनुसार सिंचाई करें।",
      "आज का मौसम उर्वरक देने के लिए अनुकूल है।",
      "फसलों की निगरानी करें और किसी भी रोग के लक्षण दिखने पर उपचार करें।",
      "खेतों की साफ़-सफ़ाई का ध्यान रखें ताकि कीट न पनपें।"
    ];
    const dayIndex = new Date().getDate() % dailyAdvices.length;

    return {
      title: "कृषि सलाह",
      message: dailyAdvices[dayIndex],
      type: "normal",
      icon: CloudSun
    };
  };

  const getIcon = (condition: string) => {
    if (condition.includes('बारिश') || condition.includes('बौछारें')) return CloudRain;
    if (condition.includes('बादल')) return CloudSun;
    if (condition.includes('गरज')) return CloudLightning;
    if (condition.includes('साफ')) return Sun;
    return Cloud;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-10 h-10 text-[#2D5A27] animate-spin" />
        <p className="text-sm text-gray-500 font-bold">मौसम की जानकारी लोड हो रही है...</p>
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
          <CloudSun className="w-32 h-32 text-[#2D5A27]" />
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
              const Icon = getIcon(hour.condition);
              const isBadWeather = hour.condition.includes('बारिश') || hour.condition.includes('गरज') || hour.condition.includes('ओले') || hour.condition.includes('बौछारें');
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
                  {hour.rainProb > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Droplets className="w-2.5 h-2.5 text-blue-400" />
                      <span className="text-[9px] font-bold text-blue-600">{hour.rainProb}%</span>
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
          const Icon = getIcon(item.condition);
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
                  <p className="text-xs text-gray-500">{item.condition}</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#2D5A27]">{item.temp}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Farming Alert */}
      {(() => {
        const alert = getDynamicAlert(weather);
        const AlertIcon = alert.icon;
        const colorClasses = {
          heat: "bg-orange-50 border-orange-200 text-orange-800 icon-bg-orange-500",
          rain: "bg-blue-50 border-blue-200 text-blue-800 icon-bg-blue-500",
          wind: "bg-gray-50 border-gray-200 text-gray-800 icon-bg-gray-500",
          humidity: "bg-cyan-50 border-cyan-200 text-cyan-800 icon-bg-cyan-500",
          cold: "bg-indigo-50 border-indigo-200 text-indigo-800 icon-bg-indigo-500",
          normal: "bg-green-50 border-green-200 text-green-800 icon-bg-green-500"
        }[alert.type as keyof typeof colorClasses];

        // Extract values from dynamic class string for cleaner Tailwind usage
        const [bgColor, borderColor, textColor, iconBg] = colorClasses.split(' ');

        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${bgColor} border-2 ${borderColor} rounded-2xl p-4 flex items-start gap-4 shadow-sm`}
          >
            <div className={`${iconBg.replace('icon-bg-', 'bg-')} p-2.5 rounded-xl shrink-0 shadow-sm`}>
              <AlertIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className={`font-bold ${textColor} text-base`}>{alert.title}</h4>
              <p className={`text-sm ${textColor} mt-1 leading-relaxed opacity-90`}>{alert.message}</p>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
};

export default Weather;
