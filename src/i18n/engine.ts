import { LanguageCode, TRANSLATIONS, PHRASE_MAP } from './translations';

/**
 * Falsawdiya Krishi Bazaar - In-App Self-Contained Translation Engine
 * 100% Client-Side, Zero External Dependency, Zero Google/Chrome Scripts.
 * Handles domain-specific agricultural terms, mandi bhav, news, schemes, 
 * policies, products, and universal dynamic content.
 */

// Comprehensive Agricultural, Mandi, Schemes, Legal, and Common Dictionary
export const IN_APP_DICTIONARY: Record<string, { hi: string; en: string }> = {
  // Brand & Store Identity
  'फल्सावदिया कृषि बाजार': { hi: 'फल्सावदिया कृषि बाजार', en: 'Falsawdiya Krishi Bazaar' },
  'किसान का भरोसा, हमारी पहचान': { hi: 'किसान का भरोसा, हमारी पहचान', en: "Farmer's Trust, Our Identity" },
  'कृषि बाजार': { hi: 'कृषि बाजार', en: 'Krishi Bazaar' },
  'मंडी भाव': { hi: 'मंडी भाव', en: 'Mandi Bhav' },
  'कृषि समाचार': { hi: 'कृषि समाचार', en: 'Agri News' },
  'सरकारी योजनाएं': { hi: 'सरकारी योजनाएं', en: 'Govt Schemes' },
  'सरकारी योजनाएँ': { hi: 'सरकारी योजनाएँ', en: 'Govt Schemes' },
  'फसल डॉक्टर': { hi: 'फसल डॉक्टर', en: 'Crop Doctor' },
  'रोग पहचान': { hi: 'रोग पहचान', en: 'Disease Detection' },
  'कृषि सलाहकार': { hi: 'कृषि सलाहकार', en: 'Agri Advisor' },
  'मृदा परीक्षण': { hi: 'मृदा परीक्षण', en: 'Soil Testing' },
  'खाद कैलकुलेटर': { hi: 'खाद कैलकुलेटर', en: 'Fertilizer Calculator' },
  'मौसम पूर्वानुमान': { hi: 'मौसम पूर्वानुमान', en: 'Weather Forecast' },
  'कृषि ज्ञानकोश': { hi: 'कृषि ज्ञानकोश', en: 'Agri Encyclopedia' },

  // Legal & Policy Titles & Headings
  'नियम एवं शर्तें': { hi: 'नियम एवं शर्तें', en: 'Terms & Conditions' },
  'नियम और शर्तें': { hi: 'नियम और शर्तें', en: 'Terms and Conditions' },
  'गोपनीयता नीति': { hi: 'गोपनीयता नीति', en: 'Privacy Policy' },
  'वापसी, रिफंड एवं रद्दीकरण नीति': { hi: 'वापसी, रिफंड एवं रद्दीकरण नीति', en: 'Return, Refund & Cancellation Policy' },
  'शिपिंग एवं डिलीवरी नीति': { hi: 'शिपिंग एवं डिलीवरी नीति', en: 'Shipping & Delivery Policy' },
  'शिकायत निवारण नीति': { hi: 'शिकायत निवारण नीति', en: 'Grievance Redressal Policy' },
  'शिकायत निवारण': { hi: 'शिकायत निवारण', en: 'Grievance Redressal' },
  'लाइसेंसिंग एवं अस्वीकरण': { hi: 'लाइसेंसिंग एवं अस्वीकरण', en: 'Licensing & Disclaimers' },
  'एआई अस्वीकरण': { hi: 'एआई अस्वीकरण', en: 'AI Disclaimer' },
  'रासायनिक सुरक्षा मार्गदर्शिका': { hi: 'रासायनिक सुरक्षा मार्गदर्शिका', en: 'Chemical Safety Guide' },
  'हमारे बारे में': { hi: 'हमारे बारे में', en: 'About Us' },
  'संपर्क करें': { hi: 'संपर्क करें', en: 'Contact Us' },
  'सहायता एवं एफएक्यू': { hi: 'सहायता एवं एफएक्यू', en: 'Help & FAQ' },
  'हेल्पलाइन': { hi: 'हेल्पलाइन', en: 'Helpline' },
  'सभी अधिकार सुरक्षित': { hi: 'सभी अधिकार सुरक्षित', en: 'All Rights Reserved' },
  'अंतिम अपडेट': { hi: 'अंतिम अपडेट', en: 'Last Updated' },

  // Mandi Terminology
  'दैनिक मंडी भाव': { hi: 'दैनिक मंडी भाव', en: 'Daily Mandi Rates' },
  'न्यूनतम मूल्य': { hi: 'न्यूनतम मूल्य', en: 'Minimum Price' },
  'अधिकतम मूल्य': { hi: 'अधिकतम मूल्य', en: 'Maximum Price' },
  'मॉडल मूल्य': { hi: 'मॉडल मूल्य', en: 'Modal Price' },
  'मॉडल भाव': { hi: 'मॉडल भाव', en: 'Modal Rate' },
  'औसत भाव': { hi: 'औसत भाव', en: 'Average Rate' },
  'न्यूनतम': { hi: 'न्यूनतम', en: 'Min' },
  'अधिकतम': { hi: 'अधिकतम', en: 'Max' },
  'मॉडल': { hi: 'मॉडल', en: 'Modal' },
  'आवक (बोरी)': { hi: 'आवक (बोरी)', en: 'Arrival (Bags)' },
  'कुल आवक': { hi: 'कुल आवक', en: 'Total Arrival' },
  'दैनिक आवक': { hi: 'दैनिक आवक', en: 'Daily Arrival' },
  'रुपये प्रति क्विंटल': { hi: 'रुपये प्रति क्विंटल', en: 'Rs per Quintal' },
  'रुपये / क्विंटल': { hi: 'रुपये / क्विंटल', en: '₹ / Quintal' },
  'रु/क्विंटल': { hi: 'रु/क्विंटल', en: '₹/Qtl' },
  'मंडी बंद है': { hi: 'मंडी बंद है', en: 'Mandi is Closed' },
  'मंडी खुली है': { hi: 'मंडी खुली है', en: 'Mandi is Open' },
  'भाव में तेजी': { hi: 'भाव में तेजी', en: 'Rate Upward' },
  'भाव में मंदी': { hi: 'भाव में मंदी', en: 'Rate Downward' },
  'भाव स्थिर': { hi: 'भाव स्थिर', en: 'Rate Steady' },
  'तेजी': { hi: 'तेजी', en: 'Bullish' },
  'मंदी': { hi: 'मंदी', en: 'Bearish' },
  'स्थिर': { hi: 'स्थिर', en: 'Stable' },
  'सर्वोत्तम': { hi: 'सर्वोत्तम', en: 'Best / Super' },
  'मध्यम': { hi: 'मध्यम', en: 'Medium' },
  'सामान्य': { hi: 'सामान्य', en: 'General / Average' },
  'गुणवत्ता': { hi: 'गुणवत्ता', en: 'Quality' },
  'जिला': { hi: 'जिला', en: 'District' },
  'राज्य': { hi: 'राज्य', en: 'State' },
  'मंडी चुनें': { hi: 'मंडी चुनें', en: 'Select Mandi' },
  'फसल चुनें': { hi: 'फसल चुनें', en: 'Select Crop' },
  'सभी फसलें': { hi: 'सभी फसलें', en: 'All Crops' },
  'सभी मंडियां': { hi: 'सभी मंडियां', en: 'All Mandis' },
  'लाइव अपडेट': { hi: 'लाइव अपडेट', en: 'Live Update' },
  'सरकारी ई-मंडी पोर्टल': { hi: 'सरकारी ई-मंडी पोर्टल', en: 'Govt e-Mandi Portal' },

  // Agricultural Commodities (Crops)
  'सोयाबीन': { hi: 'सोयाबीन', en: 'Soybean' },
  'पीला सोयाबीन': { hi: 'पीला सोयाबीन', en: 'Yellow Soybean' },
  'गेहूं': { hi: 'गेहूं', en: 'Wheat' },
  'लोकवन गेहूं': { hi: 'लोकवन गेहूं', en: 'Lokwan Wheat' },
  'शरबती गेहूं': { hi: 'शरबती गेहूं', en: 'Sharbati Wheat' },
  'चना': { hi: 'चना', en: 'Gram / Chickpea' },
  'चना काबुली': { hi: 'चना काबुली', en: 'Kabuli Chickpea' },
  'चना देशी': { hi: 'चना देशी', en: 'Desi Gram' },
  'चना विशाल': { hi: 'चना विशाल', en: 'Vishal Gram' },
  'मक्का': { hi: 'मक्का', en: 'Maize / Corn' },
  'पीली मक्का': { hi: 'पीली मक्का', en: 'Yellow Maize' },
  'सफेद मक्का': { hi: 'सफेद मक्का', en: 'White Maize' },
  'लहसुन': { hi: 'लहसुन', en: 'Garlic' },
  'लहसुन देशी': { hi: 'लहसुन देशी', en: 'Desi Garlic' },
  'लहसुन ऊटी': { hi: 'लहसुन ऊटी', en: 'Ooty Garlic' },
  'लहसुन रियावन': { hi: 'लहसुन रियावन', en: 'Riyavan Garlic' },
  'लहसुन जी2': { hi: 'लहसुन जी2', en: 'G2 Garlic' },
  'प्याज': { hi: 'प्याज', en: 'Onion' },
  'लाल प्याज': { hi: 'लाल प्याज', en: 'Red Onion' },
  'सफेद प्याज': { hi: 'सफेद प्याज', en: 'White Onion' },
  'सरसों': { hi: 'सरसों', en: 'Mustard' },
  'काली सरसों': { hi: 'काली सरसों', en: 'Black Mustard' },
  'पीली सरसों': { hi: 'पीली सरसों', en: 'Yellow Mustard' },
  'रायडा': { hi: 'रायडा', en: 'Rayada / Mustard' },
  'मेथी': { hi: 'मेथी', en: 'Fenugreek' },
  'बारीक मेथी': { hi: 'बारीक मेथी', en: 'Fine Fenugreek' },
  'मेथी दाना': { hi: 'मेथी दाना', en: 'Fenugreek Seeds' },
  'ईसबगोल': { hi: 'ईसबगोल', en: 'Psyllium / Isabgol' },
  'धनिया': { hi: 'धनिया', en: 'Coriander' },
  'धनिया ईगल': { hi: 'धनिया ईगल', en: 'Eagle Coriander' },
  'धनिया बादामी': { hi: 'धनिया बादामी', en: 'Badami Coriander' },
  'धनिया ग्रीन': { hi: 'धनिया ग्रीन', en: 'Green Coriander' },
  'अलसी': { hi: 'अलसी', en: 'Flaxseed / Linseed' },
  'उड़द': { hi: 'उड़द', en: 'Black Gram / Urad' },
  'मूंग': { hi: 'मूंग', en: 'Green Gram / Moong' },
  'मसूर': { hi: 'मसूर', en: 'Lentil / Masoor' },
  'तुअर/अरहर': { hi: 'तुअर/अरहर', en: 'Pigeon Pea / Tur' },
  'कपास': { hi: 'कपास', en: 'Cotton' },
  'मूंगफली': { hi: 'मूंगफली', en: 'Groundnut / Peanut' },
  'अफीम/पोस्ता': { hi: 'अफीम/पोस्ता', en: 'Poppy Seeds / Posta' },
  'पोस्ता दाना': { hi: 'पोस्ता दाना', en: 'Poppy Seeds' },
  'अश्वगंधा': { hi: 'अश्वगंधा', en: 'Ashwagandha' },
  'कलौंजी': { hi: 'कलौंजी', en: 'Nigella / Kalonji' },
  'अजवाइन': { hi: 'अजवाइन', en: 'Carom Seeds / Ajwain' },
  'तारामीरा': { hi: 'तारामीरा', en: 'Taramira' },
  'तिल': { hi: 'तिल', en: 'Sesame' },
  'सफेद तिल': { hi: 'सफेद तिल', en: 'White Sesame' },
  'काला तिल': { hi: 'काला तिल', en: 'Black Sesame' },
  'बाजरा': { hi: 'बाजरा', en: 'Pearl Millet / Bajra' },
  'ज्वार': { hi: 'ज्वार', en: 'Sorghum / Jowar' },
  'धान/चावल': { hi: 'धान/चावल', en: 'Paddy / Rice' },
  'टमाटर': { hi: 'टमाटर', en: 'Tomato' },
  'आलू': { hi: 'आलू', en: 'Potato' },
  'हरी मिर्च': { hi: 'हरी मिर्च', en: 'Green Chilli' },
  'लाल मिर्च': { hi: 'लाल मिर्च', en: 'Red Chilli' },
  'अदरक': { hi: 'अदरक', en: 'Ginger' },

  // Mandis and Regions
  'शामगढ़ मंडी': { hi: 'शामगढ़ मंडी', en: 'Shamgarh Mandi' },
  'मंदसौर मंडी': { hi: 'मंदसौर मंडी', en: 'Mandsaur Mandi' },
  'नीमच मंडी': { hi: 'नीमच मंडी', en: 'Neemuch Mandi' },
  'रतलाम मंडी': { hi: 'रतलाम मंडी', en: 'Ratlam Mandi' },
  'उज्जैन मंडी': { hi: 'उज्जैन मंडी', en: 'Ujjain Mandi' },
  'इंदौर मंडी': { hi: 'इंदौर मंडी', en: 'Indore Mandi' },
  'सुवासरा मंडी': { hi: 'सुवासरा मंडी', en: 'Suwasra Mandi' },
  'गरोठ मंडी': { hi: 'गरोठ मंडी', en: 'Garoth Mandi' },
  'भानपुरा मंडी': { hi: 'भानपुरा मंडी', en: 'Bhanpura Mandi' },
  'पिपलिया मंडी': { hi: 'पिपलिया मंडी', en: 'Pipliya Mandi' },
  'दलोदा मंडी': { hi: 'दलोदा मंडी', en: 'Daloda Mandi' },
  'जावरा मंडी': { hi: 'जावरा मंडी', en: 'Jaora Mandi' },
  'कोटा मंडी': { hi: 'कोटा मंडी', en: 'Kota Mandi' },
  'झालावाड़ मंडी': { hi: 'झालावाड़ मंडी', en: 'Jhalawar Mandi' },
  'भवानी मंडी': { hi: 'भवानी मंडी', en: 'Bhawani Mandi' },
  'शामगढ़': { hi: 'शामगढ़', en: 'Shamgarh' },
  'मंदसौर': { hi: 'मंदसौर', en: 'Mandsaur' },
  'नीमच': { hi: 'नीमच', en: 'Neemuch' },
  'रतलाम': { hi: 'रतलाम', en: 'Ratlam' },
  'उज्जैन': { hi: 'उज्जैन', en: 'Ujjain' },
  'इंदौर': { hi: 'इंदौर', en: 'Indore' },
  'मध्य प्रदेश': { hi: 'मध्य प्रदेश', en: 'Madhya Pradesh' },
  'राजस्थान': { hi: 'राजस्थान', en: 'Rajasthan' },
  'महाराष्ट्र': { hi: 'महाराष्ट्र', en: 'Maharashtra' },
  'गुजरात': { hi: 'गुजरात', en: 'Gujarat' },
  'उत्तर प्रदेश': { hi: 'उत्तर प्रदेश', en: 'Uttar Pradesh' },

  // Agri Inputs & Products
  'कीटनाशक': { hi: 'कीटनाशक', en: 'Insecticides / Pesticides' },
  'फफूंदनाशक': { hi: 'फफूंदनाशक', en: 'Fungicides' },
  'खरपतवारनाशक': { hi: 'खरपतवारनाशक', en: 'Herbicides / Weedicides' },
  'उर्वरक': { hi: 'उर्वरक', en: 'Fertilizers' },
  'उर्वरक एवं पोषक तत्व': { hi: 'उर्वरक एवं पोषक तत्व', en: 'Fertilizers & Plant Nutrition' },
  'प्रमाणित बीज': { hi: 'प्रमाणित बीज', en: 'Certified Seeds' },
  'बीज': { hi: 'बीज', en: 'Seeds' },
  'कृषि उपकरण': { hi: 'कृषि उपकरण', en: 'Agricultural Implements' },
  'स्प्रेयर एवं उपकरण': { hi: 'स्प्रेयर एवं उपकरण', en: 'Sprayers & Tools' },
  'जैविक उत्पाद': { hi: 'जैविक उत्पाद', en: 'Organic Products' },
  'पौध पोषण (PGR)': { hi: 'पौध पोषण (PGR)', en: 'Plant Growth Regulators (PGR)' },
  'खाद': { hi: 'खाद', en: 'Fertilizer' },
  'दवा': { hi: 'दवा', en: 'Agri Chemical' },
  'दवाई': { hi: 'दवाई', en: 'Medicine / Agri Chemical' },
  'यूरिया': { hi: 'यूरिया', en: 'Urea' },
  'यूरिया खाद': { hi: 'यूरिया खाद', en: 'Urea Fertilizer' },
  'डी.ए.पी.': { hi: 'डी.ए.पी.', en: 'D.A.P.' },
  'डीएपी': { hi: 'डीएपी', en: 'DAP' },
  'डीएपी खाद': { hi: 'डीएपी खाद', en: 'DAP Fertilizer' },
  'पोटाश': { hi: 'पोटाश', en: 'Potash' },
  'एनपीके': { hi: 'एनपीके', en: 'NPK' },
  'जिंक सल्फेट': { hi: 'जिंक सल्फेट', en: 'Zinc Sulphate' },
  'सल्फर': { hi: 'सल्फर', en: 'Sulphur' },
  'बोरॉन': { hi: 'बोरॉन', en: 'Boron' },
  'मैग्नीशियम': { hi: 'मैग्नीशियम', en: 'Magnesium' },
  'कैल्शियम': { hi: 'कैल्शियम', en: 'Calcium' },
  'ह्यूमिक एसिड': { hi: 'ह्यूमिक एसिड', en: 'Humic Acid' },
  'सीवीड एक्सट्रैक्ट': { hi: 'सीवीड एक्सट्रैक्ट', en: 'Seaweed Extract' },
  'माइकोराइजा': { hi: 'माइकोराइजा', en: 'Mycorrhiza' },
  'कीटनाशक स्प्रे': { hi: 'कीटनाशक स्प्रे', en: 'Insecticide Spray' },
  'फफूंदनाशक पाउडर': { hi: 'फफूंदनाशक पाउडर', en: 'Fungicide Powder' },
  'खरपतवारनाशक घोल': { hi: 'खरपतवारनाशक घोल', en: 'Herbicide Solution' },
  'बैटरी स्प्रेयर': { hi: 'बैटरी स्प्रेयर', en: 'Battery Sprayer' },
  'हाथ स्प्रेयर': { hi: 'हाथ स्प्रेयर', en: 'Manual Hand Sprayer' },

  // Schemes & Government
  'प्रधानमंत्री किसान सम्मान निधि': { hi: 'प्रधानमंत्री किसान सम्मान निधि', en: 'PM Kisan Samman Nidhi' },
  'मुख्यमंत्री किसान कल्याण योजना': { hi: 'मुख्यमंत्री किसान कल्याण योजना', en: 'Mukhyamantri Kisan Kalyan Yojana' },
  'प्रधानमंत्री फसल बीमा योजना': { hi: 'प्रधानमंत्री फसल बीमा योजना', en: 'PM Fasal Bima Yojana' },
  'किसान क्रेडिट कार्ड (KCC)': { hi: 'किसान क्रेडिट कार्ड (KCC)', en: 'Kisan Credit Card (KCC)' },
  'कृषि यंत्र अनुदान योजना': { hi: 'कृषि यंत्र अनुदान योजना', en: 'Agri Implements Subsidy Scheme' },
  'सोलर पंप योजना (PM-KUSUM)': { hi: 'सोलर पंप योजना (PM-KUSUM)', en: 'PM-KUSUM Solar Pump Scheme' },
  'तारबंदी योजना (फसल सुरक्षा)': { hi: 'तारबंदी योजना (फसल सुरक्षा)', en: 'Farm Fencing Subsidy Scheme' },
  'मृदा स्वास्थ्य कार्ड योजना': { hi: 'मृदा स्वास्थ्य कार्ड योजना', en: 'Soil Health Card Scheme' },
  'राष्ट्रीय कृषि विकास योजना': { hi: 'राष्ट्रीय कृषि विकास योजना', en: 'National Agriculture Development Scheme' },
  'केंद्र सरकार': { hi: 'केंद्र सरकार', en: 'Central Government' },
  'राज्य सरकार': { hi: 'राज्य सरकार', en: 'State Government' },
  'सब्सिडी': { hi: 'सब्सिडी', en: 'Subsidy' },
  'अनुदान': { hi: 'अनुदान', en: 'Grant / Subsidy' },
  'पात्रता': { hi: 'पात्रता', en: 'Eligibility' },
  'योजना के लाभ': { hi: 'योजना के लाभ', en: 'Scheme Benefits' },
  'आवश्यक दस्तावेज': { hi: 'आवश्यक दस्तावेज', en: 'Required Documents' },
  'आवेदन प्रक्रिया': { hi: 'आवेदन प्रक्रिया', en: 'Application Process' },
  'आधिकारिक वेबसाइट': { hi: 'आधिकारिक वेबसाइट', en: 'Official Website' },
  'ऑनलाइन आवेदन': { hi: 'ऑनलाइन आवेदन', en: 'Apply Online' },
  'नई योजना': { hi: 'नई योजना', en: 'New Scheme' },
  'लाभार्थी योजना': { hi: 'लाभार्थी योजना', en: 'Beneficiary Scheme' },
  'अधिक जानकारी देखें': { hi: 'अधिक जानकारी देखें', en: 'View More Details' },
  'विवरण देखें': { hi: 'विवरण देखें', en: 'View Details' },

  // Units, Pack Sizes & E-Commerce
  'लीटर': { hi: 'लीटर', en: 'Liter' },
  'मिली': { hi: 'मिली', en: 'ml' },
  'मिलीलीटर': { hi: 'मिलीलीटर', en: 'ml' },
  'किलो': { hi: 'किलो', en: 'kg' },
  'किलोग्राम': { hi: 'किलोग्राम', en: 'kg' },
  'ग्राम': { hi: 'ग्राम', en: 'g' },
  'क्विंटल': { hi: 'क्विंटल', en: 'Quintal' },
  'बोरी': { hi: 'बोरी', en: 'Bag' },
  'पैकेट': { hi: 'पैकेट', en: 'Packet' },
  'नग': { hi: 'नग', en: 'Piece' },
  'पीस': { hi: 'पीस', en: 'Piece' },
  'बोतल': { hi: 'बोतल', en: 'Bottle' },
  'डब्बा': { hi: 'डब्बा', en: 'Box / Can' },
  '1 लीटर': { hi: '1 लीटर', en: '1 Liter' },
  '500 मिली': { hi: '500 मिली', en: '500 ml' },
  '250 मिली': { hi: '250 मिली', en: '250 ml' },
  '100 मिली': { hi: '100 मिली', en: '100 ml' },
  '50 मिली': { hi: '50 मिली', en: '50 ml' },
  '1 किलो': { hi: '1 किलो', en: '1 kg' },
  '5 किलो': { hi: '5 किलो', en: '5 kg' },
  '10 किलो': { hi: '10 किलो', en: '10 kg' },
  '25 किलो': { hi: '25 किलो', en: '25 kg' },
  '50 किलो': { hi: '50 किलो', en: '50 kg' },
  'उपलब्ध पैक': { hi: 'उपलब्ध पैक', en: 'Available Packs' },
  'स्टॉक में उपलब्ध': { hi: 'स्टॉक में उपलब्ध', en: 'In Stock' },
  'स्टॉक समाप्त': { hi: 'स्टॉक समाप्त', en: 'Out of Stock' },
  'सीमित स्टॉक': { hi: 'सीमित स्टॉक', en: 'Limited Stock' },
  'अभी खरीदें': { hi: 'अभी खरीदें', en: 'Buy Now' },
  'कार्ट में जोड़ें': { hi: 'कार्ट में जोड़ें', en: 'Add to Cart' },
  'कार्ट में जोड़ा गया': { hi: 'कार्ट में जोड़ा गया', en: 'Added to Cart' },
  'ऑर्डर पूरा करें': { hi: 'ऑर्डर पूरा करें', en: 'Complete Order' },
  'ऑर्डर सबमिट करें': { hi: 'ऑर्डर सबमिट करें', en: 'Submit Order' },
  'चेकआउट': { hi: 'चेकआउट', en: 'Checkout' },
  'कुल योग': { hi: 'कुल योग', en: 'Total' },
  'बचत': { hi: 'बचत', en: 'Savings' },
  'डिलीवरी शुल्क': { hi: 'डिलीवरी शुल्क', en: 'Delivery Charges' },
  'मुफ्त होम डिलीवरी': { hi: 'मुफ्त होम डिलीवरी', en: 'Free Home Delivery' },
  'कैश ऑन डिलीवरी': { hi: 'कैश ऑन डिलीवरी', en: 'Cash on Delivery (COD)' },
  'ऑनलाइन भुगतान': { hi: 'ऑनलाइन भुगतान', en: 'Online Payment (UPI)' },
  'सुरक्षित भुगतान': { hi: 'सुरक्षित भुगतान', en: '100% Safe Payment' },
  'ऑर्डर आईडी': { hi: 'ऑर्डर आईडी', en: 'Order ID' },
  'ऑर्डर दिनांक': { hi: 'ऑर्डर दिनांक', en: 'Order Date' },
  'ऑर्डर स्थिति': { hi: 'ऑर्डर स्थिति', en: 'Order Status' },
  'ऑर्डर रद्दीकरण': { hi: 'ऑर्डर रद्दीकरण', en: 'Order Cancellation' },
  'ऑर्डर रद्द करें': { hi: 'ऑर्डर रद्द करें', en: 'Cancel Order' },
  'रद्द किया गया': { hi: 'रद्द किया गया', en: 'Cancelled' },
  'प्रगति पर': { hi: 'प्रगति पर', en: 'In Progress' },
  'पुष्टि की गई': { hi: 'पुष्टि की गई', en: 'Confirmed' },
  'भेजा गया': { hi: 'भेजा गया', en: 'Shipped' },
  'वितरित': { hi: 'वितरित', en: 'Delivered' },
  'लंबित': { hi: 'लंबित', en: 'Pending' },

  // News Terms
  'ताजा कृषि समाचार': { hi: 'ताजा कृषि समाचार', en: 'Latest Agri News' },
  'मध्य प्रदेश समाचार': { hi: 'मध्य प्रदेश समाचार', en: 'Madhya Pradesh News' },
  'मौसम अलर्ट': { hi: 'मौसम अलर्ट', en: 'Weather Alert' },
  'बाजार विश्लेषण': { hi: 'बाजार विश्लेषण', en: 'Market Analysis' },
  'फसल सलाह': { hi: 'फसल सलाह', en: 'Crop Advisory' },
  'नवाचार': { hi: 'नवाचार', en: 'Innovation' },
  'तकनीक': { hi: 'तकनीक', en: 'Technology' },
  'आज': { hi: 'आज', en: 'Today' },
  'कल': { hi: 'कल', en: 'Yesterday / Tomorrow' },
  'स्रोत': { hi: 'स्रोत', en: 'Source' },
  'पूरी खबर पढ़ें': { hi: 'पूरी खबर पढ़ें', en: 'Read Full News' },
  'शेयर करें': { hi: 'शेयर करें', en: 'Share' },
  'कॉपी किया गया': { hi: 'कॉपी किया गया', en: 'Copied' },
  'लिंक कॉपी करें': { hi: 'लिंक कॉपी करें', en: 'Copy Link' },

  // General Actions & Common Labels
  'वापस जाएँ': { hi: 'वापस जाएँ', en: 'Go Back' },
  'वापस': { hi: 'वापस', en: 'Back' },
  'आगे बढ़ें': { hi: 'आगे बढ़ें', en: 'Proceed' },
  'जारी रखें': { hi: 'जारी रखें', en: 'Continue' },
  'बंद करें': { hi: 'बंद करें', en: 'Close' },
  'स्वीकार करें': { hi: 'स्वीकार करें', en: 'Accept' },
  'पुष्टि करें': { hi: 'पुष्टि करें', en: 'Confirm' },
  'हटाएं': { hi: 'हटाएं', en: 'Remove' },
  'संपादित करें': { hi: 'संपादित करें', en: 'Edit' },
  'सहेजें': { hi: 'सहेजें', en: 'Save' },
  'डाउनलोड रसीद': { hi: 'डाउनलोड रसीद', en: 'Download Receipt' },
  'बिल प्रिंट करें': { hi: 'बिल प्रिंट करें', en: 'Print Invoice' },
  'जीएसटी बिल': { hi: 'जीएसटी बिल', en: 'GST Invoice' },
  'ओरिजिनल उत्पाद गारंटी': { hi: 'ओरिजिनल उत्पाद गारंटी', en: '100% Genuine Guarantee' },
  'विशेषज्ञ परामर्श': { hi: 'विशेषज्ञ परामर्श', en: 'Expert Consultation' },
  'त्वरित सहायता': { hi: 'त्वरित सहायता', en: 'Instant Support' }
};

