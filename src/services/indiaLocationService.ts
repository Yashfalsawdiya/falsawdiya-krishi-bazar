/**
 * India Location Service - All-India Village, Tehsil, District, and Pincode Auto-Resolution
 * Combines ultra-fast in-memory national directory with authentic India Post Public Directory API
 * Zero Firebase Quota Impact, 100% Client-Side
 */

import {
  VillageDeliveryEntry,
  normalizeFarmerHindi,
  normalizeLocationText,
  levenshteinDistance,
  getAllTehsilsFromDirectory,
} from '../data/villageDirectory';

export interface IndiaLocationSuggestion {
  villageOrTown: string;
  villageOrTownEn?: string;
  tehsil: string;
  tehsilEn?: string;
  district: string;
  districtEn?: string;
  state: string;
  stateEn?: string;
  pincode: string;
  source: 'local' | 'national_directory' | 'india_post';
  distanceKm?: number;
}

export interface IndiaTehsilSuggestion {
  nameHi: string;
  nameEn: string;
  districtHi: string;
  districtEn: string;
  stateHi: string;
  stateEn: string;
  defaultPin?: string;
  villageCount: number;
  isLocal?: boolean;
}

// In-memory cache to guarantee 0ms instant repeated lookups
const memoryCache: Record<string, IndiaLocationSuggestion[]> = {};
const pincodeCache: Record<string, { district: string; state: string; tehsil?: string; villages?: string[] }> = {};

/**
 * Phonetic transliterator from Hindi (Devanagari) to Latin/English
 * Ensures India Post API can be queried even if farmer types in Hindi
 */
export const transliterateHindiToLatin = (hindiText: string): string => {
  if (!hindiText) return '';
  const trimmed = hindiText.trim();

  // If already standard English/ASCII
  if (/^[a-z0-9\s.,-]+$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Common Hindi place-name overrides for instant precision
  const KNOWN_MAP: Record<string, string> = {
    'महू': 'mhow',
    'महु': 'mhow',
    'मऊ': 'mhow',
    'इंदौर': 'indore',
    'इन्दौर': 'indore',
    'उज्जैन': 'ujjain',
    'रतलाम': 'ratlam',
    'नीमच': 'neemuch',
    'मंदसौर': 'mandsaur',
    'शामगढ़': 'shamgarh',
    'गरोठ': 'garoth',
    'सुवासरा': 'suwasra',
    'भानपुरा': 'bhanpura',
    'सीतामऊ': 'sitamau',
    'भोपाल': 'bhopal',
    'झालावाड़': 'jhalawar',
    'कोटा': 'kota',
    'आंकली': 'aankli',
    'तकरावद': 'takrawad',
    'छान': 'chhan',
    'बोलिया': 'bolia',
    'मेलखेड़ा': 'melkheda',
    'जावरा': 'jaora',
    'दलोदा': 'daloda',
    'सांवेर': 'sanwer',
    'देवास': 'dewas',
    'धार': 'dhar',
    'शाजापुर': 'shajapur',
    'जयपुर': 'jaipur',
    'जोधपुर': 'jodhpur',
    'उदयपुर': 'udaipur',
    'ग्वालियर': 'gwalior',
    'जबलपुर': 'jabalpur',
  };

  if (KNOWN_MAP[trimmed]) return KNOWN_MAP[trimmed];

  const charMap: Record<string, string> = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'ड़': 'd', 'ढ़': 'dh',
    'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n',
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    '्': '',
  };

  let result = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (charMap[ch] !== undefined) {
      result += charMap[ch];
    } else if (/[a-zA-Z0-9\s]/.test(ch)) {
      result += ch;
    }
  }

  return result.toLowerCase().trim();
};

/**
 * Pre-seeded prominent Tehsils & Major Towns across India (0ms instant response)
 */
