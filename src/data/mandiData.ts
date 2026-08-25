// Mandi Pulse Database structure & stable fallback generator
export interface MandiItem {
  commodity: string;
  minPrice: string;
  maxPrice: string;
  avgPrice: string;
  unit: string;
  arrival?: string;
  quality?: string;
  lastUpdated: string;
}

export interface MandiDetails {
  mandiName: string;
  district: string;
  state: string;
  date: string;
  items: MandiItem[];
}

export interface StateMandiMap {
  [state: string]: {
    [district: string]: string[];
  };
}

export const STATE_MANDI_DATA: StateMandiMap = {
  "मध्यप्रदेश (Madhya Pradesh)": {
    "मंदसौर (Mandsaur)": ["शामगढ़ (Shamgarh)", "गरोठ (Garoth)", "सीतामऊ (Sitamau)", "मंदसौर (Mandsaur)", "पिपलिया (Pipliya)"],
    "नीमच (Neemuch)": ["नीमच (Neemuch)", "जावद (Jawad)", "मनासा (Manasa)"],
    "रतलाम (Ratlam)": ["रतलाम (Ratlam)", "जावरा (Jaora)", "सैलाना (Sailana)"],
    "इंदौर (Indore)": ["इंदौर (Indore)", "महू (Mhow)"],
    "उज्जैन (Ujjain)": ["उज्जैन (Ujjain)", "बड़नगर (Badnagar)", "खाचरौद (Khachrod)"],
    "देवास (Dewas)": ["देवास (Dewas)", "सोनकच्छ (Sonkatch)"],
    "धार (Dhar)": ["धार (Dhar)", "बदनावर (Badnawar)"]
  },
  "राजस्थान (Rajasthan)": {
    "प्रतापगढ़ (Pratapgarh)": ["प्रतापगढ़ (Pratapgarh)"],
    "कोटा (Kota)": ["कोटा (Kota)", "रामगंज मंडी (Ramganj Mandi)"],
    "झालावाड़ (Jhalawar)": ["झालावाड़ (Jhalawar)", "भवानी मंडी (Bhawani Mandi)"],
    "बारां (Baran)": ["बारां (Baran)", "अटरू (Atru)"],
    "चित्तौड़गढ़ (Chittorgarh)": ["चित्तौड़गढ़ (Chittorgarh)", "कपासन (Kapasan)"],
    "जयपुर (Jaipur)": ["जयपुर (Jaipur)", "चोमू (Chomu)"]
  },
  "उत्तर प्रदेश (Uttar Pradesh)": {
    "आगरा (Agra)": ["आगरा (Agra)", "फतेहाबाद (Fatehabad)"],
    "झांसी (Jhansi)": ["झांसी (Jhansi)", "मऊरानीपुर (Mauranipur)"],
    "कानपुर (Kanpur)": ["कानपुर नगर (Kanpur Nagar)", "चौबेपुर (Chaubepur)"],
    "मथुरा (Mathura)": ["मथुरा (Mathura)", "कोसीकलां (Kosi Kalan)"]
  },
  "महाराष्ट्र (Maharashtra)": {
    "नाशिक (Nashik)": ["लासलगांव (Lasalgaon)", "पिंपलगांव (Pipalgaon)", "मनमाड (Manmad)"],
    "पुणे (Pune)": ["पुणे (Pune)", "मंचर (Manchar)"],
    "नागपुर (Nagpur)": ["नागपुर (Nagpur)", "कलमेश्वर (Kalmeshwar)"],
    "अमरावती (Amravati)": ["अमरावती (Amravati)", "अचलपुर (Achalpur)"]
  },
  "गुजरात (Gujarat)": {
    "राजकोट (Rajkot)": ["राजकोट (Rajkot)", "गोंडल (Gondal)"],
    "महेसाणा (Mehsana)": ["उंझा (Unjha)", "विसनगर (Visnagar)"],
    "जूनागढ़ (Junagadh)": ["जूनागढ़ (Junagadh)", "केशोद (Keshod)"]
  }
};

// Standard crops list as requested
export const CROPS_LIST = [
  "सोयाबीन (Soybean)",
  "गेहूँ (Wheat)",
  "चना (Gram)",
  "सरसों (Mustard)",
  "मक्का (Maize)",
  "कपास (Cotton)",
  "उड़द (Urad)",
  "मूंग (Moong)",
  "प्याज़ (Onion)",
  "लहसुन (Garlic)",
  "टमाटर (Tomato)",
  "आलू (Potato)",
  "मिर्च (Chilli)",
  "धनिया (Coriander)",
  "मेथी (Fenugreek)",
  "मसूर (Lentil)",
  "मूंगफली (Peanut)",
  "तुअर (Arhar/Tur)",
  "जौ (Barley)"
];

// Helper to get hindi crop name from selection
export function getHindiCropName(crop: string): string {
  return crop.split(" (")[0];
}

