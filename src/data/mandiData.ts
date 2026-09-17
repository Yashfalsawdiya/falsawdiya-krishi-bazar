export type MandiSourceType = 'govt' | 'mandipulse' | 'market_report' | 'estimated';

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
  sourceType?: MandiSourceType;
  sourceName?: string;
  sourceDate?: string;
  fetchedAt?: string;
  isLive?: boolean;
  isEstimated?: boolean;
  statusMessage?: string;
}

export interface StateMandiMap {
  [state: string]: {
    [district: string]: string[];
  };
}

export const STATE_MANDI_DATA: StateMandiMap = {
  "मध्यप्रदेश (Madhya Pradesh)": {
    "मंदसौर (Mandsaur)": ["शामगढ़ (Shamgarh)", "गरोठ (Garoth)", "सीतामऊ (Sitamau)", "मंदसौर (Mandsaur)", "पिपलिया (Pipliya)", "सुवासरा (Suwasra)"],
    "नीमच (Neemuch)": ["नीमच (Neemuch)", "जावद (Jawad)", "मनासा (Manasa)"],
    "रतलाम (Ratlam)": ["रतलाम (Ratlam)", "जावरा (Jaora)", "सैलाना (Sailana)", "आलोट (Alot)"],
    "इंदौर (Indore)": ["इंदौर (Indore)", "महू (Mhow)", "सांवेर (Sanwer)"],
    "उज्जैन (Ujjain)": ["उज्जैन (Ujjain)", "बड़नगर (Badnagar)", "खाचरौद (Khachrod)", "महिदपुर (Mahidpur)"],
    "देवास (Dewas)": ["देवास (Dewas)", "सोनकच्छ (Sonkatch)", "हाटपिपल्या (Hatpipliya)"],
    "धार (Dhar)": ["धार (Dhar)", "बदनावर (Badnawar)", "धामनोद (Dhamnod)"],
    "सीहोर (Sehore)": ["सीहोर (Sehore)", "आष्टा (Ashta)", "इछावर (Ichhawar)"],
    "गुना (Guna)": ["गुना (Guna)", "आरोन (Aaron)", "राघौगढ़ (Raghogarh)"],
    "शाजापुर (Shajapur)": ["शाजापुर (Shajapur)", "शुजालपुर (Shujalpur)", "अकोदिया (Akodiya)"],
    "विदिशा (Vidisha)": ["विदिशा (Vidisha)", "गंजबासौदा (Ganjbasoda)", "सिरोंज (Sironj)"],
    "हरदा (Harda)": ["हरदा (Harda)", "खिरकिया (Khirkiya)", "टिमरनी (Timarni)"]
  },
  "राजस्थान (Rajasthan)": {
    "प्रतापगढ़ (Pratapgarh)": ["प्रतापगढ़ (Pratapgarh)", "छोटी सादड़ी (Chhoti Sadri)"],
    "कोटा (Kota)": ["कोटा (Kota)", "रामगंज मंडी (Ramganj Mandi)", "इटावा (Itawa)"],
    "झालावाड़ (Jhalawar)": ["झालावाड़ (Jhalawar)", "भवानी मंडी (Bhawani Mandi)", "खानपुर (Khanpur)"],
    "बारां (Baran)": ["बारां (Baran)", "अटरू (Atru)", "छबड़ा (Chhabra)"],
    "चित्तौड़गढ़ (Chittorgarh)": ["चित्तौड़गढ़ (Chittorgarh)", "कपासन (Kapasan)", "निम्बाहेड़ा (Nimbahera)", "बेंगू (Begun)"],
    "जयपुर (Jaipur)": ["जयपुर (Jaipur)", "चोमू (Chomu)", "चाकसू (Chaksu)"],
    "जोधपुर (Jodhpur)": ["जोधपुर (Jodhpur)", "फलोदी (Phalodi)", "पीपाड़ (Pipar)"],
    "श्रीगंगानगर (Sri Ganganagar)": ["श्रीगंगानगर (Sri Ganganagar)", "सूरतगढ़ (Suratgarh)", "रायसिंहनगर (Raisinghnagar)"],
    "अलवर (Alwar)": ["अलवर (Alwar)", "खैरथल (Khairthal)", "बहरोड़ (Behror)"],
    "बीकानेर (Bikaner)": ["बीकानेर (Bikaner)", "नोखा (Nokha)", "लूणकरणसर (Lunkaransar)"]
  },
  "उत्तर प्रदेश (Uttar Pradesh)": {
    "आगरा (Agra)": ["आगरा (Agra)", "फतेहाबाद (Fatehabad)", "अछनेरा (Achnera)"],
    "झांसी (Jhansi)": ["झांसी (Jhansi)", "मऊरानीपुर (Mauranipur)", "बरुआसागर (Baruasagar)"],
    "कानपुर (Kanpur)": ["कानपुर नगर (Kanpur Nagar)", "चौबेपुर (Chaubepur)", "घाटमपुर (Ghatampur)"],
    "मथुरा (Mathura)": ["मथुरा (Mathura)", "कोसीकलां (Kosi Kalan)"],
    "वाराणसी (Varanasi)": ["वाराणसी (Varanasi)", "रोहनिया (Rohaniya)"],
    "बरेली (Bareilly)": ["बरेली (Bareilly)", "बहेड़ी (Baheri)", "आंवला (Aonla)"],
    "मेरठ (Meerut)": ["मेरठ (Meerut)", "मवाना (Mawana)", "सरधना (Sardhana)"],
    "अलीगढ़ (Aligarh)": ["अलीगढ़ (Aligarh)", "अतरौली (Atrauli)", "इगलास (Iglas)"],
    "गोरखपुर (Gorakhpur)": ["गोरखपुर (Gorakhpur)", "सहजनवा (Sahjanwa)"],
    "ललितपुर (Lalitpur)": ["ललितपुर (Lalitpur)", "महरौनी (Mehroni)"]
  },
  "महाराष्ट्र (Maharashtra)": {
    "नाशिक (Nashik)": ["लासलगांव (Lasalgaon)", "पिंपलगांव (Pipalgaon)", "मनमाड (Manmad)", "येवला (Yeola)"],
    "पुणे (Pune)": ["पुणे (Pune)", "मंचर (Manchar)", "बारामती (Baramati)", "जुन्नर (Junnar)"],
    "नागपुर (Nagpur)": ["नागपुर (Nagpur)", "कलमेश्वर (Kalmeshwar)", "काटोल (Katol)"],
    "अमरावती (Amravati)": ["अमरावती (Amravati)", "अचलपुर (Achalpur)", "धामणगांव (Dhamangaon)"],
    "जलगांव (Jalgaon)": ["जलगांव (Jalgaon)", "भुसावल (Bhusawal)", "चालीसगांव (Chalisgaon)"],
    "अहमदनगर (Ahmednagar)": ["अहमदनगर (Ahmednagar)", "राहुरी (Rahuri)", "कोपरगांव (Kopargaon)"],
    "लातूर (Latur)": ["लातूर (Latur)", "उदगीर (Udgir)", "अहमदपुर (Ahmedpur)"],
    "सोलापूर (Solapur)": ["सोलापूर (Solapur)", "पंढरपुर (Pandharpur)", "बार्शी (Barshi)"]
  },
  "गुजरात (Gujarat)": {
    "राजकोट (Rajkot)": ["राजकोट (Rajkot)", "गोंडल (Gondal)", "जेतपुर (Jetpur)"],
    "महेसाणा (Mehsana)": ["उंझा (Unjha)", "विसनगर (Visnagar)", "कड़ी (Kadi)"],
    "जूनागढ़ (Junagadh)": ["जूनागढ़ (Junagadh)", "केशोद (Keshod)", "विसावदर (Visavadar)"],
    "अमरेली (Amreli)": ["अमरेली (Amreli)", "सावरकुंडला (Savarkundla)", "बगसरा (Bagasara)"],
    "अहमदाबाद (Ahmedabad)": ["अहमदाबाद (Ahmedabad)", "विरमगाम (Viramgam)", "साणंद (Sanand)"],
    "सूरत (Surat)": ["सूरत (Surat)", "बारडोली (Bardoli)"],
    "बनासकांठा (Banaskantha)": ["डीसा (Deesa)", "पालनपुर (Palanpur)", "थराद (Tharad)"]
  },
  "पंजाब (Punjab)": {
    "लुधियाना (Ludhiana)": ["लुधियाना (Ludhiana)", "खन्ना (Khanna)", "जgraon (Jagraon)"],
    "अमृतसर (Amritsar)": ["अमृतसर (Amritsar)", "राय्या (Rayya)", "मजीठा (Majitha)"],
    "फाजिल्का (Fazilka)": ["अबोहर (Abohar)", "फाजिल्का (Fazilka)", "जलालाबाद (Jalalabad)"],
    "पटियाला (Patiala)": ["पटियाला (Patiala)", "नाभा (Nabha)", "राजपुरा (Rajpura)"],
    "बठिंडा (Bathinda)": ["बठिंडा (Bathinda)", "रामपुरा फूल (Rampura Phul)", "मौड़ (Maur)"],
    "होशियारपुर (Hoshiarpur)": ["होशियारपुर (Hoshiarpur)", "मुकेरियां (Mukerian)"]
  },
  "हरियाणा (Haryana)": {
    "हिसार (Hisar)": ["हिसार (Hisar)", "आदमपुर (Adampur)", "हांसी (Hansi)", "बरवाला (Barwala)"],
    "करनाल (Karnal)": ["करनाल (Karnal)", "घरौंडा (Gharaunda)", "असंध (Assandh)", "तरावड़ी (Taraori)"],
    "सिरसा (Sirsa)": ["सिरसा (Sirsa)", "ऐलनाबाद (Ellenabad)", "डबवाली (Dabwali)"],
    "कुरुक्षेत्र (Kurukshetra)": ["कुरुक्षेत्र (Kurukshetra)", "थानेसर (Thanesar)", "शाहाबाद (Shahbad)", "लाडवा (Ladwa)"],
    "रोहतक (Rohtak)": ["रोहतक (Rohtak)", "सांपला (Sampla)"],
    "फतेहाबाद (Fatehabad)": ["फतेहाबाद (Fatehabad)", "टोहाना (Tohana)", "रतिया (Ratia)"]
  },
  "बिहार (Bihar)": {
    "पटना (Patna)": ["पटना (Patna)", "दानापुर (Danapur)", "मोकामा (Mokama)", "फतुहा (Fatuha)"],
    "मुजफ्फरपुर (Muzaffarpur)": ["मुजफ्फरपुर (Muzaffarpur)", "मोतीपुर (Motipur)"],
    "भागलपुर (Bhagalpur)": ["भागलपुर (Bhagalpur)", "नवगछिया (Naugachia)"],
    "गया (Gaya)": ["गया (Gaya)", "शेरघाटी (Sherghati)"],
    "भोजपुर (Bhojpur)": ["आरा (Aarah)", "बिहिया (Bihiya)"]
  },
  "छत्तीसगढ़ (Chhattisgarh)": {
    "रायपुर (Raipur)": ["रायपुर (Raipur)", "अभनपुर (Abhanpur)", "तिल्दा (Tilda)"],
    "धमतरी (Dhamtari)": ["धमतरी (Dhamtari)", "कुरूद (Kurud)", "आमदी (Aamdi)"],
    "बिलासपुर (Bilaspur)": ["बिलासपुर (Bilaspur)", "तखतपुर (Takhatpur)", "बिल्हा (Bilha)"],
    "राजनांदगांव (Rajnandgaon)": ["राजनांदगांव (Rajnandgaon)", "डोंगरगढ़ (Dongargarh)"]
  },
  "कर्नाटक (Karnataka)": {
    "बेंगलुरु (Bengaluru)": ["बेंगलुरु (Bengaluru)", "यशवंतपुर (Yeshwanthpur)", "बिनिपेट (Binny Mill)"],
    "धारवाड़ (Dharwad)": ["हुबली (Hubli)", "धारवाड़ (Dharwad)"],
    "बेलगाम (Belgaum)": ["बेलगाम (Belgaum)", "बैलहोंगल (Bailhongal)", "चिक्कोडी (Chikkodi)"],
    "मैसूर (Mysore)": ["मैसूर (Mysore)", "नंजनगुड (Nanjangud)"],
    "शिमोगा (Shimoga)": ["शिमोगा (Shimoga)", "सागर (Sagar)"]
  },
  "आंध्र प्रदेश (Andhra Pradesh)": {
    "गुंटूर (Guntur)": ["गुंटूर (Guntur)", "तेनाली (Tenali)", "मिर्यालगुडा (Miryalaguda)"],
    "कृष्णा (Krishna)": ["विजयवाड़ा (Vijayawada)", "मछलीपट्टनम (Machilipatnam)"],
    "कुरनूल (Kurnool)": ["कुरनूल (Kurnool)", "अदोनी (Adoni)", "नंद्याल (Nandyal)"],
    "पश्चिम गोदावरी (West Godavari)": ["एलुरु (Eluru)", "ताड़ेपल्लीगुडेम (Tadepalligudem)", "अचंता (Achanta)"]
  },
  "तेलंगाना (Telangana)": {
    "वारंगल (Warangal)": ["वारंगल (Warangal)", "जंगांव (Jangaon)"],
    "निजामाबाद (Nizamabad)": ["निजामाबाद (Nizamabad)", "बोधन (Bodhan)", "आर्मूर (Armoor)"],
    "खम्मम (Khammam)": ["खम्मम (Khammam)", "मधिरा (Madhira)"],
    "महबूबनगर (Mahbubnagar)": ["महबूबनगर (Mahbubnagar)", "जडचेरला (Jadcherla)", "अचंपेट (Achampet)"]
  },
  "पश्चिम बंगाल (West Bengal)": {
    "कोलकाता (Kolkata)": ["कोलकाता (Kolkata)", "सीलदह (Sealdah)", "मेचुवा (Mechua)"],
    "हुगली (Hooghly)": ["शेवड़ाफुली (Sheoraphuli)", "तारकेश्वर (Tarakeswar)"],
    "बांकुड़ा (Bankura)": ["बांकुड़ा (Bankura)", "खतरा (Khatra)", "बिष्णुपुर (Bishnupur)"],
    "बर्दवान (Burdwan)": ["बर्दवान (Burdwan)", "मेमारी (Memari)", "कालना (Kalna)"]
  },
  "ओडिशा (Odisha)": {
    "कटक (Cuttack)": ["कटक (Cuttack)", "बांकी (Banki)"],
    "संबलपुर (Sambalpur)": ["संबलपुर (Sambalpur)", "बरगढ़ (Bargarh)"],
    "पुरी (Puri)": ["पुरी (Puri)", "पिपिली (Pipili)"],
    "बालासोर (Balasore)": ["बालासोर (Balasore)", "जलेश्वर (Jaleswar)"]
  },
  "तमिलनाडु (Tamil Nadu)": {
    "चेन्नई (Chennai)": ["कोयम्बेडु (Koyambedu)", "तिरुवल्लूर (Tiruvallur)"],
    "कोयंबटूर (Coimbatore)": ["कोयंबटूर (Coimbatore)", "पोलाची (Pollachi)"],
    "मदुरै (Madurai)": ["मदुरै (Madurai)", "अन्ना नगर (Anna Nagar)"],
    "डिंडीगुल (Dindigul)": ["डिंडीगुल (Dindigul)", "पलानी (Palani)"]
  },
  "केरल (Kerala)": {
    "एर्नाकुलम (Ernakulam)": ["कोच्चि (Kochi)", "अलुवा (Aluva)", "उत्तरी पारावुर (North Paravur)"],
    "कोझिकोड (Kozhikode)": ["कोझिकोड (Kozhikode)", "क्विंडी (Quilandy)"],
    "तिरुवनंतपुरम (Thiruvananthapuram)": ["तिरुवनंतपुरम (Thiruvananthapuram)", "नेय्यत्तिनकरा (Neyyattinkara)"]
  },
  "हिमाचल प्रदेश (Himachal Pradesh)": {
    "शिमला (Shimla)": ["ढली (Dhalli)", "रोहड़ू (Rohru)", "रामपुर (Rampur)"],
    "कुल्लू (Kullu)": ["कुल्लू (Kullu)", "भुंतर (Bhuntar)"],
    "सोलन (Solan)": ["सोलन (Solan)", "परवाणू (Parwanoo)"]
  },
  "उत्तराखंड (Uttarakhand)": {
    "देहरादून (Dehradun)": ["देहरादून (Dehradun)", "ऋषिकेश (Rishikesh)"],
    "उधम सिंह नगर (Udham Singh Nagar)": ["रुद्रपुर (Rudrapur)", "काशीपुर (Kashipur)", "किच्छा (Kichha)"],
    "हरिद्वार (Haridwar)": ["हरिद्वार (Haridwar)", "रुड़की (Roorkee)"]
  },
  "झारखंड (Jharkhand)": {
    "रांची (Ranchi)": ["रांची (Ranchi)", "पंडरा (Pandra)"],
    "धनबाद (Dhanbad)": ["धनबाद (Dhanbad)", "बरवाअड्डा (Barwadda)"],
    "जमशेदपुर (Jamshedpur)": ["जमशेदपुर (Jamshedpur)", "घाटशिला (Ghatshila)"]
  },
  "असम (Assam)": {
    "कामरूप (Kamrup)": ["गुवाहाटी (Guwahati)", "पामोही (Pamohi)"],
    "नागांव (Nagaon)": ["नागांव (Nagaon)", "ढािंग (Dhing)"],
    "सोनितपुर (Sonitpur)": ["तेजपुर (Tezpur)", "ढेकिआझुली (Dhekiajuli)"]
  },
  "दिल्ली (Delhi / NCR)": {
    "नई दिल्ली (New Delhi)": ["आजादपुर (Azadpur)", "गाजीपुर (Ghazipur)", "ओखला (Okhla)", "नजफगढ़ (Najafgarh)"]
  },
  "जम्मू और कश्मीर (Jammu and Kashmir)": {
    "जम्मू (Jammu)": ["जम्मू (Jammu)", "नरवाल (Narwal)"],
    "श्रीनगर (Srinagar)": ["श्रीनगर (Srinagar)", "पारिम्पोरा (Parimpora)"],
    "सोपोर (Sopore)": ["सोपोर फल मंडी (Sopore Fruit Mandi)"]
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
    items,
    sourceType: 'estimated',
    sourceName: 'आधार अनुमानित भाव (लाइव सर्वर डेटा अनुपलब्ध)',
    sourceDate: 'गणना आधारित सांकेतिक',
    fetchedAt: `${dateStr} ${timeStr}`,
    isLive: false,
    isEstimated: true,
    statusMessage: 'लाइव सरकारी व स्थानीय रिपोर्ट अनुपलब्ध होने पर अनुमानित सांकेतिक भाव प्रदर्शित हैं। यह वास्तविक सरकारी डेटा नहीं है।'
  };
}