export const PROMINENT_ALL_INDIA_TEHSILS: Array<{
  tehsilHi: string;
  tehsilEn: string;
  districtHi: string;
  districtEn: string;
  stateHi: string;
  stateEn: string;
  defaultPin?: string;
  isLocalHub?: boolean;
}> = [
  // Mandsaur District (Local Hub)
  { tehsilHi: 'शामगढ़', tehsilEn: 'Shamgarh', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458883', isLocalHub: true },
  { tehsilHi: 'गरोठ', tehsilEn: 'Garoth', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458888', isLocalHub: true },
  { tehsilHi: 'सुवासरा', tehsilEn: 'Suwasra', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458880', isLocalHub: true },
  { tehsilHi: 'भानपुरा', tehsilEn: 'Bhanpura', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458775', isLocalHub: true },
  { tehsilHi: 'सीतामऊ', tehsilEn: 'Sitamau', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458990', isLocalHub: true },
  { tehsilHi: 'मंदसौर', tehsilEn: 'Mandsaur', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458001', isLocalHub: true },
  { tehsilHi: 'मल्हारगढ़', tehsilEn: 'Malhargarh', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458667', isLocalHub: true },
  { tehsilHi: 'दलोदा', tehsilEn: 'Daloda', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458558', isLocalHub: true },

  // Indore District
  { tehsilHi: 'इंदौर', tehsilEn: 'Indore', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '452001' },
  { tehsilHi: 'महू', tehsilEn: 'Mhow', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '453441' },
  { tehsilHi: 'डॉ. अम्बेडकर नगर', tehsilEn: 'Dr. Ambedkar Nagar', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '453441' },
  { tehsilHi: 'सांवेर', tehsilEn: 'Sanwer', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '453551' },
  { tehsilHi: 'देपालपुर', tehsilEn: 'Depalpur', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '453115' },
  { tehsilHi: 'हातोद', tehsilEn: 'Hatod', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '453111' },
  { tehsilHi: 'राऊ', tehsilEn: 'Rau', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '453331' },

  // Ujjain District
  { tehsilHi: 'उज्जैन', tehsilEn: 'Ujjain', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '456001' },
  { tehsilHi: 'नागदा', tehsilEn: 'Nagda', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '456335' },
  { tehsilHi: 'महिदपुर', tehsilEn: 'Mahidpur', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '456443' },
  { tehsilHi: 'तराना', tehsilEn: 'Tarana', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '456665' },
  { tehsilHi: 'बड़नगर', tehsilEn: 'Badnagar', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '456771' },
  { tehsilHi: 'खाचरौद', tehsilEn: 'Khachrod', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '456224' },
  { tehsilHi: 'घट्टिया', tehsilEn: 'Ghattia', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '456006' },

  // Ratlam District
  { tehsilHi: 'रतलाम', tehsilEn: 'Ratlam', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '457001' },
  { tehsilHi: 'जावरा', tehsilEn: 'Jaora', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '457226' },
  { tehsilHi: 'आलोट', tehsilEn: 'Alot', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '457114' },
  { tehsilHi: 'सैलाना', tehsilEn: 'Sailana', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '457550' },
  { tehsilHi: 'बाजना', tehsilEn: 'Bajna', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '457555' },
  { tehsilHi: 'पिपलोदा', tehsilEn: 'Piploda', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '457331' },

  // Neemuch District
  { tehsilHi: 'नीमच', tehsilEn: 'Neemuch', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458441' },
  { tehsilHi: 'मनासा', tehsilEn: 'Manasa', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458110' },
  { tehsilHi: 'जावद', tehsilEn: 'Jawaad', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458220' },
  { tehsilHi: 'सिंगोली', tehsilEn: 'Singoli', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458228' },
  { tehsilHi: 'रामपुरा', tehsilEn: 'Rampura', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '458118' },

  // Jhalawar District (Rajasthan)
  { tehsilHi: 'झालावाड़', tehsilEn: 'Jhalawar', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326001' },
  { tehsilHi: 'झालरापाटन', tehsilEn: 'Jhalrapatan', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326023' },
  { tehsilHi: 'भवानी मंडी', tehsilEn: 'Bhawani Mandi', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326502' },
  { tehsilHi: 'डग', tehsilEn: 'Dag', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326514' },
  { tehsilHi: 'चौमहला', tehsilEn: 'Chaumahla', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326515' },
  { tehsilHi: 'पिड़ावा', tehsilEn: 'Pirawa', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326501' },
  { tehsilHi: 'सुनेल', tehsilEn: 'Sunel', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326513' },
  { tehsilHi: 'अकलेरा', tehsilEn: 'Aklera', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326033' },
  { tehsilHi: 'मनोहरथाना', tehsilEn: 'Manohar Thana', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326037' },
  { tehsilHi: 'खानपुर', tehsilEn: 'Khanpur', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326038' },
  { tehsilHi: 'बकानी', tehsilEn: 'Bakani', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326022' },

  // Kota District (Rajasthan)
  { tehsilHi: 'कोटा', tehsilEn: 'Kota', districtHi: 'कोटा', districtEn: 'Kota', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '324001' },
  { tehsilHi: 'लाडपुरा', tehsilEn: 'Ladpura', districtHi: 'कोटा', districtEn: 'Kota', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '324005' },
  { tehsilHi: 'रामगंजमंडी', tehsilEn: 'Ramganj Mandi', districtHi: 'कोटा', districtEn: 'Kota', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '326519' },
  { tehsilHi: 'सांगोद', tehsilEn: 'Sangod', districtHi: 'कोटा', districtEn: 'Kota', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '325601' },
  { tehsilHi: 'दीगोद', tehsilEn: 'Digod', districtHi: 'कोटा', districtEn: 'Kota', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '325201' },

  // Chittorgarh District (Rajasthan)
  { tehsilHi: 'चित्तौड़गढ़', tehsilEn: 'Chittorgarh', districtHi: 'चित्तौड़गढ़', districtEn: 'Chittorgarh', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '312001' },
  { tehsilHi: 'निम्बाहेड़ा', tehsilEn: 'Nimbahera', districtHi: 'चित्तौड़गढ़', districtEn: 'Chittorgarh', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '312601' },
  { tehsilHi: 'बड़ी सादड़ी', tehsilEn: 'Bari Sadri', districtHi: 'चित्तौड़गढ़', districtEn: 'Chittorgarh', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '312403' },
  { tehsilHi: 'रावतभाटा', tehsilEn: 'Rawatbhata', districtHi: 'चित्तौड़गढ़', districtEn: 'Chittorgarh', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '323307' },
  { tehsilHi: 'कपासन', tehsilEn: 'Kapasan', districtHi: 'चित्तौड़गढ़', districtEn: 'Chittorgarh', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '312202' },

  // Bhopal District
  { tehsilHi: 'भोपाल', tehsilEn: 'Bhopal', districtHi: 'भोपाल', districtEn: 'Bhopal', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '462001' },
  { tehsilHi: 'हुजूर', tehsilEn: 'Huzur', districtHi: 'भोपाल', districtEn: 'Bhopal', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '462001' },
  { tehsilHi: 'बैरसिया', tehsilEn: 'Berasia', districtHi: 'भोपाल', districtEn: 'Bhopal', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '463106' },
  { tehsilHi: 'कोलार', tehsilEn: 'Kolar', districtHi: 'भोपाल', districtEn: 'Bhopal', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '462042' },

  // Dewas District
  { tehsilHi: 'देवास', tehsilEn: 'Dewas', districtHi: 'देवास', districtEn: 'Dewas', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '455001' },
  { tehsilHi: 'सोनकच्छ', tehsilEn: 'Sonkatch', districtHi: 'देवास', districtEn: 'Dewas', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '455118' },
  { tehsilHi: 'बागली', tehsilEn: 'Bagli', districtHi: 'देवास', districtEn: 'Dewas', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '455227' },
  { tehsilHi: 'कन्नौद', tehsilEn: 'Kannod', districtHi: 'देवास', districtEn: 'Dewas', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '455332' },
  { tehsilHi: 'खातेगांव', tehsilEn: 'Khategaon', districtHi: 'देवास', districtEn: 'Dewas', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '455336' },

  // Agar Malwa & Shajapur
  { tehsilHi: 'आगर', tehsilEn: 'Agar', districtHi: 'आगर मालवा', districtEn: 'Agar Malwa', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465441' },
  { tehsilHi: 'सुसनेर', tehsilEn: 'Susner', districtHi: 'आगर मालवा', districtEn: 'Agar Malwa', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465447' },
  { tehsilHi: 'नलखेड़ा', tehsilEn: 'Nalkheda', districtHi: 'आगर मालवा', districtEn: 'Agar Malwa', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465445' },
  { tehsilHi: 'बड़ौद', tehsilEn: 'Badod', districtHi: 'आगर मालवा', districtEn: 'Agar Malwa', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465550' },
  { tehsilHi: 'शाजापुर', tehsilEn: 'Shajapur', districtHi: 'शाजापुर', districtEn: 'Shajapur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465001' },
  { tehsilHi: 'शुजालपुर', tehsilEn: 'Shujalpur', districtHi: 'शाजापुर', districtEn: 'Shajapur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465333' },
  { tehsilHi: 'कालापीपल', tehsilEn: 'Kalapipal', districtHi: 'शाजापुर', districtEn: 'Shajapur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465337' },

  // Dhar District
  { tehsilHi: 'धार', tehsilEn: 'Dhar', districtHi: 'धार', districtEn: 'Dhar', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '454001' },
  { tehsilHi: 'बदनावर', tehsilEn: 'Badnawar', districtHi: 'धार', districtEn: 'Dhar', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '454660' },
  { tehsilHi: 'सरदारपुर', tehsilEn: 'Sardarpur', districtHi: 'धार', districtEn: 'Dhar', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '454111' },
  { tehsilHi: 'मनावर', tehsilEn: 'Manawar', districtHi: 'धार', districtEn: 'Dhar', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '454446' },
  { tehsilHi: 'कुक्षी', tehsilEn: 'Kukshi', districtHi: 'धार', districtEn: 'Dhar', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '454331' },

  // Rajgarh District
  { tehsilHi: 'ब्यावरा', tehsilEn: 'Biaora', districtHi: 'राजगढ़', districtEn: 'Rajgarh', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465674' },
  { tehsilHi: 'सारंगपुर', tehsilEn: 'Sarangpur', districtHi: 'राजगढ़', districtEn: 'Rajgarh', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465697' },
  { tehsilHi: 'राजगढ़', tehsilEn: 'Rajgarh', districtHi: 'राजगढ़', districtEn: 'Rajgarh', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465661' },
  { tehsilHi: 'नरसिंहगढ़', tehsilEn: 'Narsinghgarh', districtHi: 'राजगढ़', districtEn: 'Rajgarh', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465669' },
  { tehsilHi: 'खिलचीपुर', tehsilEn: 'Khilchipur', districtHi: 'राजगढ़', districtEn: 'Rajgarh', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465679' },
  { tehsilHi: 'जीरापुर', tehsilEn: 'Jeerapur', districtHi: 'राजगढ़', districtEn: 'Rajgarh', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '465691' },

  // Major Cities across MP & neighboring states
  { tehsilHi: 'ग्वालियर', tehsilEn: 'Gwalior', districtHi: 'ग्वालियर', districtEn: 'Gwalior', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '474001' },
  { tehsilHi: 'जबलपुर', tehsilEn: 'Jabalpur', districtHi: 'जबलपुर', districtEn: 'Jabalpur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '482001' },
  { tehsilHi: 'सागर', tehsilEn: 'Sagar', districtHi: 'सागर', districtEn: 'Sagar', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '470001' },
  { tehsilHi: 'रीवा', tehsilEn: 'Rewa', districtHi: 'रीवा', districtEn: 'Rewa', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '486001' },
  { tehsilHi: 'सतना', tehsilEn: 'Satna', districtHi: 'सतना', districtEn: 'Satna', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '485001' },
  { tehsilHi: 'होशंगाबाद', tehsilEn: 'Hoshangabad', districtHi: 'नर्मदापुरम', districtEn: 'Narmadapuram', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '461001' },
  { tehsilHi: 'इटारसी', tehsilEn: 'Itarsi', districtHi: 'नर्मदापुरम', districtEn: 'Narmadapuram', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '461111' },
  { tehsilHi: 'खंडवा', tehsilEn: 'Khandwa', districtHi: 'खंडवा', districtEn: 'Khandwa', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '450001' },
  { tehsilHi: 'खरगोन', tehsilEn: 'Khargone', districtHi: 'खरगोन', districtEn: 'Khargone', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '451001' },
  { tehsilHi: 'बड़वानी', tehsilEn: 'Barwani', districtHi: 'बड़वानी', districtEn: 'Barwani', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '451551' },
  { tehsilHi: 'झाबुआ', tehsilEn: 'Jhabua', districtHi: 'झाबुआ', districtEn: 'Jhabua', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', defaultPin: '457661' },

  // Rajasthan, Gujarat, UP, MH, Metros
  { tehsilHi: 'जयपुर', tehsilEn: 'Jaipur', districtHi: 'जयपुर', districtEn: 'Jaipur', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '302001' },
  { tehsilHi: 'जोधपुर', tehsilEn: 'Jodhpur', districtHi: 'जोधपुर', districtEn: 'Jodhpur', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '342001' },
  { tehsilHi: 'उदयपुर', tehsilEn: 'Udaipur', districtHi: 'उदयपुर', districtEn: 'Udaipur', stateHi: 'राजस्थान', stateEn: 'Rajasthan', defaultPin: '313001' },
  { tehsilHi: 'अहमदाबाद', tehsilEn: 'Ahmedabad', districtHi: 'अहमदाबाद', districtEn: 'Ahmedabad', stateHi: 'गुजरात', stateEn: 'Gujarat', defaultPin: '380001' },
  { tehsilHi: 'सूरत', tehsilEn: 'Surat', districtHi: 'सूरत', districtEn: 'Surat', stateHi: 'गुजरात', stateEn: 'Gujarat', defaultPin: '395001' },
  { tehsilHi: 'वडोदरा', tehsilEn: 'Vadodara', districtHi: 'वडोदरा', districtEn: 'Vadodara', stateHi: 'गुजरात', stateEn: 'Gujarat', defaultPin: '390001' },
  { tehsilHi: 'मुंबई', tehsilEn: 'Mumbai', districtHi: 'मुंबई', districtEn: 'Mumbai', stateHi: 'महाराष्ट्र', stateEn: 'Maharashtra', defaultPin: '400001' },
  { tehsilHi: 'पुणे', tehsilEn: 'Pune', districtHi: 'पुणे', districtEn: 'Pune', stateHi: 'महाराष्ट्र', stateEn: 'Maharashtra', defaultPin: '411001' },
  { tehsilHi: 'नागपुर', tehsilEn: 'Nagpur', districtHi: 'नागपुर', districtEn: 'Nagpur', stateHi: 'महाराष्ट्र', stateEn: 'Maharashtra', defaultPin: '440001' },
  { tehsilHi: 'लखनऊ', tehsilEn: 'Lucknow', districtHi: 'लखनऊ', districtEn: 'Lucknow', stateHi: 'उत्तर प्रदेश', stateEn: 'Uttar Pradesh', defaultPin: '226001' },
  { tehsilHi: 'कानपुर', tehsilEn: 'Kanpur', districtHi: 'कानपुर', districtEn: 'Kanpur', stateHi: 'उत्तर प्रदेश', stateEn: 'Uttar Pradesh', defaultPin: '208001' },
  { tehsilHi: 'आगरा', tehsilEn: 'Agra', districtHi: 'आगरा', districtEn: 'Agra', stateHi: 'उत्तर प्रदेश', stateEn: 'Uttar Pradesh', defaultPin: '282001' },
  { tehsilHi: 'दिल्ली', tehsilEn: 'Delhi', districtHi: 'नई दिल्ली', districtEn: 'New Delhi', stateHi: 'दिल्ली', stateEn: 'Delhi', defaultPin: '110001' },
  { tehsilHi: 'गुरुग्राम', tehsilEn: 'Gurugram', districtHi: 'गुरुग्राम', districtEn: 'Gurugram', stateHi: 'हरियाणा', stateEn: 'Haryana', defaultPin: '122001' },
];

/**
 * Prominent towns & suburban localities across MP & neighboring states
 */
export const PROMINENT_ALL_INDIA_TOWNS: Array<{
  nameHi: string;
  nameEn: string;
  tehsilHi: string;
  tehsilEn: string;
  districtHi: string;
  districtEn: string;
  stateHi: string;
  stateEn: string;
  pincode: string;
}> = [
  // Indore District Towns & Localities
  { nameHi: 'महू (Dr. Ambedkar Nagar)', nameEn: 'Mhow', tehsilHi: 'महू', tehsilEn: 'Mhow', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '453441' },
  { nameHi: 'मऊ छावनी', nameEn: 'Mhow Cantt', tehsilHi: 'महू', tehsilEn: 'Mhow', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '453441' },
  { nameHi: 'इंदौर शहर', nameEn: 'Indore City', tehsilHi: 'इंदौर', tehsilEn: 'Indore', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '452001' },
  { nameHi: 'राऊ', nameEn: 'Rau', tehsilHi: 'इंदौर', tehsilEn: 'Indore', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '453331' },
  { nameHi: 'सांवेर', nameEn: 'Sanwer', tehsilHi: 'सांवेर', tehsilEn: 'Sanwer', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '453551' },
  { nameHi: 'देपालपुर', nameEn: 'Depalpur', tehsilHi: 'देपालपुर', tehsilEn: 'Depalpur', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '453115' },
  { nameHi: 'हातोद', nameEn: 'Hatod', tehsilHi: 'हातोद', tehsilEn: 'Hatod', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '453111' },
  { nameHi: 'मानपुर', nameEn: 'Manpur', tehsilHi: 'महू', tehsilEn: 'Mhow', districtHi: 'इंदौर', districtEn: 'Indore', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '453661' },

  // Ujjain District Towns
  { nameHi: 'उज्जैन शहर', nameEn: 'Ujjain City', tehsilHi: 'उज्जैन', tehsilEn: 'Ujjain', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '456001' },
  { nameHi: 'नागदा', nameEn: 'Nagda', tehsilHi: 'नागदा', tehsilEn: 'Nagda', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '456335' },
  { nameHi: 'महिदपुर रोड', nameEn: 'Mahidpur Road', tehsilHi: 'महिदपुर', tehsilEn: 'Mahidpur', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '456440' },
  { nameHi: 'खाचरौद', nameEn: 'Khachrod', tehsilHi: 'खाचरौद', tehsilEn: 'Khachrod', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '456224' },
  { nameHi: 'बड़नगर', nameEn: 'Badnagar', tehsilHi: 'बड़नगर', tehsilEn: 'Badnagar', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '456771' },
  { nameHi: 'तराना', nameEn: 'Tarana', tehsilHi: 'तराना', tehsilEn: 'Tarana', districtHi: 'उज्जैन', districtEn: 'Ujjain', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '456665' },

  // Ratlam District Towns
  { nameHi: 'रतलाम शहर', nameEn: 'Ratlam City', tehsilHi: 'रतलाम', tehsilEn: 'Ratlam', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '457001' },
  { nameHi: 'जावरा', nameEn: 'Jaora', tehsilHi: 'जावरा', tehsilEn: 'Jaora', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '457226' },
  { nameHi: 'आलोट', nameEn: 'Alot', tehsilHi: 'आलोट', tehsilEn: 'Alot', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '457114' },
  { nameHi: 'सैलाना', nameEn: 'Sailana', tehsilHi: 'सैलाना', tehsilEn: 'Sailana', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '457550' },
  { nameHi: 'पिपलोदा', nameEn: 'Piploda', tehsilHi: 'पिपलोदा', tehsilEn: 'Piploda', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '457331' },

  // Neemuch District Towns
  { nameHi: 'नीमच शहर', nameEn: 'Neemuch City', tehsilHi: 'नीमच', tehsilEn: 'Neemuch', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '458441' },
  { nameHi: 'मनासा', nameEn: 'Manasa', tehsilHi: 'मनासा', tehsilEn: 'Manasa', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '458110' },
  { nameHi: 'कुकड़ेश्वर', nameEn: 'Kukdeshwar', tehsilHi: 'मनासा', tehsilEn: 'Manasa', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '458113' },
  { nameHi: 'जावद', nameEn: 'Jawad', tehsilHi: 'जावद', tehsilEn: 'Jawad', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '458220' },
  { nameHi: 'सिंगोली', nameEn: 'Singoli', tehsilHi: 'सिंगोली', tehsilEn: 'Singoli', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '458228' },
  { nameHi: 'रामपुरा', nameEn: 'Rampura', tehsilHi: 'रामपुरा', tehsilEn: 'Rampura', districtHi: 'नीमच', districtEn: 'Neemuch', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '458118' },

  // Mandsaur & Border Towns
  { nameHi: 'पिपलिया मंडी', nameEn: 'Piplia Mandi', tehsilHi: 'मल्हारगढ़', tehsilEn: 'Malhargarh', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '458667' },
  { nameHi: 'दलोदा', nameEn: 'Daloda', tehsilHi: 'दलोदा', tehsilEn: 'Daloda', districtHi: 'मंदसौर', districtEn: 'Mandsaur', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '458558' },
  { nameHi: 'ढोढर', nameEn: 'Dhodhar', tehsilHi: 'जावरा', tehsilEn: 'Jaora', districtHi: 'रतलाम', districtEn: 'Ratlam', stateHi: 'मध्यप्रदेश', stateEn: 'Madhya Pradesh', pincode: '457226' },
  { nameHi: 'भवानी मंडी', nameEn: 'Bhawani Mandi', tehsilHi: 'भवानी मंडी', tehsilEn: 'Bhawani Mandi', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', pincode: '326502' },
  { nameHi: 'चौमहला', nameEn: 'Chaumahla', tehsilHi: 'चौमहला', tehsilEn: 'Chaumahla', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', pincode: '326515' },
  { nameHi: 'डग', nameEn: 'Dag', tehsilHi: 'डग', tehsilEn: 'Dag', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', pincode: '326514' },
  { nameHi: 'सुनेल', nameEn: 'Sunel', tehsilHi: 'सुनेल', tehsilEn: 'Sunel', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', pincode: '326513' },
  { nameHi: 'पिड़ावा', nameEn: 'Pirawa', tehsilHi: 'पिड़ावा', tehsilEn: 'Pirawa', districtHi: 'झालावाड़', districtEn: 'Jhalawar', stateHi: 'राजस्थान', stateEn: 'Rajasthan', pincode: '326501' },
  { nameHi: 'रामगंजमंडी', nameEn: 'Ramganj Mandi', tehsilHi: 'रामगंजमंडी', tehsilEn: 'Ramganj Mandi', districtHi: 'कोटा', districtEn: 'Kota', stateHi: 'राजस्थान', stateEn: 'Rajasthan', pincode: '326519' },
  { nameHi: 'निम्बाहेड़ा', nameEn: 'Nimbahera', tehsilHi: 'निम्बाहेड़ा', tehsilEn: 'Nimbahera', districtHi: 'चित्तौड़गढ़', districtEn: 'Chittorgarh', stateHi: 'राजस्थान', stateEn: 'Rajasthan', pincode: '312601' },
];

/**
 * Searches India Post Official Directory API (All India villages, post offices, taluks)
 * With 0-cost public endpoint: https://api.postalpincode.in/postoffice/{query}
 */
export const searchIndiaPostOfficeApi = async (
  queryText: string,
  signal?: AbortSignal
): Promise<IndiaLocationSuggestion[]> => {
  const trimmed = (queryText || '').trim();
  if (!trimmed || trimmed.length < 2) return [];

  const latinQuery = transliterateHindiToLatin(trimmed);
  const clean = latinQuery.replace(/[^a-z0-9]/gi, '');
  if (!clean || clean.length < 2) return [];

  // Check cache first (0ms)
  if (memoryCache[clean]) {
    return memoryCache[clean];
  }

  // Handle special aliases: "mau" -> search "mhow" as well
  const searchTerms = clean === 'mau' ? ['mhow', 'mau'] : [clean];

  for (const term of searchTerms) {
    try {
      const url = `https://api.postalpincode.in/postoffice/${encodeURIComponent(term)}`;
      const response = await fetch(url, { signal });
      if (!response.ok) continue;

      const data = await response.json();
      if (!Array.isArray(data) || !data[0] || data[0].Status !== 'Success' || !Array.isArray(data[0].PostOffice)) {
        continue;
      }

      const seen = new Set<string>();
      const results: IndiaLocationSuggestion[] = [];

      for (const po of data[0].PostOffice) {
        const townName = po.Name || '';
        const talukName = po.Taluk && po.Taluk !== 'NA' ? po.Taluk : (po.Block && po.Block !== 'NA' ? po.Block : townName);
        const distName = po.District || '';
        const stateName = po.State || '';
        const pin = po.Pincode || '';

        const key = `${townName.toLowerCase()}-${distName.toLowerCase()}-${pin}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          villageOrTown: townName,
          villageOrTownEn: townName,
          tehsil: talukName,
          tehsilEn: talukName,
          district: distName,
          districtEn: distName,
          state: stateName,
          stateEn: stateName,
          pincode: pin,
          source: 'india_post',
        });

        if (results.length >= 8) break;
      }

      if (results.length > 0) {
        memoryCache[clean] = results;
        return results;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return [];
      console.warn('India Post API search skipped or failed:', err);
    }
  }

  return [];
};

/**
 * Intelligent All-India Village & Town Search
 * Merges:
 * 1. Local admin delivery directory (top priority with local km)
 * 2. In-memory national directory & towns (0ms instant response)
 * 3. India Post public API results (if available)
 */
export const getIntelligentAllIndiaLocationSuggestions = (
  queryText: string,
  tehsilContext?: string,
  localVillages?: VillageDeliveryEntry[],
  apiResults?: IndiaLocationSuggestion[],
  limit = 8
): IndiaLocationSuggestion[] => {
  const trimmed = (queryText || '').trim();
  if (!trimmed) return [];

  const qClean = normalizeLocationText(trimmed);
  const qPhonetic = normalizeFarmerHindi(trimmed);
  const qLatin = transliterateHindiToLatin(trimmed);

  const seenKeys = new Set<string>();
  const combined: Array<IndiaLocationSuggestion & { score: number }> = [];

  // 1. First priority: Search local delivery directory
  if (localVillages && localVillages.length > 0) {
    for (const v of localVillages) {
      const hiClean = normalizeLocationText(v.nameHi);
      const enClean = normalizeLocationText(v.nameEn);
      const hiPhonetic = normalizeFarmerHindi(v.nameHi);
      const enPhonetic = normalizeFarmerHindi(v.nameEn);

      let score = 0;
      if (hiClean === qClean || enClean === qClean || enClean.toLowerCase() === qLatin) score = 110;
      else if (hiPhonetic === qPhonetic || enPhonetic === qPhonetic) score = 100;
      else if (hiClean.startsWith(qClean) || enClean.startsWith(qClean) || enClean.toLowerCase().startsWith(qLatin)) score = 90;
      else if (hiPhonetic.startsWith(qPhonetic) || enPhonetic.startsWith(qPhonetic)) score = 85;
      else if (hiClean.includes(qClean) || enClean.includes(qClean)) score = 75;
      else {
        const dist = Math.min(
          levenshteinDistance(qPhonetic, hiPhonetic),
          levenshteinDistance(qPhonetic, enPhonetic)
        );
        const maxLen = Math.max(qPhonetic.length, hiPhonetic.length);
        const sim = (maxLen - dist) / maxLen;
        if (sim >= 0.55) score = sim * 65;
      }

      if (tehsilContext && v.tehsil && v.tehsil.toLowerCase().includes(tehsilContext.toLowerCase())) {
        score += 10;
      }

      if (score > 25) {
        const key = `${v.nameHi.toLowerCase()}-${v.tehsil?.toLowerCase() || ''}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combined.push({
            villageOrTown: v.nameHi,
            villageOrTownEn: v.nameEn,
            tehsil: v.tehsil,
            tehsilEn: v.tehsil,
            district: v.district,
            districtEn: v.district,
            state: 'मध्यप्रदेश',
            stateEn: 'Madhya Pradesh',
            pincode: v.pincode,
            source: 'local',
            distanceKm: v.distanceKm,
            score: score + 50, // Local boost
          });
        }
      }
    }
  }

  // 2. Second priority: In-memory towns & prominent localities (e.g. Mau / Mhow, Indore, etc.)
  for (const t of PROMINENT_ALL_INDIA_TOWNS) {
    const hiClean = normalizeLocationText(t.nameHi);
    const enClean = normalizeLocationText(t.nameEn);
    const hiPhonetic = normalizeFarmerHindi(t.nameHi);
    const enPhonetic = normalizeFarmerHindi(t.nameEn);

    let score = 0;
    if (hiClean === qClean || enClean === qClean || enClean.toLowerCase() === qLatin) score = 100;
    else if (hiPhonetic === qPhonetic || enPhonetic === qPhonetic) score = 95;
    else if (hiClean.startsWith(qClean) || enClean.startsWith(qClean) || enClean.toLowerCase().startsWith(qLatin)) score = 85;
    else if (hiPhonetic.startsWith(qPhonetic) || enPhonetic.startsWith(qPhonetic)) score = 80;
    else if (hiClean.includes(qClean) || enClean.includes(qClean)) score = 70;
    else {
      const dist = Math.min(
        levenshteinDistance(qPhonetic, hiPhonetic),
        levenshteinDistance(qPhonetic, enPhonetic)
      );
      const maxLen = Math.max(qPhonetic.length, hiPhonetic.length);
      const sim = (maxLen - dist) / maxLen;
      if (sim >= 0.55) score = sim * 60;
    }

    // Special Mau -> Mhow match bonus
    if ((qClean === 'mau' || qClean === 'मऊ' || qClean === 'महू') && t.nameEn.toLowerCase().includes('mhow')) {
      score = 98;
    }

    if (score > 25) {
      const key = `${t.nameHi.toLowerCase()}-${t.pincode}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        combined.push({
          villageOrTown: t.nameHi,
          villageOrTownEn: t.nameEn,
          tehsil: t.tehsilHi,
          tehsilEn: t.tehsilEn,
          district: t.districtHi,
          districtEn: t.districtEn,
          state: t.stateHi,
          stateEn: t.stateEn,
          pincode: t.pincode,
          source: 'national_directory',
          score,
        });
      }
    }
  }

  // 3. Third: Check prominent tehsils as town targets (e.g., "Indore", "Jaipur", "Ujjain")
  for (const th of PROMINENT_ALL_INDIA_TEHSILS) {
    const hiClean = normalizeLocationText(th.tehsilHi);
    const enClean = normalizeLocationText(th.tehsilEn);
    const hiPhonetic = normalizeFarmerHindi(th.tehsilHi);
    const enPhonetic = normalizeFarmerHindi(th.tehsilEn);

    let score = 0;
    if (hiClean === qClean || enClean === qClean || enClean.toLowerCase() === qLatin) score = 90;
    else if (hiPhonetic === qPhonetic || enPhonetic === qPhonetic) score = 85;
    else if (hiClean.startsWith(qClean) || enClean.startsWith(qClean) || enClean.toLowerCase().startsWith(qLatin)) score = 78;
    else if (hiClean.includes(qClean) || enClean.includes(qClean)) score = 65;

    if (score > 30) {
      const key = `${th.tehsilHi.toLowerCase()}-${th.defaultPin || ''}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        combined.push({
          villageOrTown: th.tehsilHi,
          villageOrTownEn: th.tehsilEn,
          tehsil: th.tehsilHi,
          tehsilEn: th.tehsilEn,
          district: th.districtHi,
          districtEn: th.districtEn,
          state: th.stateHi,
          stateEn: th.stateEn,
          pincode: th.defaultPin || '',
          source: 'national_directory',
          score,
        });
      }
    }
  }

  // 4. Fourth: Merge live India Post API results if provided
  if (apiResults && apiResults.length > 0) {
    for (const po of apiResults) {
      const key = `${po.villageOrTown.toLowerCase()}-${po.pincode}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        combined.push({
          ...po,
          score: 60,
        });
      }
    }
  }

  return combined
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...rest }) => rest);
};

/**
 * Intelligent All-India Tehsil Suggestions
 * Merges local tehsils (with village count) with all-India tehsils (Indore, Mhow, Ujjain, Bhopal, etc.)
 */
export const getIntelligentAllIndiaTehsilSuggestions = (
  queryText: string,
  localVillages?: VillageDeliveryEntry[],
  limit = 8
): IndiaTehsilSuggestion[] => {
  const trimmed = (queryText || '').trim();
  const qClean = normalizeLocationText(trimmed);
  const qPhonetic = normalizeFarmerHindi(trimmed);
  const qLatin = transliterateHindiToLatin(trimmed);

  // Local directory tehsils
  const localStats = getAllTehsilsFromDirectory(localVillages).filter(t => t.tehsil && t.tehsil !== 'अन्य');
  const localMap = new Map<string, number>();
  localStats.forEach(s => localMap.set(s.tehsil, s.total));

  const seen = new Set<string>();
  const scored: Array<IndiaTehsilSuggestion & { score: number }> = [];

  // Evaluate All-India Tehsils
  for (const item of PROMINENT_ALL_INDIA_TEHSILS) {
    const isLocal = Boolean(item.isLocalHub || localMap.has(item.tehsilHi));
    const vCount = localMap.get(item.tehsilHi) || 0;

    const hiClean = normalizeLocationText(item.tehsilHi);
    const enClean = normalizeLocationText(item.tehsilEn);
    const hiPhonetic = normalizeFarmerHindi(item.tehsilHi);
    const enPhonetic = normalizeFarmerHindi(item.tehsilEn);

    let score = 0;
    if (!trimmed) {
      score = isLocal ? 90 + vCount : 40;
    } else {
      if (hiClean === qClean || enClean === qClean || enClean.toLowerCase() === qLatin) score = 100;
      else if (hiPhonetic === qPhonetic || enPhonetic === qPhonetic) score = 95;
      else if (hiClean.startsWith(qClean) || enClean.startsWith(qClean) || enClean.toLowerCase().startsWith(qLatin)) score = 85;
      else if (hiPhonetic.startsWith(qPhonetic) || enPhonetic.startsWith(qPhonetic)) score = 80;
      else if (hiClean.includes(qClean) || enClean.includes(qClean)) score = 70;
      else if (hiPhonetic.includes(qPhonetic) || enPhonetic.includes(qPhonetic)) score = 65;
      else {
        const dist = Math.min(
          levenshteinDistance(qPhonetic, hiPhonetic),
          levenshteinDistance(qPhonetic, enPhonetic)
        );
        const maxLen = Math.max(qPhonetic.length, hiPhonetic.length);
        const sim = (maxLen - dist) / maxLen;
        if (sim >= 0.55) score = sim * 60;
      }

      if (isLocal) score += 20; // Boost local tehsils
    }

    if (score > 25) {
      if (!seen.has(item.tehsilHi)) {
        seen.add(item.tehsilHi);
        scored.push({
          nameHi: item.tehsilHi,
          nameEn: item.tehsilEn,
          districtHi: item.districtHi,
          districtEn: item.districtEn,
          stateHi: item.stateHi,
          stateEn: item.stateEn,
          defaultPin: item.defaultPin,
          villageCount: vCount,
          isLocal,
          score,
        });
      }
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...rest }) => rest);
};

/**
 * Looks up detailed location by 6-digit Pincode from India Post API
 */
export async function fetchPincodeDetailsFromApi(pincode: string): Promise<{
  district?: string;
  state?: string;
  tehsil?: string;
  villages?: string[];
} | null> {
  const cleanPin = (pincode || '').replace(/\D/g, '');
  if (cleanPin.length !== 6) return null;

  if (pincodeCache[cleanPin]) {
    return pincodeCache[cleanPin];
  }

  try {
    const url = `https://api.postalpincode.in/pincode/${cleanPin}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || !data[0] || data[0].Status !== 'Success' || !Array.isArray(data[0].PostOffice)) {
      return null;
    }

    const first = data[0].PostOffice[0];
    const villages = data[0].PostOffice.map((po: any) => po.Name).filter(Boolean);

    const result = {
      district: first.District || undefined,
      state: first.State || undefined,
      tehsil: first.Taluk && first.Taluk !== 'NA' ? first.Taluk : (first.Block && first.Block !== 'NA' ? first.Block : undefined),
      villages: villages.slice(0, 10),
    };

    pincodeCache[cleanPin] = result;
    return result;
  } catch (err) {
    console.warn('Pincode API lookup error:', err);
    return null;
  }
};