// Merge in TRANSLATIONS and PHRASE_MAP to construct bidirectional lookups
const HINDI_TO_ENGLISH_MAP = new Map<string, string>();
const ENGLISH_TO_HINDI_MAP = new Map<string, string>();

// Initialize mappings
export function initializeDictionary(): void {
  if (HINDI_TO_ENGLISH_MAP.size > 0) return;

  // 1. Load IN_APP_DICTIONARY
  for (const item of Object.values(IN_APP_DICTIONARY)) {
    if (item.hi && item.en) {
      HINDI_TO_ENGLISH_MAP.set(item.hi.trim(), item.en.trim());
      ENGLISH_TO_HINDI_MAP.set(item.en.trim(), item.hi.trim());
      ENGLISH_TO_HINDI_MAP.set(item.en.trim().toLowerCase(), item.hi.trim());
    }
  }

  // 2. Load TRANSLATIONS
  for (const item of Object.values(TRANSLATIONS)) {
    if (item.hi && item.en) {
      HINDI_TO_ENGLISH_MAP.set(item.hi.trim(), item.en.trim());
      ENGLISH_TO_HINDI_MAP.set(item.en.trim(), item.hi.trim());
      ENGLISH_TO_HINDI_MAP.set(item.en.trim().toLowerCase(), item.hi.trim());
    }
  }

  // 3. Load PHRASE_MAP
  for (const [k, v] of Object.entries(PHRASE_MAP)) {
    if (k && v) {
      HINDI_TO_ENGLISH_MAP.set(k.trim(), v.trim());
      ENGLISH_TO_HINDI_MAP.set(v.trim(), k.trim());
      ENGLISH_TO_HINDI_MAP.set(v.trim().toLowerCase(), k.trim());
    }
  }
}