// Generate realistic seed-based fallback prices to ensure UI loads instantly and perfectly offline
export function generateFallbackMandiDetails(state: string, district: string, mandiName: string): MandiDetails {
  const seed = (state.length + district.length + mandiName.length) % 10;
  const now = new Date();
  
  // Crop base prices
  const basePrices: { [crop: string]: { base: number; range: number; unit: string; arrivalBase: number; qualities: string[] } } = {
    "सोयाबीन (Soybean)": { base: 4500, range: 400, unit: "क्विंटल", arrivalBase: 120, qualities: ["सुपर बोल्ड", "एवरेज", "चालू"] },
    "गेहूँ (Wheat)": { base: 2450, range: 250, unit: "क्विंटल", arrivalBase: 350, qualities: ["लोकवन", "शरबती", "मिल क्वालिटी"] },
    "चना (Gram)": { base: 5350, range: 350, unit: "क्विंटल", arrivalBase: 80, qualities: ["विशाल चना", "देशी चना", "डबलर"] },
    "सरसों (Mustard)": { base: 5200, range: 450, unit: "क्विंटल", arrivalBase: 65, qualities: ["42% कंडीशन", "मंडी क्वालिटी"] },
    "मक्का (Maize)": { base: 2050, range: 200, unit: "क्विंटल", arrivalBase: 150, qualities: ["पीली मक्का", "सफेद मक्का"] },
    "कपास (Cotton)": { base: 7100, range: 600, unit: "क्विंटल", arrivalBase: 90, qualities: ["सुपर क्वालिटी", "एवरेज"] },
    "उड़द (Urad)": { base: 7200, range: 800, unit: "क्विंटल", arrivalBase: 40, qualities: ["चमकदार बोल्ड", "एवरेज"] },
    "मूंग (Moong)": { base: 7600, range: 700, unit: "क्विंटल", arrivalBase: 35, qualities: ["चमकीली मूंग", "साधारण मूंग"] },
    "प्याज़ (Onion)": { base: 1400, range: 600, unit: "क्विंटल", arrivalBase: 500, qualities: ["लाल नासिक", "सुपर ए-१", "मीडियम"] },
    "लहसुन (Garlic)": { base: 11500, range: 6000, unit: "क्विंटल", arrivalBase: 150, qualities: ["ऊटी स्पेशल", "सुपर बोल्ड", "देशी मीडियम", "हल्का माल"] },
    "टमाटर (Tomato)": { base: 1500, range: 800, unit: "क्रिएट (25kg)", arrivalBase: 250, qualities: ["देसी हाइब्रिड", "सुपर फ्रेश"] },
    "आलू (Potato)": { base: 1200, range: 400, unit: "क्विंटल", arrivalBase: 400, qualities: ["चिप्सोना", "ज्योति", "नया आलू"] },
    "मिर्च (Chilli)": { base: 16000, range: 8000, unit: "क्विंटल", arrivalBase: 45, qualities: ["तेजा लाल", "साधारण लाल मिर्च"] },
    "धनिया (Coriander)": { base: 6500, range: 1200, unit: "क्विंटल", arrivalBase: 110, qualities: ["ईगल क्वालिटी", "स्कूटर बोल्ड", "बदामी"] },
    "मेथी (Fenugreek)": { base: 5600, range: 600, unit: "क्विंटल", arrivalBase: 55, qualities: ["बारीक दाना", "पीली मेथी"] },
    "मसूर (Lentil)": { base: 6100, range: 400, unit: "क्विंटल", arrivalBase: 50, qualities: ["देशी मसूर", "बोल्ड"] },
    "मूंगफली (Peanut)": { base: 6200, range: 800, unit: "क्विंटल", arrivalBase: 70, qualities: ["G20 क्वालिटी", "साधारण"] },
    "तुअर (Arhar/Tur)": { base: 9800, range: 1200, unit: "क्विंटल", arrivalBase: 30, qualities: ["मारुति", "सफेद तुअर"] },
    "जौ (Barley)": { base: 1900, range: 250, unit: "क्विंटल", arrivalBase: 120, qualities: ["मल्टी क्वालिटी", "एवरेज"] }
  };

  const items: MandiItem[] = [];
  const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const hours = now.getHours();
  const timeStr = `${hours < 10 ? '0' + hours : hours}:${now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes()}`;

  Object.entries(basePrices).forEach(([cropName, config], index) => {
    // Generate stable realistic prices per mandi
    const variation = ((index + seed) % 5) * (config.range / 4) - (config.range / 2);
    const model = Math.round(config.base + variation);
    const min = Math.max(50, Math.round(model - (config.range / 2)));
    const max = Math.round(model + (config.range / 2));
    
    const arrivalVal = Math.max(10, Math.round(config.arrivalBase * (1 + (seed - 5) / 15)));
    const qualityVal = config.qualities[(seed + index) % config.qualities.length];

    items.push({
      commodity: getHindiCropName(cropName),
      minPrice: min.toString(),
      maxPrice: max.toString(),
      avgPrice: model.toString(),
      unit: config.unit,
      arrival: `${arrivalVal} ${config.unit === "क्रिएट (25kg)" ? "क्रिएट" : "बोरी"}`,
      quality: qualityVal,
      lastUpdated: `${dateStr} ${timeStr}`
    });
  });

  return {
    mandiName,
    district,
    state,
    date: `${dateStr} ${timeStr}`,
    items
  };
}
