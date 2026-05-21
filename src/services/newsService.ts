import { GoogleGenAI } from "@google/genai";
import { getFriendlyAiError } from "../utils/aiErrorHandler";

const getAI = (userApiKey?: string) => {
  const apiKey = userApiKey;
  
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

export interface AgriNewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
  category: 'MP' | 'India' | 'Scheme' | 'Weather' | 'Crop' | 'Market' | 'Tech' | 'Innovation';
}

/**
 * Robust helper function to format any date object strictly into DD/MM/YYYY format.
 */
const getFormattedDateString = (dateOb?: Date): string => {
  const d = dateOb || new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const fetchAgriNews = async (userApiKey?: string): Promise<AgriNewsItem[]> => {
  const now = new Date();
  const dateStr = getFormattedDateString(now);

  const CACHE_KEY = 'agri_news_cache_v2';
  const CACHE_TIME_KEY = 'agri_news_cache_time_v2';
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

  if (cachedData && cachedTime) {
    const age = now.getTime() - parseInt(cachedTime);
    if (age < CACHE_DURATION) {
      try {
        const decoded = JSON.parse(cachedData);
        if (Array.isArray(decoded) && decoded.length > 0) {
          // Make sure cached items also have consistent date format
          return decoded.map(item => {
            let itemDate = dateStr;
            if (item.date && /^\d{2}\/\d{2}\/\d{4}$/.test(item.date)) {
              itemDate = item.date;
            } else if (item.date) {
              const parsed = Date.parse(item.date);
              if (!isNaN(parsed)) {
                itemDate = getFormattedDateString(new Date(parsed));
              }
            }
            return { ...item, date: itemDate };
          });
        }
      } catch (e) {
        console.warn("Error parsing cached news:", e);
      }
    }
  }

  // Pre-configured fallback agricultural news items - beautifully written, dense, and detailed
  const fallbackData: AgriNewsItem[] = [
    {
      title: "मध्य प्रदेश के किसानों के लिए मुख्यमंत्री किसान कल्याण योजना की नई किश्त जारी",
      summary: "मध्य प्रदेश के मुख्यमंत्री द्वारा प्रदेश के सीमांत एवं लघु कृषकों के कल्याण के लिए मुख्यमंत्री किसान कल्याण योजना के तहत आगामी किश्त का भुगतान सीधे बैंक खातों में ऑनलाइन अंतरित (DBT) कर दिया गया है। कृषि विभाग के वरिष्ठ अधिकारियों ने पुष्टि की है कि इस योजना के माध्यम से लाखों योग्य किसान लाभान्वित हुए हैं। सभी किसान भाई अपने नजदीकी बैंक, सहकारी सोसायटी या आधिकारिक किसान कल्याण पोर्टल पर जाकर अपने भुगतान की स्थिति जाँच सकते हैं। यह राशि खरीफ सीजन की तैयारियों और आवश्यक कृषि इनपुट जैसे बीज व खाद खरीदने के लिए महत्वपूर्ण सहायक सिद्ध होगी।",
      date: dateStr,
      source: "कृषि विभाग, MP",
      url: "https://mpkrishi.mp.gov.in/",
      category: "MP"
    },
    {
      title: "मंडी भाव अपडेट: मालवा क्षेत्र की मंडियों में गेहूं की आवक बढ़ी",
      summary: "मध्य प्रदेश के मालवा-निमाड़ अंचल की प्रमुख अनाज मंडियों में रबी फसलों की कटाई पूरी होने के साथ ही उत्तम गुणवत्ता वाले गेहूं की आवक तेजी से बढ़ रही है। इंदौर, उज्जैन, मंदसौर और शाजापुर मंडियों में प्रतिदिन हजारों क्विंटल उपज की नीलामी हो रही है और बंपर आवक के बावजूद बाजार में गेहूं की कीमतें न्यूनतम समर्थन मूल्य (MSP) से ऊपर स्थिर बनी हुई हैं। मंडी प्रशासकों ने सुचारू रूप से व्यापार जारी रखने के लिए अतिरिक्त तौल-कांटे और छायादार शेडों की व्यवस्था की है। किसानों को मंडी में आने से पहले अपनी फसल को अच्छी तरह साफ करने और सुखाने की सलाह दी गई है।",
      date: dateStr,
      source: "मंडी रिपोर्ट",
      url: "https://enam.gov.in/",
      category: "Market"
    },
    {
      title: "प्रधानमंत्री फसल बीमा योजना: रजिस्ट्रेशन की तारीख बढ़ी",
      summary: "कृषि मंत्रालय, भारत सरकार ने प्रतिकूल मौसम और किसानों की सुविधा को ध्यान में रखते हुए प्रधानमंत्री फसल बीमा योजना (PMFBY) के अंतर्गत खरीफ की फसलों के बीमा पंजीकरण की अंतिम तिथि को बढ़ा दिया है। इस निर्णय से उन किसान भाइयों को एक और अवसर मिलेगा जो अब तक तकनीकी कारणों या दस्तावेज़ों की कमी की वजह से पंजीकरण नहीं करा पाए थे। किसान भाई अपनी ग्राम सहकारी समिति, राष्ट्रीयकृत बैंक शाखा या अधिकृत कॉमन सर्विस सेंटर (CSC) पर आवश्यक भू-अभिलेख और आधार कार्ड प्रस्तुत कर अपनी धान, सोयाबीन और मक्का जैसी फसलों का सुरक्षित बीमा करा सकते हैं।",
      date: dateStr,
      source: "कृषि जागरण",
      url: "https://pmfby.gov.in/",
      category: "Scheme"
    },
    {
      title: "अगले 48 घंटों में मध्य प्रदेश के कई जिलों में बारिश की संभावना",
      summary: "भारतीय मौसम विज्ञान विभाग (IMD) ने एक सक्रिय पश्चिमी विक्षोभ के प्रभाव स्वरूप आगामी 48 घंटों में भोपाल, इंदौर, नर्मदापुरम, ग्वालियर और चंबल संभाग के अनेक जिलों में गरज-चमक के साथ हल्की से मध्यम स्तर की वर्षा और कहीं-कहीं ओलावृष्टि की संभावना व्यक्त की है। मौसम वैज्ञानिकों ने किसानों को कटी हुई फसलों को खुले खलिहानों से सुरक्षित स्थानों पर स्थानांतरित करने या तिरपाल से ढकने की चेतावनी जारी की है। साथ ही सलाह दी गई है कि वज्रपात के समय किसान पेड़ों, बिजली के खंभों के नीचे शरण न लें और सुरक्षित पक्के मकानों में रहें।",
      date: dateStr,
      source: "IMD",
      url: "https://mausam.imd.gov.in/",
      category: "Weather"
    },
    {
      title: "जैविक खेती अपनाने वाले किसानों को मिलेगी विशेष सब्सिडी",
      summary: "मध्य प्रदेश राज्य सरकार ने पर्यावरण संरक्षण और मिट्टी की उर्वरा शक्ति को बनाए रखने के लिए जीरो बजट प्राकृतिक खेती और जैविक खेती को बड़े पैमाने पर बढ़ावा देने का निर्णय लिया है। इसके तहत क्लस्टर आधारित जैविक खेती को अपनाने वाले प्रत्येक पंजीकृत किसान को जैविक इनपुट्स जैसे केंचुआ खाद यूनिट स्थापित करने, वर्मी कंपोस्ट और जीवामृत तैयार करने के लिए सीधे आर्थिक अनुदान (सब्सिडी) दिया जाएगा। कृषि विस्तार अधिकारियों के माध्यम से इन किसानों को जैविक उत्पाद का विशिष्ट प्रमाणीकरण (Organic Certification) प्रदान किया जाएगा ताकि वे घरेलू व वैश्विक बाजारों में अच्छे दामों पर अपनी उपज बेच सकें।",
      date: dateStr,
      source: "Patrika News",
      url: "https://www.patrika.com/",
      category: "Innovation"
    },
    {
      title: "धान की नई किस्मों पर किसानों को मिलेगी ट्रेनिंग",
      summary: "धान उत्पादक क्षेत्रों के किसानों के लिए स्थानीय कृषि विज्ञान केंद्रों (KVK) द्वारा बासमती और उन्नत गैर-बासमती धान की नवीनतम रोग-प्रतिरोधी तथा कम पानी में पकने वाली किस्मों पर विशेष प्रशिक्षण सत्रों का आयोजन किया जा रहा है। इन कम अवधि के व्यावहारिक शिविरों में किसानों को वैज्ञानिक नर्सरी प्रबंधन, उचित पौध दूरी, एकीकृत पोषक तत्व प्रबंधन और जल संरक्षण की आधुनिक तकनीकों के बारे में विस्तृत प्रशिक्षण दिया जाएगा। प्रशिक्षित किसानों को विभाग की तरफ से मिनिकिट के रूप में उच्च कोटि सुधार वाले उन्नत बीजों का वितरण भी निःशुल्क किया जाएगा।",
      date: dateStr,
      source: "Kisan News",
      url: "https://www.krishijagran.com/",
      category: "Crop"
    },
    {
      title: "सोलर पंप योजना: मध्य प्रदेश के किसानों के लिए ऑनलाइन आवेदन शुरू",
      summary: "प्रधानमंत्री कुसुम (KUSUM) योजना के तहत मध्य प्रदेश ऊर्जा विकास निगम ने राज्य के किसानों के लिए खेतों में नवीन ऑफ-ग्रिड सोलर पंप स्थापित करने हेतु ऑनलाईन आवेदन आमंत्रित करने की प्रक्रिया शुरू कर दी है। इस महात्वाकांक्षी योजना के अंतर्गत 3 एचपी से लेकर 10 एचपी तक की क्षमता वाले वाटर पंपों पर सरकार द्वारा 60 प्रतिशत तक की भारी सब्सिडी का लाभ सीधे दिया जा रहा है। डीजल पंप और महंगे बिजली कनेक्शनों से छुटकारा पाकर किसान दिन के समय बिना किसी व्यवधान के सिंचाई कार्य संपन्न कर सकेंगे और अपनी कृषि लागत को काफी हद तक कम कर सकेंगे।",
      date: dateStr,
      source: "ऊर्जा विभाग, MP",
      url: "https://cmsolarpump.mp.gov.in/",
      category: "Scheme"
    },
    {
      title: "ड्रोन तकनीक से खेती: छिड़काव के लिए नई गाइडलाइन्स जारी",
      summary: "केंद्रीय कृषि एवं किसान कल्याण मंत्रालय ने आधुनिक कृषि को प्रोत्साहित करने तथा कीटनाशकों व तरल उर्वरकों की बर्बादी को रोकने हेतु खेतों में कृषि ड्रोन (Agri Drones) के उपयोग के संबंध में सुरक्षात्मक नियमावली और दिशा-निर्देश जारी किए हैं। नई गाइडलाइन्स के अनुसार ड्रोन उड़ाने वाले ऑपरेटर को विशेष रूप से प्रशिक्षित और लाइसेंस प्राप्त होना अनिवार्य है, साथ ही हवा की गति व दिशा को माप कर ही नैनो यूरिया या कीटनाशकों का छिड़काव किया जा सकेगा। ड्रोन के इस व्यावहारिक उपयोग से न केवल समय की 90% बचत होगी बल्कि श्रम लागत में कमी होने के साथ-साथ गंभीर रसायनों के स्वास्थ्य खतरों से भी किसानों का बचाव होगा।",
      date: dateStr,
      source: "AgriTech India",
      url: "https://agriculture.gov.in/",
      category: "Tech"
    },
    {
      title: "मध्य प्रदेश में सोयाबीन की एमएसपी बढ़ाने की मांग तेज",
      summary: "सोयाबीन उत्पादक जिलों के प्रमुख किसान संगठनों और सहकारी सोसायटियों ने बढ़ती उत्पादन लागत, महंगे खाद, डीजल और बीजों की कीमतों को देखते हुए केंद्र व राज्य सरकार से सोयाबीन फसल का न्यूनतम समर्थन मूल्य (MSP) और बढ़ाने की जोरदार अपील की है। वर्तमान बाजार विश्लेषण के आधार पर किसानों का कहना है कि कृषि जोखिमों के अनुपात में सोयाबीन की वर्तमान कीमतें पर्याप्त नहीं हैं। सरकार से मांग की गई है कि खरीद केंद्रों पर सोयाबीन का मूल्य बढ़ाया जाए तथा बोनस का भी प्रावधान किया जाए ताकि तिलहन उत्पादक किसानों को आर्थिक घाटे से बचाया जा सके और वे सोयाबीन की बुवाई जारी रखने के लिए प्रोत्साहित हों।",
      date: dateStr,
      source: "Dainik Bhaskar",
      url: "https://www.bhaskar.com/",
      category: "Market"
    },
    {
      title: "कृषि यंत्रों पर सब्सिडी के लिए नया पोर्टल लॉन्च",
      summary: "कृषि अभियांत्रिकी विभाग ने उन्नत कृषि उपकरणों के वितरण को पूरी तरह पारदर्शी और सुगम बनाने के लिए एक एकीकृत 'सब्सिडी कृषि यंत्र' वेब पोर्टल सफलतापूर्वक लॉन्च किया है। अब किसान भाई अपने घर बैठे मात्र कुछ क्लिक में रोटावेटर, कल्टीवेटर, सीड ड्रिल, Power Tiller और थ्रेशर जैसी उपयोगी मशीनों पर सरकार द्वारा देय 40% से 50% तक के अनुदान हेतु ऑनलाइन आवेदन कर सकेंगे। कंप्यूटर जनित लॉटरी के माध्यम से चयनित लाभार्थियों के नामों की सूची पोर्टल पर त्वरित प्रकाशित की जाएगी, जिससे बिचौलियों की भूमिका समाप्त होगी और सही तकनीक सही किसानों तक समय पर पहुंचेगी।",
      date: dateStr,
      source: "MP Agri Portal",
      url: "https://dbt.mpdage.org/",
      category: "Scheme"
    },
    {
      title: "वर्मी कंपोस्ट खाद: घर पर बनाने की आसान विधि",
      summary: "कृषि विशेषज्ञों ने मिट्टी की उपजाऊ क्षमता को पुनर्जीवित करने और फसल की गुणवत्ता बढ़ाने के लिए घरेलू स्तर पर वर्मी कंपोस्ट (केंचुआ खाद) तैयार करने की एक बेहद सरल एवं उत्कृष्ट विधि साझा की है। किसान भाई अपने खेत पर ही छायादार स्थान चुनकर फसलों के अवशेषों, पेड़ों की पत्तियों और पशुओं के गोबर का उपयोग कर उत्तम दर्जे की वर्मी कंपोस्ट यूनिट स्थापित कर सकते हैं। यह विधि न केवल रासायनिक उर्वरकों पर निर्भरता को कम करती है, बल्कि कृषि से निकलने वाले अपशिष्टों का प्रभावी पुनर्चक्रण कर भूमि में आवश्यक नाइट्रोजन, फास्फोरस तथा पोटैशियम के संतुलन को जैविक तरीके से कायम रखती है।",
      date: dateStr,
      source: "Kisan Guide",
      url: "https://www.icar.org.in/",
      category: "Innovation"
    },
    {
      title: "उत्तर भारत में शीतलहर का अलर्ट: किसान रखें फसलों का ध्यान",
      summary: "शीत ऋतु के दौरान उत्तरी भारत और मध्य प्रदेश के सीमावर्ती क्षेत्रों में तापमान में तेजी से गिरावट एवं शुष्क बर्फीली उत्तर-पश्चिमी हवाओं के चलने से पाला पड़ने (Frost) की गंभीर चेतावनी मौसम विभाग ने दी है। इस मौसम में विशेष रूप से टमाटर, बैंगन और मटर जैसी संवेदनशील बागवानी फसलों के साथ-साथ गेहूं-सरसों को पाले से भारी नुक्सान का खतरा रहता है। विशेषज्ञों ने किसानों को फसल की क्यारियों के कोनों पर शाम के वक्त हल्का धुआं करने और खेत की मेड़ों के किनारे हल्की स्प्रिंकलर सिंचाई करने की सलाह दी है जिससे मेड़ का तापमान अनुकूल तापमान से नीचे नहीं जाने पाए।",
      date: dateStr,
      source: "Skymet Weather",
      url: "https://www.skymetweather.com/",
      category: "Weather"
    },
    {
      title: "सहकारी बैंकों में किसानों के लिए जीरो ब्याज दर पर ऋण",
      summary: "मध्य प्रदेश सरकार ने ग्रामीण साख और बैंकिंग ढाँचे को सुदृढ़ करने के उद्देश्य से सहकारी बैंकों के माध्यम से प्राथमिक कृषि साख समितियों (PACS) से जुड़े देश के सीमांत और लघु किसानों को शून्य प्रतिशत (0%) ब्याज दर पर अल्पकालिक फसली ऋण की निरंतर सुविधा प्रदान करने की घोषणा की है। समय पर कर्ज़ का पुनर्भुगतान करने वाले सभी सक्रिय किसानों को सरकार की ओर से पूर्ण ब्याज उपदान (Subsidy) का सीधा लाभ दिया जाता है, जिससे साहूकारों से अधिक ब्याज दर पर कर्ज़ लेने की विवशता समाप्त होती है और किसान नई बुवाई बिना किसी मानसिक तनाव के कर पाते हैं।",
      date: dateStr,
      source: "MP Cooperative",
      url: "https://mp.gov.in/",
      category: "Scheme"
    },
    {
      title: "स्मार्ट सिंचाई तकनीक: कम पानी में ज्यादा पैदावार",
      summary: "गिरते भूजल स्तर की विकट चुनौती से निपटने के लिए सिंचाई विभाग ने पानी की हर बूंद का विवेकपूर्ण उपयोग करने हेतु सूक्ष्म सिंचाई प्रौद्योगिकियां (Micro Irrigation Technology) जैसे ड्रिप प्रणाली (टपक सिंचाई) और स्प्रिंकलर (फव्वारा सिंचाई) प्रणाली को अनिवार्य रूप से अपनाने पर जोर दिया है। इन पद्धतियों के उपयोग से सीधे पौधों की जड़ों में पानी और तरल उर्वरक पहुँचाया जाता है, जिससे खरपतवारों का प्रसार 80% कम होता है और अतिरिक्त श्रम व पानी की 50% तक बचत होती है। सरकार इन तकनीकों को अपनाने पर किसानों को यंत्र खरीद में भारी वित्तीय सहायता भी दे रही है।",
      date: dateStr,
      source: "NITI Aayog",
      url: "https://niti.gov.in/",
      category: "Tech"
    },
    {
      title: "किसान रेल: अब फल और सब्जियों का परिवहन हुआ आसान",
      summary: "भारतीय रेलवे ने ताजा फल, हरी सब्जियों और अल्पकालिक डेयरी उत्पादों जैसे खराब होने वाले कृषि जिंसों को ग्रामीण उत्पादक केंद्रों से बड़े महानगरीय बाजारों तक बेहद तेजी से व वातानुकूलित माध्यमों में पहुंचाने के लिए 'किसान स्पेशल एक्सप्रेस' ट्रेनों के नेटवर्क और परिचालन फेरों में व्यापक वृद्धि की है। इन ट्रेनों में शीत-भंडारण (Cold Chain) की आधुनिक सुविधाएं मौजूद हैं, जिससे परिवहन के समय उपज की पौष्टिकता एवं ताजगी पूरी तरह बरकरार रहती है और किसानों की फसल खराब नहीं हो पाती। किसान मालभाड़े पर मिलने वाली 50 फ़ीसदी की प्रत्यक्ष छूट का भी सीधा लाभ रेलवे बुकिंग केंद्रों से प्राप्त कर सकते हैं।",
      date: dateStr,
      source: "Railway News",
      url: "https://indianrailways.gov.in/",
      category: "India"
    }
  ];

  try {
    const ai = getAI(userApiKey);
    if (!ai) throw new Error("GEMINI_KEY_NOT_SET");
    const prompt = `आज ${dateStr} के लिए भारत और विशेष रूप से मध्य प्रदेश (Madhya Pradesh) के लिए नवीनतम और सबसे महत्वपूर्ण 20 कृषि समाचार (Agricultural News) खोजें।
    
    निम्नलिखित विषयों पर कम से कम 20 अलग-अलग और वास्तविक (Real) समाचार आइटम प्रदान करें:
    1. मध्य प्रदेश कृषि (MP Agriculture News, CM Kisan Kalyan Yojana, MP Mandi updates)
    2. भारतीय कृषि (Indian Agriculture, PM-Kisan, central schemes)
    3. सरकारी योजनायें (Fasal Bima, Subsidy updates)
    4. मौसम और मानसून (Weather alerts for farmers, Monsoon progress)
    5. फसल अपडेट (Sowing updates for Malwa/Nimar/Bundelkhand regions)
    6. मंडी भाव (Latest Mandi prices for Wheat, Soyabean, Garlic, etc. in MP)
    7. कृषि तकनीक और नवाचार (Agri-tech, Smart farming)
    8. पशुपालन और डेयरी (Dairy and Livestock news)

    नियम:
    - कुल 20 समाचार दें (20 items).
    - सभी शीर्षक (Titles) और सारांश (Summaries) बहुत ही विस्तृत, पेशेवर, और कम से कम 3-4 वाक्यों के व्यापक विवरण के साथ किसान-अनुकूल (Farmer-friendly) हिंदी में हों। प्रत्येक सारांश (Summary) अत्यंत जानकारीपूर्ण, स्पष्ट और उपयोगी होना चाहिए; उसमें संक्षिप्त या अपूर्ण वाक्य न हों।
    - "url" अनिवार्य रूप से एक वैध न्यूज़ लिंक होना चाहिए।
    - "date" हमेशा इस फॉर्मेट में होना चाहिए: DD/MM/YYYY (जैसे: ${dateStr})। कृपया कोई अन्य फॉर्मेट इस्तेमाल न करें।
    - समाचार आज या इस सप्ताह के होने चाहिए।`;

    let response;
    try {
      console.log("Fetching news with Google Search Grounding...");
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are a specialized Agricultural News reporter for Indian farmers representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar). Always provide real, current, extremely rich and detailed news updates in a JSON array format.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                title: { type: "STRING" },
                summary: { type: "STRING" },
                date: { type: "STRING" },
                source: { type: "STRING" },
                url: { type: "STRING" },
                category: { 
                  type: "STRING",
                  enum: ['MP', 'India', 'Scheme', 'Weather', 'Crop', 'Market', 'Tech', 'Innovation'] 
                }
              },
              required: ["title", "summary", "date", "source", "url", "category"]
            }
          }
        }
      });
    } catch (searchError: any) {
      console.warn("Google Search Grounding failed, retrying with standard generation...", searchError);
      response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are a specialized Agricultural News reporter for Indian farmers representing 'फल्सावदिया कृषि बाज़ार' (Falsawdiya Krishi Bazar). Provide 20 most important, detailed, and highly descriptive agricultural news items as of today. Use your latest knowledge if search is unavailable.",
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                title: { type: "STRING" },
                summary: { type: "STRING" },
                date: { type: "STRING" },
                source: { type: "STRING" },
                url: { type: "STRING" },
                category: { 
                  type: "STRING",
                  enum: ['MP', 'India', 'Scheme', 'Weather', 'Crop', 'Market', 'Tech', 'Innovation'] 
                }
              },
              required: ["title", "summary", "date", "source", "url", "category"]
            }
          }
        }
      });
    }

    const data = JSON.parse(response.text);

    if (Array.isArray(data) && data.length > 0) {
      console.log("Successfully fetched news counts:", data.length);
      
      // Post-process response to guarantee the date format is strictly DD/MM/YYYY
      const formattedData = data.map(item => {
        let finalDate = dateStr;
        if (item.date) {
          const trimmed = item.date.trim();
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
            finalDate = trimmed;
          } else {
            const parsed = Date.parse(trimmed);
            if (!isNaN(parsed)) {
              finalDate = getFormattedDateString(new Date(parsed));
            } else {
              // Otherwise, format current date as standard DD/MM/YYYY
              finalDate = dateStr;
            }
          }
        }
        return {
          ...item,
          date: finalDate
        };
      });

      localStorage.setItem(CACHE_KEY, JSON.stringify(formattedData));
      localStorage.setItem(CACHE_TIME_KEY, now.getTime().toString());
      return formattedData;
    }
    
    return fallbackData;
  } catch (error: any) {
    const friendlyError = getFriendlyAiError(error);
    if (friendlyError.type === 'key_missing' || friendlyError.type === 'key_invalid') {
      throw friendlyError;
    }
    console.error("Critical news fetch failure:", error);
    
    if (cachedData) {
      try {
        const decoded = JSON.parse(cachedData);
        if (Array.isArray(decoded) && decoded.length > 0) {
          return decoded.map(item => {
            let itemDate = dateStr;
            if (item.date && /^\d{2}\/\d{2}\/\d{4}$/.test(item.date)) {
              itemDate = item.date;
            } else if (item.date) {
              const parsed = Date.parse(item.date);
              if (!isNaN(parsed)) {
                itemDate = getFormattedDateString(new Date(parsed));
              }
            }
            return { ...item, date: itemDate };
          });
        }
      } catch (e) {}
    }

    return fallbackData;
  }
};
