import type { DailyWeatherPoint, OfficialWeatherWarning, WeatherData } from '../services/weatherService';

function parseTempNum(raw?: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  if (!cleaned) return undefined;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function getNext24hRainMm(data: WeatherData): number {
  const next24h = (data.hourly && data.hourly.length > 0 ? data.hourly : data.hourlyOutlook || []).slice(0, 24);
  if (next24h.length === 0) return data.rain || 0;
  return Number(next24h.reduce((sum, h) => sum + (h.rainMm ?? 0), 0).toFixed(1));
}

export function getDailyRiskMap(data: WeatherData): Record<string, string> {
  const dailyRiskMap: Record<string, string> = {};
  data.forecast.forEach((d: DailyWeatherPoint) => {
    const key = d.dateStr || d.day;
    const minT = parseTempNum(d.minTemp);
    const maxT = parseTempNum(d.maxTemp || d.temp);
    const rMm = d.rainMm ?? 0;
    const gMax = d.windGustsMax ?? d.windSpeedMax ?? 0;
    const wCode = d.weatherCode;

    if (wCode === 96 || wCode === 99) {
      dailyRiskMap[key] = 'ओले सतर्कता';
    } else if (rMm >= 64.5) {
      dailyRiskMap[key] = 'भारी बारिश';
    } else if (wCode === 95) {
      dailyRiskMap[key] = 'गरज-चमक';
    } else if (rMm >= 25) {
      dailyRiskMap[key] = 'तेज बारिश';
    } else if (gMax >= 38) {
      dailyRiskMap[key] = 'तेज हवा';
    } else if (minT !== undefined && minT <= 5.5) {
      dailyRiskMap[key] = 'पाला सतर्कता';
    } else if (wCode === 45 || wCode === 48) {
      dailyRiskMap[key] = 'कोहरा';
    } else if (maxT !== undefined && maxT >= 41) {
      dailyRiskMap[key] = 'लू सतर्कता';
    }
  });
  return dailyRiskMap;
}

export type WeatherAdviceTone = 'rain' | 'cold' | 'fog' | 'heat' | 'wind' | 'alert' | 'favorable';

export interface FarmerWeatherAdvice {
  tone: WeatherAdviceTone;
  statusLabel: string;
  title: string;
  summary: string;
  tips: string[];
  disclaimer: string;
}

export function getFarmerWeatherAdvice(
  data: WeatherData,
  officialWarnings: OfficialWeatherWarning[] = []
): FarmerWeatherAdvice {
  const next24h = (data.hourly && data.hourly.length > 0 ? data.hourly : data.hourlyOutlook || []).slice(0, 24);
  const rain24h = getNext24hRainMm(data);
  const maxRainProb24h = Math.max(
    0,
    ...next24h.map((h) => h.rainProb ?? 0),
    data.forecast[0]?.rainProb ?? 0
  );
  const maxGust24h = Math.max(
    data.windGusts ?? data.windSpeed ?? 0,
    ...next24h.map((h) => h.windGusts ?? h.windSpeed ?? 0)
  );
  const minNightSoon = Math.min(
    data.minTemp,
    ...[data.forecast[0], data.forecast[1]]
      .map((f) => parseTempNum(f?.minTemp))
      .filter((n): n is number => n !== undefined)
  );
  const maxDaySoon = Math.max(
    data.maxTemp,
    ...[data.forecast[0], data.forecast[1]]
      .map((f) => parseTempNum(f?.maxTemp || f?.temp))
      .filter((n): n is number => n !== undefined)
  );
  const hasFog =
    data.weatherCode === 45 ||
    data.weatherCode === 48 ||
    (data.visibility !== undefined && data.visibility < 1500) ||
    next24h.some((h) => h.weatherCode === 45 || h.weatherCode === 48 || (h.visibility !== undefined && h.visibility < 1200));

  const hasHeavyDew =
    next24h.filter((h) => (h.humidity ?? data.humidity) >= 85 && h.dewPoint !== undefined && h.temp - h.dewPoint <= 2.2)
      .length >= 2;

  const hasSevereOfficialAlert = officialWarnings.some(
    (w) => w.severity === 'Extreme' || w.severity === 'Severe'
  );

  const disclaimer =
    'कीटनाशक छिड़काव या सिंचाई से पहले अपनी फसल की अवस्था और दवा के पैकेट पर दिए निर्देश अवश्य देखें।';

  if (hasSevereOfficialAlert) {
    const topAlert = officialWarnings.find((w) => w.severity === 'Extreme' || w.severity === 'Severe')!;
    return {
      tone: 'alert',
      statusLabel: 'उच्च सतर्कता',
      title: `विशेष मौसम सलाह: ${topAlert.event}`,
      summary:
        'आधिकारिक मौसम चेतावनी सक्रिय होने के कारण आज और कल खेत में खुले कार्य, छिड़काव व सिंचाई स्थगित रखें।',
      tips: [
        'कटी हुई फसल व भूसे को तुरंत तिरपाल से ढककर सुरक्षित स्थान पर रखें।',
        'आकाशीय बिजली या तेज आंधी के समय खुले खेत या पेड़ के नीचे न रुकें।',
        'खेत से अतिरिक्त पानी निकलने की नालियां साफ रखें।',
      ],
      disclaimer,
    };
  }

  if (rain24h >= 8 || maxRainProb24h >= 55 || [65, 82, 95, 96, 99].includes(data.weatherCode ?? -1)) {
    return {
      tone: 'rain',
      statusLabel: 'बारिश सतर्कता',
      title: 'वर्षा के अनुसार कृषि सलाह',
      summary: `अगले 24 घंटे में बारिश की प्रबल संभावना (${maxRainProb24h}%${
        rain24h > 0 ? `, ~${rain24h} mm` : ''
      }) है। फसल और उपज सुरक्षा को प्राथमिकता दें।`,
      tips: [
        'कीटनाशक, फफूंदनाशक और खाद का छिड़काव आज न करें, दवा बारिश में धुल जाएगी।',
        'खड़ी फसलों में सिंचाई तुरंत रोक दें और खेतों में जल निकासी की व्यवस्था जांच लें।',
        'कटी हुई फसल या खलिहान में रखे अनाज को सुरक्षित स्थान पर ढककर रखें।',
      ],
      disclaimer,
    };
  }

  if (minNightSoon <= 5.5) {
    return {
      tone: 'cold',
      statusLabel: 'पाला व ठंड सतर्कता',
      title: 'अत्यधिक ठंड एवं पाला बचाव सलाह',
      summary: `रात का तापमान लगभग ${minNightSoon}°C तक गिरने का अनुमान है, जिससे संवेदनशील रबी व सब्जी फसलों पर पाले का असर हो सकता है।`,
      tips: [
        'शाम के समय खेतों में हल्की सिंचाई करने से जमीन की गर्मी बनी रहती है।',
        'नर्सरी और सब्जियों (टमाटर, मिर्च, पपीता) को पुआल या पॉलीथीन से ढकें।',
        'सुबह के समय खेत की मेड़ों के पास नमी बनाए रखें और फसल की निगरानी करें।',
      ],
      disclaimer,
    };
  }

  if (hasFog || hasHeavyDew) {
    return {
      tone: 'fog',
      statusLabel: 'कोहरा व ओस सावधानी',
      title: 'कोहरे और सुबह की ओस के अनुसार सलाह',
      summary:
        'सुबह के समय कोहरा या पत्तियों पर अधिक ओस रहने की संभावना है। गीली पत्तियों पर दवा छिड़काव कम प्रभावी होता है।',
      tips: [
        'सुबह की ओस पूरी तरह सूखने और हल्की धूप निकलने के बाद ही छिड़काव करें।',
        'लगातार नमी रहने से चना, सरसों, गेहूं व लहसुन में फफूंद रोगों की जांच करते रहें।',
        'सुबह के समय खेत में कटाई या थ्रेशिंग के बजाय दोपहर का समय चुनें।',
      ],
      disclaimer,
    };
  }

  if (maxDaySoon >= 39 || (data.feelsLike !== undefined && data.feelsLike >= 41)) {
    return {
      tone: 'heat',
      statusLabel: 'गर्मी व लू सावधानी',
      title: 'तेज गर्मी के अनुसार सिंचाई व कार्य सलाह',
      summary: `दिन का तापमान ${maxDaySoon}°C तक जाने के कारण दोपहर में वाष्पीकरण तेज रहेगा और पौधों पर ताप तनाव बढ़ सकता है।`,
      tips: [
        'दोपहर 12 से 4 बजे के बीच सिंचाई और किसी भी प्रकार का छिड़काव बिल्कुल न करें।',
        'सुबह 9 बजे से पहले या शाम 5 बजे के बाद हल्की व नियमित सिंचाई करें।',
        'सब्जी व बागवानी फसलों में नमी बचाने के लिए मल्चिंग का उपयोग लाभकारी रहेगा।',
      ],
      disclaimer,
    };
  }

  if (maxGust24h >= 30 || data.windSpeed >= 20) {
    return {
      tone: 'wind',
      statusLabel: 'तेज हवा सावधानी',
      title: 'तेज हवा के अनुसार छिड़काव सलाह',
      summary: `हवा की रफ्तार अधिक (${data.windSpeed}–${maxGust24h} km/h) रहने से स्प्रे के दौरान दवा हवा के साथ उड़ सकती है।`,
      tips: [
        'तेज हवा चलते समय कीटनाशक या पत्ती खाद का छिड़काव स्थगित रखें।',
        'हवा शांत होने पर (सुबह या देर शाम) ही छिड़काव का कार्य करें।',
        'ऊंची फसलों और पॉलीहाउस/टीन शेड की मजबूती की जांच रखें।',
      ],
      disclaimer,
    };
  }

  if (maxRainProb24h >= 25 || rain24h >= 1) {
    return {
      tone: 'rain',
      statusLabel: 'हल्के बदलाव की संभावना',
      title: 'बदलते मौसम के अनुसार कृषि सलाह',
      summary: `अगले 24 घंटे में हल्की बूंदाबांदी या बादल छाने (${maxRainProb24h}% संभावना) के संकेत हैं।`,
      tips: [
        'सिंचाई की योजना मौसम साफ देखने के बाद ही बनाएं।',
        'खलिहान में सूख रही फसल या कटी उपज को सुरक्षित रखने का इंतजाम पास रखें।',
        'दवा छिड़काव करते समय आसमान और हवा की स्थिति जांच लें।',
      ],
      disclaimer,
    };
  }

  // Favorable default — tailored to cold-night / dry-day / mild conditions
  const winterNightNote =
    data.minTemp <= 14
      ? `रातें ठंडी (${data.minTemp}°C) रहने से गेहूं, चना, सरसों व लहसुन जैसी रबी फसलों की बढ़वार के लिए मौसम अनुकूल है।`
      : 'दिन व रात का तापमान फसलों की सामान्य बढ़वार के लिए संतुलित है।';

  return {
    tone: 'favorable',
    statusLabel: 'खेती के अनुकूल',
    title: 'आज की मौसम आधारित किसान सलाह',
    summary: `आसमान साफ और हवा सामान्य (${data.windSpeed} km/h) है। आज का मौसम प्रमुख खेत कार्यों के लिए उपयुक्त है।`,
    tips: [
      winterNightNote,
      'हवा धीमी होने से सुबह ओस सूखने के बाद या शाम को दवा व सूक्ष्म पोषक तत्वों का छिड़काव किया जा सकता है।',
      'खेत की नमी जांचकर फसल की आवश्यकता के अनुसार हल्की सिंचाई व निराई-गुड़ाई करें।',
    ],
    disclaimer,
  };
}
