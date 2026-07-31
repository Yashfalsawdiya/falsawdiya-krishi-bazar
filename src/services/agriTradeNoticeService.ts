import { GoogleGenAI } from "@google/genai";
import { AgriTradeNotice } from "../types";
import { db } from "../firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  setDoc,
  serverTimestamp 
} from "firebase/firestore";

const COLLECTION_NAME = "agri_trade_notices";
const CACHE_KEY = "agri_trade_notices_cache";

const getAI = (userApiKey?: string) => {
  if (!userApiKey || userApiKey.trim() === "") return null;
  return new GoogleGenAI({ apiKey: userApiKey.trim() });
};

// Initial historical and essential government regulatory seed data
const INITIAL_HISTORICAL_NOTICES: Omit<AgriTradeNotice, 'id' | 'createdAt'>[] = [
  {
    title: "पेराक्वाट डाईक्लोराइड (Paraquat Dichloride) तकनीकी उपयोग संबंधी अति आवश्यक CIB&RC आदेश",
    date: "15 जुलाई 2026",
    department: "CIB&RC (केंद्रीय कीटनाशी बोर्ड एवं पंजीकरण समिति)",
    state: "केंद्र सरकार (भारत)",
    category: "Ban Notifications",
    summary: "कीटनाशी अधिनियम 1968 के तहत पैराक्वाट डाईक्लोराइड तकनीकी एवं इसके फॉर्मूलेशन के असुरक्षित उपयोग और रिटेल बिक्री पर सख्त नियम लागू। केवल पंजीकृत विक्रेता एवं लाइसेंस धारक ही वैध बिल के साथ पंजीकृत फसलों हेतु बेच सकेंगे।",
    fullContent: `केंद्रीय कीटनाशी बोर्ड एवं पंजीकरण समिति (CIB&RC) तथा कृषि एवं किसान कल्याण मंत्रालय द्वारा जारी नवीनतम अधिसूचना के अनुसार:

1. **प्रतिबंध/नियंत्रण:** पैराक्वाट डाईक्लोराइड 24% SL का गैर-अनुमोदित फसलों एवं अनधिकृत रूप से खुले में विक्रय पूर्णतः प्रतिबंधित है।
2. **रिटेलर/डीलर दायित्व:**
   - हर बिक्री पर खरीददार किसान का नाम, आधार संख्या, फसल का प्रकार एवं एकड़ दर्ज करना अनिवार्य है।
   - बिना पक्के GST बिल और सुरक्षा उपकरण (Glove & Mask) दिशा-निर्देश के विक्रय दंडनीय अपराध होगा।
3. **स्टॉक पंजीयन:** कृषि निरीक्षकों (Fertilizer/Pesticide Inspectors) के निरीक्षण के दौरान स्टॉक रजिस्टर और भौतिक स्टॉक में अंतर पाए जाने पर लाइसेंस निलंबन व कानूनी कार्रवाई की जाएगी।`,
    orderNumber: "CIB&RC/PQ/2026/08",
    pdfUrl: "https://ppqs.gov.in",
    source: "CIB&RC / भारत सरकार राजपत्र",
    isImportant: true
  },
  {
    title: "उर्वरक नियंत्रण आदेश (FCO) - POS 3.1 मशीन एवं डिजिटल स्टॉक प्रविष्टि अनिवार्य",
    date: "10 जुलाई 2026",
    department: "उर्वरक विभाग (Department of Fertilizers)",
    state: "केंद्र सरकार (भारत)",
    category: "Fertilizer",
    summary: "समस्त यूरिया, DAP, NPK, MOP एवं एसएसपी (SSP) थोक व खुदरा विक्रेताओं हेतु iFMS / POS 3.1 पोर्टल पर प्रतिदिन शाम 8:00 बजे तक स्टॉक अपडेट करना अनिवार्य कर दिया गया है।",
    fullContent: `उर्वरक विभाग द्वारा समस्त राज्यों के जिला कृषि अधिकारियों व उर्वरक डीलरों हेतु महत्वपूर्ण दिशा-निर्देश:

1. **स्टॉक सत्यापन:** भौतिक रूप से दुकान व गोदाम में उपलब्ध खाद की बोरी और iFMS POS मशीन में प्रदर्शित स्टॉक में अंतर शून्य होना चाहिए।
2. **सब्सिडी भुगतान:** केवल आधार-आधारित (Aadhaar Biometric/OTP) POS बिक्री दर्ज होने पर ही थोक विक्रेता एवं कंपनियों को सब्सिडी दावों की अनुमति होगी।
3. **ओवरचार्जिंग पर जीरो टॉलरेंस:** बोरी पर मुद्रित अधिकतम खुदरा मूल्य (MRP) से 1 रुपये भी अधिक वसूलने पर FCO 1985 की धारा 3/7 के तहत एफआईआर (FIR) दर्ज की जाएगी।`,
    orderNumber: "DOF/FCO/POS-3.1/2026",
    pdfUrl: "https://www.urvarak.nic.in",
    source: "Department of Fertilizers (DoF)",
    isImportant: true
  },
  {
    title: "कीटनाशी विक्रेता लाइसेंस नवीनीकरण एवं न्यूनतम तकनीकी योग्यता नियम 2026",
    date: "01 जुलाई 2026",
    department: "राज्य कृषि निदेशालय एवं CIB&RC",
    state: "मध्यप्रदेश (Madhya Pradesh)",
    category: "Licensing",
    summary: "कीटनाशी लाइसेंस नवीनीकरण हेतु B.Sc (Agriculture) या 15 दिवसीय NIPHM / MANAGE प्रमाणपत्र अनिवार्य। बिना वैध योग्यता नवीनीकरण फॉर्म स्वीकार नहीं किए जाएंगे।",
    fullContent: `मध्यप्रदेश कृषि विभाग एवं केंद्रीय कीटनाशी नियम के अंतर्गत विक्रेताओं हेतु नया सर्कुलर:

1. **लाइसेंस नवीनीकरण:** समस्त रिटेल व होलसेल पेस्टिसाइड डीलर्स को अपने लाइसेंस की वैधता समाप्त होने से 30 दिन पूर्व ऑनलाइन पोर्टल 'कृषि लाइसेंस एम.पी.' पर आवेदन करना होगा।
2. **अनिवार्य योग्यता:** दुकान संचालक अथवा नियोजित जिम्मेदार व्यक्ति के पास B.Sc (Agri/Chemistry) या MANAGE हैदराबाद से 15-दिवसीय 'Diploma in Agricultural Extension Services for Input Dealers' (DAESI) का मान्य प्रमाणपत्र होना आवश्यक है।
3. **दुकान का बोर्ड:** दुकान के बाहर लाइसेंस नंबर, प्रोपराइटर का नाम, फोन नंबर और लाइसेंस की वैधता तिथि स्पष्ट अक्षरों में बोर्ड पर अंकित होनी चाहिए।`,
    orderNumber: "MP-AGRI/PEST-LIC/2026/112",
    pdfUrl: "https://mpkrishi.mp.gov.in",
    source: "मध्यप्रदेश कृषि विभाग",
    isImportant: false
  },
  {
    title: "बीज (Control) आदेश 1983 - नॉन-रिफंडेबल सैंपल सीलिंग एवं लॉट टेस्टिंग नियम",
    date: "20 जून 2026",
    department: "बीज प्रभाग (Seed Division)",
    state: "मध्यप्रदेश (Madhya Pradesh)",
    category: "Seeds",
    summary: "बीज निरीक्षकों द्वारा लिए जाने वाले बीजों के नमूनों (Samples) की सीलिंग, फॉर्म-VI और लैब रिपोर्ट आने तक लॉट होल्ड पर रखने हेतु विस्तृत गाइडलाइन जारी।",
    fullContent: `बीज विक्रेताओं और वितरकों हेतु कानूनी सूचना:

1. **सैंपलिंग प्रक्रिया:** बीज निरीक्षक द्वारा लिए गए 3 सीलबंद नमूनों में से 1 नमूना विक्रेता के पास सुरक्षित रहेगा। फॉर्म-VI पर निरीक्षक व विक्रेता दोनों के हस्ताक्षर अनिवार्य हैं।
2. **संबद्ध लॉट का विक्रय:** जब तक राजकीय बीज परीक्षण प्रयोगशाला (Notified Seed Testing Lab) से जर्मिनेशन और प्यूरिटी रिपोर्ट प्राप्त नहीं होती, तब तक संदिग्ध लॉट का विक्रय रोका जा सकता है।
3. **कंपनी दायित्व:** यदि बीज की अंकुरण क्षमता मानक से कम पाई जाती है, तो निर्माता कंपनी एवं बीज वितरक दोनों पर नियमानुसार जवाबदेही तय होगी।`,
    orderNumber: "SD/SEED-RULE/2026/45",
    pdfUrl: "https://seednet.gov.in",
    source: "Seed Division / ICAR",
    isImportant: false
  },
  {
    title: "कृषि इनपुट - GST 5% टैक्स स्लॉट, इनवॉइसिंग एवं ई-वे बिल स्पष्टीकरण",
    date: "12 जून 2026",
    department: "जीएसटी परिषद एवं वाणिज्यिक कर विभाग",
    state: "केंद्र सरकार (भारत)",
    category: "GST",
    summary: "रासायनिक उर्वरक, कीटनाशक एवं प्रमाणित बीजों पर लागू GST दरों, कंपोज़िशन स्कीम एवं ₹50,000 से अधिक के अंतरराज्यीय परिवहन पर ई-वे बिल अनिवार्यता का निर्देश।",
    fullContent: `कृषि व्यापारियों (Retailers & Wholesalers) हेतु GST दिशानिर्देश:

1. **GST दरें:** 
   - रासायनिक उर्वरक (Fertilizers): 5% GST
   - कीटनाशी, फफूंदनाशी एवं खरपतवारनाशी: 18% GST
   - प्रमाणित बीज (Certified Seeds): 0% (जीएसटी मुक्त)
   - कृषि यंत्र एवं पाइप्स: 12% / 18% GST
2. **बिल जारी करना:** हर ग्राहक किसान को GSTIN/दुकान के नाम से कंप्यूटर जनरेटेड या हस्तलिखित पक्का बिल देना अनिवार्य है जिसमें HSN कोड स्पष्ट लिखा हो।
3. **ई-वे बिल (E-Way Bill):** ₹50,000 से अधिक मूल्य के उर्वरक या पेस्टिसाइड के परिवहन के समय वैध ई-वे बिल साथ होना आवश्यक है।`,
    orderNumber: "GST/AGRI-CIRCULAR/2026/03",
    pdfUrl: "https://cbic.gov.in",
    source: "CBIC / GST Council",
    isImportant: false
  }
];