// Ensure dictionary is populated immediately on module load
initializeDictionary();

// Build sorted phrases array (longest phrases first for regex substitution)
let sortedHindiPhrases: string[] = [];
let sortedEnglishPhrases: string[] = [];

function getSortedHindiPhrases(): string[] {
  if (sortedHindiPhrases.length === 0) {
    sortedHindiPhrases = Array.from(HINDI_TO_ENGLISH_MAP.keys())
      .filter(k => k.length > 1)
      .sort((a, b) => b.length - a.length);
  }
  return sortedHindiPhrases;
}

function getSortedEnglishPhrases(): string[] {
  if (sortedEnglishPhrases.length === 0) {
    sortedEnglishPhrases = Array.from(ENGLISH_TO_HINDI_MAP.keys())
      .filter(k => k.length > 2)
      .sort((a, b) => b.length - a.length);
  }
  return sortedEnglishPhrases;
}

// Convert Devanagari numerals to Latin (०-९ -> 0-9)
export function devanagariToLatinDigits(str: string): string {
  const devDigits = '०१२३४५६७८९';
  return str.replace(/[०-९]/g, d => String(devDigits.indexOf(d)));
}

// Convert Latin numerals to Devanagari (0-9 -> ०-९)
export function latinToDevanagariDigits(str: string): string {
  const devDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.replace(/[0-9]/g, d => devDigits[parseInt(d, 10)] || d);
}

