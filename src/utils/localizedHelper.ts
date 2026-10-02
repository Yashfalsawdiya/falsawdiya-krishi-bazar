/**
 * Falsawdiya Krishi Bazaar - Localization Helper Utilities
 * Provides getLocalized() for bilingual data objects, image localization,
 * and smart bilingual parsing for dynamic database content.
 */

export type LocalizedField<T = string> = string | {
  en?: T;
  hi?: T;
  [lang: string]: T | undefined;
};

const LOCALIZED_CACHE_PREFIX = 'fkb_loc_cache_';

const SHOP_ADDRESS_EN = 'Dimple Chauraha, near Kshatriya Khati Mangalik Bhawan, Shamgarh, District Mandsaur, Madhya Pradesh - 458883';
const SHOP_ADDRESS_HI = 'डिंपल चौराहा, क्षत्रिय खाती मांगलिक भवन के पास, शामगढ़, जिला मंदसौर, मध्य प्रदेश - 458883';

// Direct dictionary of common crops and agricultural commodities
const CROP_TRANSLATIONS: Record<string, string> = {
  'सोयाबीन': 'Soybean',
  'लहसुन': 'Garlic',
  'गेहूँ': 'Wheat',
  'गेहूं': 'Wheat',
  'चना': 'Gram',
  'सरसों': 'Mustard',
  'मक्का': 'Maize',
  'कपास': 'Cotton',
  'उड़द': 'Black Gram (Urad)',
  'मूंग': 'Green Gram (Moong)',
  'प्याज़': 'Onion',
  'प्याज': 'Onion',
  'टमाटर': 'Tomato',
  'आलू': 'Potato',
  'मिर्च': 'Chilli',
  'धनिया': 'Coriander',
  'मेथी': 'Fenugreek',
  'मसूर': 'Lentil',
  'मूंगफली': 'Peanut',
  'तुअर': 'Pigeon Pea (Tur)',
  'जौ': 'Barley',
  'संतरा': 'Orange',
  'अफीम': 'Opium',
  'सब्जियां': 'Vegetables'
};

const MANDI_UNITS_QUALITIES: Record<string, string> = {
  'क्विंटल': 'Quintal',
  'क्रिएट (25kg)': 'Crate (25kg)',
  'क्रिएट': 'Crate',
  'बोरी': 'Bags',
  'किलोग्राम': 'kg',
  'किग्रा': 'kg',
  'सुपर बोल्ड': 'Super Bold',
  'एवरेज': 'Average',
  'चालू': 'Fair',
  'लोकवन': 'Lokwan',
  'शरबती': 'Sharbati',
  'मिल क्वालिटी': 'Mill Quality',
  'विशाल चना': 'Vishal Gram',
  'देशी चना': 'Desi Gram',
  'डबलर': 'Doubler',
  'ऊटी स्पेशल': 'Ooty Special',
  'देशी मीडियम': 'Desi Medium',
  'हल्का माल': 'Low Grade',
  'लाल नासिक': 'Red Nashik',
  'सुपर ए-१': 'Super A-1',
  'मीडियम': 'Medium',
  'देसी हाइब्रिड': 'Desi Hybrid',
  'सुपर फ्रेश': 'Super Fresh',
  'चिप्सोना': 'Chipsona',
  'ज्योति': 'Jyoti',
  'नया आलू': 'New Potato',
  'तेजा लाल': 'Teja Red',
  'साधारण लाल मिर्च': 'Standard Red Chilli',
  'ईगल क्वालिटी': 'Eagle Quality',
  'स्कूटर बोल्ड': 'Scooter Bold',
  'बदामी': 'Badami',
  'बारीक दाना': 'Fine Grain',
  'पीली मेथी': 'Yellow Fenugreek',
  'देशी मसूर': 'Desi Lentil',
  'बोल्ड': 'Bold',
  'G20 क्वालिटी': 'G20 Quality',
  'साधारण': 'Standard',
  'मारुति': 'Maruti',
  'सफेद तुअर': 'White Tur',
  'मल्टी क्वालिटी': 'Multi Quality'
};