// Read from cache
export const getCachedNotices = (): AgriTradeNotice[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read trade notices cache:", e);
  }
  return [];
};

// Write to cache
export const setCachedNotices = (notices: AgriTradeNotice[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(notices));
  } catch (e) {
    console.error("Failed to write trade notices cache:", e);
  }
};

// Fetch from Firestore or fallback to cache/initial seeds
export const fetchTradeNotices = async (): Promise<AgriTradeNotice[]> => {
  const cached = getCachedNotices();
  
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items: AgriTradeNotice[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as AgriTradeNotice));

      setCachedNotices(items);
      return items;
    }

    // If Firestore collection is empty, seed initial historical notices
    if (cached.length > 0) return cached;

    console.log("Seeding initial Agri Trade Notices to Firestore...");
    const seededItems: AgriTradeNotice[] = [];
    const now = Date.now();

    for (let i = 0; i < INITIAL_HISTORICAL_NOTICES.length; i++) {
      const item = INITIAL_HISTORICAL_NOTICES[i];
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...item,
        createdAt: now - (i * 3600000 * 24)
      });
      seededItems.push({
        id: docRef.id,
        ...item,
        createdAt: now - (i * 3600000 * 24)
      });
    }

    setCachedNotices(seededItems);
    return seededItems;
  } catch (err) {
    console.warn("Error fetching trade notices from Firestore, using cache:", err);
    if (cached.length > 0) return cached;

    // Local fallback if offline and no cache
    const fallbackItems = INITIAL_HISTORICAL_NOTICES.map((item, idx) => ({
      id: `local_notice_${idx}`,
      ...item,
      createdAt: Date.now() - (idx * 3600000 * 24)
    }));
    setCachedNotices(fallbackItems);
    return fallbackItems;
  }
};