/**
 * In-App Text Translator Function
 * Translates any string (single word, phrase, sentence, or paragraph)
 * using the built-in dictionary and intelligent longest-phrase tokenization.
 */
export function inAppTranslate(text: string | null | undefined, targetLang: LanguageCode): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Direct exact match check
  if (targetLang === 'en') {
    const direct = HINDI_TO_ENGLISH_MAP.get(trimmed);
    if (direct) return direct;
  } else {
    const direct = ENGLISH_TO_HINDI_MAP.get(trimmed) || ENGLISH_TO_HINDI_MAP.get(trimmed.toLowerCase());
    if (direct) return direct;
  }

  // If text is short and not found, return as is or check punctuation
  if (trimmed.length < 2) return text;

  // Multi-word phrase & sentence translation
  if (targetLang === 'en') {
    let result = trimmed;
    const phrases = getSortedHindiPhrases();
    
    // Replace longest matched Hindi phrases first
    for (const phrase of phrases) {
      if (result.includes(phrase)) {
        const replacement = HINDI_TO_ENGLISH_MAP.get(phrase);
        if (replacement) {
          result = result.split(phrase).join(replacement);
        }
      }
    }

    // Convert Hindi digits if any
    result = devanagariToLatinDigits(result);
    return result;
  } else {
    // English to Hindi
    let result = trimmed;
    const phrases = getSortedEnglishPhrases();

    for (const phrase of phrases) {
      const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
      if (regex.test(result)) {
        const replacement = ENGLISH_TO_HINDI_MAP.get(phrase) || ENGLISH_TO_HINDI_MAP.get(phrase.toLowerCase());
        if (replacement) {
          result = result.replace(regex, replacement);
        }
      }
    }

    return result;
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Universal In-App DOM Walker & Text Synchronizer
 * Walks all text nodes under a root DOM element and translates them
 * instantaneously in-memory, preserving original text in a WeakMap.
 * NO network requests, NO Chrome scripts, 100% in-app code.
 */
const ORIGINAL_TEXT_MAP = new WeakMap<Node, string>();

// Tags that should NEVER have their contents translated
const IGNORED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 
  'SVG', 'PATH', 'CIRCLE', 'RECT', 'POLYGON', 'TEXTAREA'
]);