// Known full product descriptions and guidance
const KNOWN_PHRASE_MAPPINGS: Record<string, { en: string; hi: string }> = {
  'लहसुन की बुवाई के लिए अक्टूबर का दूसरा पखवाड़ा सबसे उत्तम है।': {
    en: 'The second fortnight of October is the best time to sow garlic.',
    hi: 'लहसुन की बुवाई के लिए अक्टूबर का दूसरा पखवाड़ा सबसे उत्तम है।'
  },
  'हमारी सपोर्ट टीम सप्ताह के सातों दिन सक्रिय रहती है। फोन या व्हाट्सएप पर किया गया कोई भी संदेश तुरंत देखा जाता है।': {
    en: 'Our support team is active all seven days of the week. Reach us by phone or WhatsApp and we will reply promptly.',
    hi: 'हमारी सपोर्ट टीम सप्ताह के सातों दिन सक्रिय रहती है। फोन या व्हाट्सएप पर किया गया कोई भी संदेश तुरंत देखा जाता है।'
  },
  'दुकान पर स्वयं पधारकर कृषि सलाह और उत्पाद देखने का हार्दिक स्वागत है।': {
    en: 'Visit our store to see our agricultural advisory and products. You are always welcome.',
    hi: 'दुकान पर स्वयं पधारकर कृषि सलाह और उत्पाद देखने का हार्दिक स्वागत है।'
  },
  'शामगढ़ नगर एवं 25-30 किमी के ग्रामीण क्षेत्र': {
    en: 'Delivery coverage: Shamgarh town and rural areas within 25-30 km',
    hi: 'शामगढ़ नगर एवं 25-30 किमी के ग्रामीण क्षेत्र'
  },
  'सपोर्ट का समय एवं कार्यप्रणाली': {
    en: 'Support Hours & Process',
    hi: 'सपोर्ट का समय एवं कार्यप्रणाली'
  },
  'बेलर, मल्चर और रोटावेटर सहित कृषि यंत्रों पर 50% तक सब्सिडी पाएं - यहाँ आवेदन करें': {
    en: 'Get 50% subsidy on agricultural implements including balers, mulchers and rotavators - apply here',
    hi: 'बेलर, मल्चर और रोटावेटर सहित कृषि यंत्रों पर 50% तक सब्सिडी पाएं - यहाँ आवेदन करें'
  },
  'किसानों को बड़ी राहत: मूल्य समर्थन योजना (PSS) के तहत होगी दलहन और तिलहन की सीधी खरीद': {
    en: 'Big relief for farmers: pulses and oilseeds to be procured under the Price Support Scheme',
    hi: 'किसानों को बड़ी राहत: मूल्य समर्थन योजना (PSS) के तहत होगी दलहन और तिलहन की सीधी खरीद'
  },
  'प्रति लीटर पानी में 0.3 ग्राम मिलाकर छिड़काव करें।': {
    en: 'Mix 0.3 g per litre of water and spray.',
    hi: 'प्रति लीटर पानी में 0.3 ग्राम मिलाकर छिड़काव करें।'
  },
  '0.3 ग्राम प्रति लीटर पानी': {
    en: 'Mix 0.3 g per litre of water and spray.',
    hi: '0.3 ग्राम प्रति लीटर पानी'
  },
  '0.3 ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें': {
    en: 'Mix 0.3 g per litre of water and spray.',
    hi: '0.3 ग्राम प्रति लीटर पानी में मिलाकर छिड़काव करें'
  },
  'जैविक खाद बनाने की विधि': {
    en: 'How to Make Organic Fertilizer',
    hi: 'जैविक खाद बनाने की विधि'
  },
  'मिट्टी परीक्षण कैसे करें': {
    en: 'How to Do Soil Testing',
    hi: 'मिट्टी परीक्षण कैसे करें'
  },
  'आधुनिक खेती की जानकारी': {
    en: 'Modern Farming Methods & Guidance',
    hi: 'आधुनिक खेती की जानकारी'
  }
};

/**
 * Retrieves the localized string from a field that may be either:
 * 1. An object: { en: '...', hi: '...' }
 * 2. A string with parentheses format: "मध्यप्रदेश (Madhya Pradesh)"
 * 3. A raw string (address, commodity, product description, etc.)
 */