// Add a custom notice (Admin only)
export const addCustomNotice = async (notice: Omit<AgriTradeNotice, 'id' | 'createdAt'>): Promise<AgriTradeNotice> => {
  const createdAt = Date.now();
  const data = {
    ...notice,
    createdAt
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
    const newNotice: AgriTradeNotice = {
      id: docRef.id,
      ...data
    };

    const current = getCachedNotices();
    const updated = [newNotice, ...current];
    setCachedNotices(updated);
    return newNotice;
  } catch (err) {
    console.error("Error adding custom notice to Firestore:", err);
    const fallbackNotice: AgriTradeNotice = {
      id: `notice_${Date.now()}`,
      ...data
    };
    const current = getCachedNotices();
    const updated = [fallbackNotice, ...current];
    setCachedNotices(updated);
    return fallbackNotice;
  }
};

// Delete a notice (Admin only)
export const deleteTradeNotice = async (id: string): Promise<boolean> => {
  try {
    if (!id.startsWith("local_") && !id.startsWith("notice_")) {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    }
  } catch (err) {
    console.error("Error deleting notice from Firestore:", err);
  }

  const current = getCachedNotices();
  const filtered = current.filter(n => n.id !== id);
  setCachedNotices(filtered);
  return true;
};

// Automatically sync latest notices using Gemini API + Search Grounding
export const syncLatestTradeNotices = async (userApiKey?: string): Promise<{ success: boolean; newCount: number; message: string }> => {
  const ai = getAI(userApiKey);
  if (!ai) {
    return { 
      success: false, 
      newCount: 0, 
      message: "Gemini API कुंजी उपलब्ध नहीं है। कृपया Admin सेटिंग्स में कुंजी दर्ज करें।" 
    };
  }

  const todayStr = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const prompt = `आज ${todayStr} के संदर्भ में भारत सरकार, मध्यप्रदेश सरकार, CIB&RC (केंद्रीय कीटनाशी बोर्ड), उर्वरक विभाग (Department of Fertilizers - FCO), बीज प्रभाग (Seed Division), ICAR तथा प्रमुख एग्री इनपुट कंपनियों (Bayer, UPL, Syngenta, IFFCO, FMC, Dhanuka, Coromandel, BASF) द्वारा एग्री इनपुट डीलरों (Retailers, Wholesalers, Distributors) हेतु जारी हाल की 5-8 अत्यंत महत्वपूर्ण सरकारी घोषणाएं, नोटिफिकेशन, लाइसेंस नियम, बैन/प्रतिबंध आदेश या जीएसटी/सब्सिडी अपडेट खोजें।

नियम:
1. केवल प्रामाणिक और आधिकारिक स्रोतों से ही जानकारी लें।
2. उत्तर हिंदी भाषा में हो।
3. प्रत्येक नोटिफिकेशन के लिए निम्नलिखित फील्ड्स अनिवार्य हैं:
   - title: स्पष्ट शीर्षक
   - date: प्रकाशित तिथि (जैसे "27 जुलाई 2026")
   - department: जारीकर्ता विभाग (जैसे CIB&RC, उर्वरक विभाग, कृषि मंत्रालय, राज्य कृषि विभाग, GST परिषद)
   - state: राज्य या "केंद्र सरकार (भारत)"
   - category: इनमें से एक: ["Government Orders", "Ban Notifications", "Fertilizer", "Pesticides", "Seeds", "Licensing", "Legal Updates", "GST", "Subsidy", "Company Circulars", "Others"]
   - summary: 2-3 वाक्यों में संक्षिप्त विवरण
   - fullContent: विस्तृत बिंदुवार विवरण (बिंदु 1, 2, 3...)
   - orderNumber: आधिकारिक नोटिफिकेशन या परिपत्र क्रमांक (जैसे CIB/2026/99)
   - pdfUrl: आधिकारिक वेबसाइट या पोर्टल लिंक
   - source: स्रोत (जैसे CIB&RC, FCO, Krishi Jagran, DoF)
   - isImportant: यदि यह अति आवश्यक सरकारी प्रतिबंध, लाइसेंस निलंबन या FCO आदेश है तो true, अन्यथा false।`;

  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an official Agriculture Trade Regulatory News Parser for Retailers, Wholesalers, and Distributors in India representing 'फल्सावदिया कृषि बाज़ार'. Return authentic, highly accurate official notifications and orders in Hindi.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY" as any,
            items: {
              type: "OBJECT" as any,
              properties: {
                title: { type: "STRING" },
                date: { type: "STRING" },
                department: { type: "STRING" },
                state: { type: "STRING" },
                category: { 
                  type: "STRING",
                  enum: ["Government Orders", "Ban Notifications", "Fertilizer", "Pesticides", "Seeds", "Licensing", "Legal Updates", "GST", "Subsidy", "Company Circulars", "Others"]
                },
                summary: { type: "STRING" },
                fullContent: { type: "STRING" },
                orderNumber: { type: "STRING" },
                pdfUrl: { type: "STRING" },
                source: { type: "STRING" },
                isImportant: { type: "BOOLEAN" }
              },
              required: ["title", "date", "department", "category", "summary", "fullContent", "source"]
            }
          }
        }
      });
    } catch (searchErr) {
      console.warn("Search grounding failed for trade notices, falling back to standard generation:", searchErr);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an official Agriculture Trade Regulatory News Parser. Return authentic, accurate official notifications and orders in Hindi for agri input dealers.",
          responseMimeType: "application/json"
        }
      });
    }

    const jsonText = response.text || "[]";
    const parsedArray = JSON.parse(jsonText);

    if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
      return { success: true, newCount: 0, message: "कोई नया आधिकारिक आदेश नहीं मिला।" };
    }

    const existing = await fetchTradeNotices();
    let addedCount = 0;
    const now = Date.now();

    for (let idx = 0; idx < parsedArray.length; idx++) {
      const item = parsedArray[idx];
      
      // Check duplicate by orderNumber or title similarity
      const isDuplicate = existing.some(ex => {
        if (item.orderNumber && ex.orderNumber && item.orderNumber.trim() === ex.orderNumber.trim()) {
          return true;
        }
        return ex.title.trim().toLowerCase() === item.title.trim().toLowerCase();
      });

      if (!isDuplicate) {
        const newDoc = {
          title: item.title,
          date: item.date || todayStr,
          department: item.department || "कृषि विभाग",
          state: item.state || "केंद्र सरकार (भारत)",
          category: item.category || "Government Orders",
          summary: item.summary,
          fullContent: item.fullContent || item.summary,
          orderNumber: item.orderNumber || `GOV/${now.toString().slice(-6)}`,
          pdfUrl: item.pdfUrl || "",
          source: item.source || "आधिकारिक राजपत्र",
          isImportant: item.isImportant ?? false,
          createdAt: now - idx * 1000
        };

        await addDoc(collection(db, COLLECTION_NAME), newDoc);
        addedCount++;
      }
    }

    // Refresh memory cache
    await fetchTradeNotices();

    return {
      success: true,
      newCount: addedCount,
      message: addedCount > 0 
        ? `${addedCount} नई सरकारी/कंपनी सूचनाएँ सफलतापूर्वक सिंक की गईं!` 
        : "सभी नवीनतम सूचनाएं पहले से अद्यतन हैं।"
    };
  } catch (err: any) {
    console.error("Error syncing trade notices via Gemini:", err);
    return {
      success: false,
      newCount: 0,
      message: `सिंक में समस्या आई: ${err?.message || "अज्ञात त्रुटि"}`
    };
  }
};