export function translateDomTree(root: Node, targetLang: LanguageCode): void {
  if (!root) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (IGNORED_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        // Skip hidden Google translate or technical tags if any
        if (parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
        const val = node.nodeValue?.trim();
        if (!val || val.length === 0) return NodeFilter.FILTER_SKIP;
        // Don't translate pure numbers or single symbols
        if (/^[\d\s.,:;!?%₹$\-/+*()]+$/.test(val)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    const rawText = currentNode.nodeValue || '';
    
    if (targetLang === 'en') {
      // Save original text if not already saved
      if (!ORIGINAL_TEXT_MAP.has(currentNode)) {
        ORIGINAL_TEXT_MAP.set(currentNode, rawText);
      }
      const source = ORIGINAL_TEXT_MAP.get(currentNode) || rawText;
      const translated = inAppTranslate(source, 'en');
      if (translated !== rawText) {
        currentNode.nodeValue = translated;
      }
    } else {
      // Revert to Hindi
      if (ORIGINAL_TEXT_MAP.has(currentNode)) {
        const original = ORIGINAL_TEXT_MAP.get(currentNode)!;
        if (currentNode.nodeValue !== original) {
          currentNode.nodeValue = original;
        }
      } else {
        // If created while in English mode, translate to Hindi
        const translated = inAppTranslate(rawText, 'hi');
        if (translated !== rawText) {
          currentNode.nodeValue = translated;
        }
      }
    }

    currentNode = walker.nextNode();
  }

  // Also translate placeholder attributes on input elements
  if (root instanceof Element) {
    const inputs = root.querySelectorAll('input[placeholder]');
    inputs.forEach(input => {
      const el = input as HTMLInputElement;
      const currentPlaceholder = el.getAttribute('placeholder') || '';
      if (!el.hasAttribute('data-orig-placeholder')) {
        el.setAttribute('data-orig-placeholder', currentPlaceholder);
      }
      const origPlaceholder = el.getAttribute('data-orig-placeholder') || currentPlaceholder;
      if (targetLang === 'en') {
        el.setAttribute('placeholder', inAppTranslate(origPlaceholder, 'en'));
      } else {
        el.setAttribute('placeholder', origPlaceholder);
      }
    });
  }
}