export function getLocalized(field: LocalizedField | undefined | null, lang: string = 'en', fallbackText: string = ''): string {
  if (!field) return fallbackText;

  // Case 1: Structured bilingual object
  if (typeof field === 'object' && field !== null) {
    if (field[lang] && typeof field[lang] === 'string' && field[lang]?.trim()) {
      return field[lang] as string;
    }
    // Fallback: preferred English, then Hindi, then any available value
    if (field.en && typeof field.en === 'string' && field.en.trim()) return field.en;
    if (field.hi && typeof field.hi === 'string' && field.hi.trim()) return field.hi;
    const firstVal = Object.values(field).find(v => typeof v === 'string' && v.trim());
    return (firstVal as string) || fallbackText;
  }

  // Case 2: Plain string
  const str = String(field).trim();
  if (!str) return fallbackText;

  // Clean typos or broken glyphs
  const cleaned = str
    .replace(/\bEmpligo\b/gi, 'Ampligo')
    .replace(/\bएम्पलीगो\b/g, 'एम्प्लीगो')
    .replace(/Shamagadh◌ः/g, 'Shamgarh')
    .replace(/Jud◌ः/g, 'Join');

  // Case 2a: Known phrases & seasonal advice
  if (KNOWN_PHRASE_MAPPINGS[cleaned]) {
    return lang === 'en' ? KNOWN_PHRASE_MAPPINGS[cleaned].en : KNOWN_PHRASE_MAPPINGS[cleaned].hi;
  }

  // Case 2b: Shop address
  if (cleaned.includes('डिंपल चौराहा') || cleaned.includes('Kshatriya Khati') || cleaned.includes('458883')) {
    return lang === 'en' ? SHOP_ADDRESS_EN : SHOP_ADDRESS_HI;
  }

  // Case 2c: Bilingual parenthetical format "हिंदी (English)" or "English (हिंदी)"
  const parenMatch = cleaned.match(/^([^\(\)]+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const firstPart = parenMatch[1].trim();
    const secondPart = parenMatch[2].trim();
    const isFirstDevanagari = /[\u0900-\u097F]/.test(firstPart);
    const isSecondEnglish = /^[A-Za-z0-9\s.,\-\/\&]+$/.test(secondPart);

    if (isFirstDevanagari && isSecondEnglish) {
      return lang === 'en' ? secondPart : firstPart;
    }
  }

  // Case 2d: Commodity lookup
  if (lang === 'en' && CROP_TRANSLATIONS[cleaned]) {
    return CROP_TRANSLATIONS[cleaned];
  }

  // Case 2e: Units & quality lookup
  if (lang === 'en' && MANDI_UNITS_QUALITIES[cleaned]) {
    return MANDI_UNITS_QUALITIES[cleaned];
  }

  // Case 2f: Dosage matching (e.g. 0.3 g per litre)
  if (cleaned.includes('0.3') && (cleaned.includes('लीटर') || cleaned.toLowerCase().includes('litre') || cleaned.toLowerCase().includes('g/l') || cleaned.includes('ग्राम'))) {
    if (lang === 'en') {
      return 'Mix 0.3 g per litre of water and spray.';
    } else {
      return 'प्रति लीटर पानी में 0.3 ग्राम मिलाकर छिड़काव करें।';
    }
  }

  // Case 2g: Ampligo product description
  if (cleaned.toLowerCase().includes('chlorantraniliprole') && cleaned.toLowerCase().includes('lambda-cyhalothrin')) {
    if (lang === 'en') {
      return 'Ampligo is a modern dual-action, broad-spectrum insecticide containing Chlorantraniliprole and Lambda-cyhalothrin. It effectively controls fruit borer, stem borer, caterpillars, and other chewing pests. Its Zeon Technology gives long-lasting protection and delivers better results with fewer sprays. Very useful for cotton, paddy, soybean, chilli and vegetable crops.';
    } else {
      return 'एम्प्लीगो एक आधुनिक ड्यूल-एक्शन ब्रॉड-स्पेक्ट्रम कीटनाशक है जिसमें क्लोरएंट्रानिलीप्रोल और लैम्ब्डा-साइहलोथ्रिन का शक्तिशाली संयोजन है। यह फल छेदक, तना छेदक, इल्ली और अन्य चबाने वाले कीटों को प्रभावी ढंग से नियंत्रित करता है। इसकी जियोन तकनीक लंबे समय तक सुरक्षा देती है और कम स्प्रे में बेहतर परिणाम देती है। कपास, धान, सोयाबीन, मिर्च और सब्जियों की फसलों के लिए अत्यधिक उपयोगी है।';
    }
  }

  // Case 2h: Ulala product description
  if (cleaned.toLowerCase().includes('flonicamid') || cleaned.toLowerCase().includes('फ्लोनिकामिड') || cleaned.includes('उलाला') || cleaned.toLowerCase().includes('ulala')) {
    if (lang === 'en') {
      return 'Ulala is a modern systemic insecticide containing Flonicamid 50% WG. It effectively controls aphids, jassids, thrips, whiteflies and other sucking pests. Its effect is long-lasting, and it is extremely useful for cotton, paddy and vegetable crops. It is considered comparatively safe for beneficial insects.';
    } else {
      return 'उलाला एक आधुनिक प्रणालीगत कीटनाशक है जिसमें फ्लोनिकामिड 50% डब्ल्यूजी शामिल है। यह एफिड्स, जैसिड्स, थ्रिप्स, सफेद मक्खियों और अन्य रस चूसक कीटों को प्रभावी ढंग से नियंत्रित करता है। इसका प्रभाव लंबे समय तक रहता है, और यह कपास, धान और सब्जी फसलों के लिए बेहद उपयोगी है। इसे मित्र कीटों के लिए तुलनात्मक रूप से सुरक्षित माना जाता है।';
    }
  }

  // Case 2i: IFFCO DAP product description
  if (cleaned.toLowerCase().includes('diammonium phosphate') || cleaned.includes('डाईअमोनियम फॉस्फेट') || (cleaned.includes('18:46') && (cleaned.toLowerCase().includes('dap') || cleaned.includes('डीएपी')))) {
    if (lang === 'en') {
      return 'IFFCO DAP (Diammonium Phosphate) 18:46 is a high-quality phosphatic fertiliser containing 18% nitrogen (N) and 46% phosphorus (P₂O₅). It plays an important role in root development, early growth, flowering and fruiting, and helps plants grow strong and healthy. It is widely used in wheat, paddy, maize, soybean, cotton, sugarcane and vegetables.';
    } else {
      return 'इफको डीएपी (डाईअमोनियम फॉस्फेट) 18:46 एक उच्च गुणवत्ता वाला फॉस्फेटिक उर्वरक है जिसमें 18% नाइट्रोजन (N) और 46% फॉस्फोरस (P₂O₅) होता है। यह जड़ों के विकास, प्रारंभिक वृद्धि, फूल और फल लगने में महत्वपूर्ण भूमिका निभाता है और पौधों को मजबूत और स्वस्थ बनाने में मदद करता है। इसका व्यापक उपयोग गेहूं, धान, मक्का, सोयाबीन, कपास, गन्ना और सब्जियों में किया जाता है।';
    }
  }

  // Check localStorage dynamic translation cache
  const hasDevanagari = /[\u0900-\u097F]/.test(cleaned);
  if (lang === 'en' && hasDevanagari) {
    try {
      const cacheKey = LOCALIZED_CACHE_PREFIX + 'en_' + hashString(cleaned);
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {
      // Ignore localStorage errors
    }
  }

  return cleaned;
}

/**
 * Returns localized banner or image URL.
 * Supports image: { en: '...', hi: '...' } or image: '...'
 */
export function getLocalizedImage(imageField: LocalizedField | undefined | null, lang: string = 'en', defaultImage: string = ''): string {
  if (!imageField) return defaultImage;
  if (typeof imageField === 'object' && imageField !== null) {
    if (imageField[lang] && typeof imageField[lang] === 'string' && imageField[lang]?.trim()) {
      return imageField[lang] as string;
    }
    if (imageField.en && typeof imageField.en === 'string' && imageField.en.trim()) return imageField.en;
    if (imageField.hi && typeof imageField.hi === 'string' && imageField.hi.trim()) return imageField.hi;
    return defaultImage;
  }
  return String(imageField);
}

/**
 * Saves a translation in localStorage so dynamic items are only translated once.
 */
export function cacheDynamicTranslation(originalText: string, targetLang: string, translatedText: string): void {
  if (!originalText || !translatedText) return;
  try {
    const cacheKey = LOCALIZED_CACHE_PREFIX + targetLang + '_' + hashString(originalText.trim());
    localStorage.setItem(cacheKey, translatedText.trim());
  } catch {
    // Ignore quota issues
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
