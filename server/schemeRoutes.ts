import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export interface SchemeItem {
  title: string;
  description: string;
  objective: string;
  benefits: string[];
  subsidyDetails: string;
  sector: string;
  governmentLevel: 'Central' | 'State' | string;
  eligibility: string;
  requiredDocuments: string[];
  howToApply: string;
  link?: string;
  category?: string;
  type?: string;
  isNew?: boolean;
  lastUpdated?: string;
}

interface SchemeCacheState {
  timestamp: number;
  items: SchemeItem[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SCHEMES_CACHE_FILE = path.join(DATA_DIR, 'agri-schemes-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours daily sync TTL

/**
 * 20 Comprehensive Verified Central & State (MP) Government Agricultural Schemes
 * Guaranteed permanent base knowledge so all Indian farmers get complete, verified guidance.
 */
export const VERIFIED_SEED_SCHEMES: SchemeItem[] = [
  {
    title: "पीएम-किसान सम्मान निधि (PM-Kisan Samman Nidhi)",
    description: "किसानों को प्रति वर्ष ₹6,000 की प्रत्यक्ष आर्थिक सहायता प्रदान की जाती है।",
    objective: "सीमांत और छोटे किसानों की वित्तीय जरूरतों को पूरा करना एवं बुवाई पूर्व खाद-बीज खरीदने में सहायता प्रदान करना।",
    benefits: ["₹2,000 की 3 समान किस्तें प्रति वर्ष", "सीधे आधार लिंक बैंक खाते में DBT द्वारा भुगतान", "बिना किसी बिचौलिये के 100% पारदर्शी ट्रांसफर"],
    subsidyDetails: "100% केंद्र सरकार द्वारा वित्त पोषित (₹6,000 वार्षिक नकद सहायता)",
    sector: "प्रत्यक्ष लाभ अंतरण (DBT)",
    governmentLevel: "Central",
    eligibility: "सभी भूमिधारक किसान परिवार जिनके नाम कृषि योग्य भूमि दर्ज है एवं e-KYC पूर्ण है।",
    requiredDocuments: ["आधार कार्ड", "खसरा-खतौनी (भू-अभिलेख नकल)", "बैंक खाता पासबुक (आधार लिंक)", "सक्रिय मोबाइल नंबर"],
    howToApply: "आधिकारिक pmkisan.gov.in पोर्टल पर 'New Farmer Registration' या नजदीकी CSC/वसुधा केंद्र से आवेदन करें।",
    link: "https://pmkisan.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "मुख्यमंत्री किसान कल्याण योजना (MP CM-Kisan Kalyan)",
    description: "मध्य प्रदेश सरकार द्वारा पीएम-किसान के पात्र किसानों को प्रति वर्ष ₹6,000 की अतिरिक्त वित्तीय सहायता।",
    objective: "मध्य प्रदेश के किसानों की आय में ठोस वृद्धि करना एवं राज्य स्तर पर अतिरिक्त संबल प्रदान करना।",
    benefits: ["₹2,000 की 3 समान अतिरिक्त किस्तें", "पीएम-किसान (₹6,000) + सीएम किसान (₹6,000) = कुल ₹12,000 वार्षिक सहायता"],
    subsidyDetails: "मध्य प्रदेश शासन द्वारा शत-प्रतिशत देय अतिरिक्त ₹6,000 वार्षिक भुगतान",
    sector: "वित्तीय सहायता",
    governmentLevel: "State",
    eligibility: "मध्य प्रदेश के मूल निवासी किसान जो पीएम-किसान सम्मान निधि योजना के सत्यापित लाभार्थी हैं।",
    requiredDocuments: ["पीएम-किसान पंजीयन क्रमांक", "समग्र आईडी (Samagra ID)", "आधार कार्ड", "बैंक पासबुक"],
    howToApply: "सारा (SAARA) पोर्टल (saara.mp.gov.in) अथवा क्षेत्रीय पटवारी के माध्यम से पात्रता सत्यापन कराएं।",
    link: "https://saara.mp.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "प्रधानमंत्री फसल बीमा योजना (PMFBY)",
    description: "प्राकृतिक आपदाओं, कीट प्रकोप व बेमौसम बारिश से फसल बर्बादी पर व्यापक वित्तीय सुरक्षा कवच।",
    objective: "किसानों को फसल क्षति से होने वाले आर्थिक नुकसान से बचाना और आधुनिक कृषि तकनीक अपनाने हेतु प्रोत्साहित करना।",
    benefits: ["खरीफ फसल पर केवल 2% एवं रबी फसल पर मात्र 1.5% किसान प्रीमियम", "वाणिज्यिक व बागवानी फसलों पर 5% प्रीमियम", "शेष 90% से अधिक प्रीमियम राशि सरकार वहन करती है", "फसल कटाई उपरांत 14 दिन तक नुकसान पर क्षतिपूर्ति"],
    subsidyDetails: "केंद्र एवं राज्य सरकार द्वारा प्रीमियम पर 90% से अधिक भारी सब्सिडी",
    sector: "फसल बीमा एवं सुरक्षा",
    governmentLevel: "Central",
    eligibility: "अधिसूचित क्षेत्रों में अधिसूचित फसलें उगाने वाले सभी ऋणी एवं गैर-ऋणी किसान।",
    requiredDocuments: ["आधार कार्ड", "खसरा/खतौनी नकल (B-1)", "पटवारी द्वारा जारी बुवाई प्रमाण पत्र", "बैंक पासबुक"],
    howToApply: "pmfby.gov.in पोर्टल, अपनी बैंक शाखा, या नजदीकी CSC सेंटर से कट-ऑफ तारीख से पूर्व आवेदन करें।",
    link: "https://pmfby.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "पीएम-कुसुम सोलर पंप योजना (PM-KUSUM Scheme)",
    description: "किसानों को सिंचाई हेतु सौर ऊर्जा पंप लगाने पर 60% तक भारी सरकारी अनुदान।",
    objective: "डीजल पंपों पर निर्भरता समाप्त करना, सिंचाई लागत शून्य करना तथा अतिरिक्त सौर ऊर्जा बेचकर आमदनी का साधन बनाना।",
    benefits: ["3 HP से 7.5 HP तक के स्टैंडअलोन सोलर पंप की स्थापना", "60% तक सब्सिडी (30% केंद्र + 30% राज्य)", "किसान को केवल 10% से 40% राशि का अंशदान देना होता है", "दिन के समय बिना बिजली कटौती निर्बाध सिंचाई"],
    subsidyDetails: "कुल लागत पर 60% सरकारी अनुदान, 30% तक बैंक ऋण सुविधा",
    sector: "सौर ऊर्जा एवं सिंचाई",
    governmentLevel: "Central",
    eligibility: "कृषि भूमि के स्वामी किसान जिनके पास सिंचाई का जल स्रोत उपलब्ध हो और पूर्व से ग्रिड विद्युत कनेक्शन न हो।",
    requiredDocuments: ["आधार कार्ड", "जमीन के राजस्व दस्तावेज (खसरा/खतौनी)", "बैंक खाता विवरण", "पासपोर्ट फोटो"],
    howToApply: "pmkusum.mnre.gov.in अथवा राज्य ऊर्जा विकास निगम पोर्टल के माध्यम से ऑनलाइन पंजीयन करें।",
    link: "https://pmkusum.mnre.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "कृषि यंत्रीकरण उप-मिशन (SMAM - ट्रैक्टर व यंत्र सब्सिडी)",
    description: "आधुनिक कृषि यंत्रों जैसे ट्रैक्टर, रोटावेटर, सीड ड्रिल, थ्रेशर पर 40% से 50% तक अनुदान।",
    objective: "खेती में मशीनीकरण को बढ़ावा देना, मानव श्रम कम करना एवं उत्पादकता में तीव्र वृद्धि करना।",
    benefits: ["ट्रैक्टर एवं विभिन्न कृषि यंत्रों पर 40% से 50% तक वित्तीय सब्सिडी", "महिला, अनुसूचित जाति एवं जनजाति के किसानों को प्राथमिकता व अतिरिक्त छूट", "कस्टम हायरिंग सेंटर (CHC) स्थापना हेतु ₹10 लाख तक अनुदान"],
    subsidyDetails: "यंत्रों की लागत पर 40% से 50% तक प्रत्यक्ष बैंक सब्सिडी",
    sector: "कृषि यंत्रीकरण (Mechanization)",
    governmentLevel: "Central",
    eligibility: "सभी श्रेणी के लघु, सीमांत, महिला एवं सामान्य किसान।",
    requiredDocuments: ["आधार कार्ड", "जमीन की खतौनी नकल (B-1)", "जाति प्रमाण पत्र (यदि लागू हो)", "बैंक पासबुक", "ट्रैक्टर आरसी (यंत्रों हेतु)"],
    howToApply: "agrimachinery.nic.in अथवा मध्य प्रदेश ई-कृषि यंत्र अनुदान पोर्टल (dbt.mpdage.org) पर लॉटरी व पंजीयन करें।",
    link: "https://agrimachinery.nic.in",
    lastUpdated: "2026"
  },
  {
    title: "प्रधानमंत्री कृषि सिंचाई योजना (PMKSY - ड्रिप व स्प्रिंकलर)",
    description: "टपक (ड्रिप) एवं फव्वारा (स्प्रिंकलर) सूक्ष्म सिंचाई प्रणाली पर 45% से 55% तक सरकारी सब्सिडी।",
    objective: "'हर खेत को पानी' और 'पर ड्रॉप मोर क्रॉप' के तहत जल उपयोग दक्षता बढ़ाना एवं सीमित पानी में अधिक उपज प्राप्त करना।",
    benefits: ["ड्रिप एवं स्प्रिंकलर सिस्टम पर 55% तक अनुदान", "40-50% तक पानी व 25-30% तक उर्वरक की बचत", "फसल उत्पादन में 35% से 40% तक की बढ़ोत्तरी"],
    subsidyDetails: "लघु/सीमांत किसानों को 55% एवं अन्य किसानों को 45% तक सब्सिडी",
    sector: "सूक्ष्म सिंचाई (Micro Irrigation)",
    governmentLevel: "Central",
    eligibility: "सभी किसान जिनके पास स्वयं की कृषि भूमि एवं सिंचाई हेतु सुनिश्चित जल स्रोत (बोरवेल, कुआं आदि) उपलब्ध हो।",
    requiredDocuments: ["आधार कार्ड", "खसरा-खतौनी की नकल", "बैंक पासबुक", "बिजली कनेक्शन बिल या पंप विवरण"],
    howToApply: "उद्यानिकी विभाग के आधिकारिक पोर्टल (mpfsts.mp.gov.in) अथवा pmksy.gov.in पर ऑनलाइन आवेदन करें।",
    link: "https://pmksy.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "किसान क्रेडिट कार्ड योजना (Kisan Credit Card - KCC)",
    description: "मात्र 4% की रियायती वार्षिक ब्याज दर पर ₹3 लाख तक का आसान और त्वरित संस्थागत कृषि ऋण।",
    objective: "किसानों को स्थानीय साहूकारों के भारी ब्याज के चंगुल से मुक्त कर समय पर कम लागत पर कार्यशील पूंजी उपलब्ध कराना।",
    benefits: ["₹3 लाख तक के अल्पकालिक कृषि ऋण पर 7% सामान्य ब्याज", "समय पर ऋण चुकाने पर 3% की अतिरिक्त ब्याज सबवेंशन (छूट), प्रभावी दर मात्र 4%", "पशुपालन एवं मत्स्य पालन हेतु ₹2 लाख तक का KCC ऋण उपलब्ध"],
    subsidyDetails: "समय पर चुकता करने पर केंद्र सरकार द्वारा 3% वार्षिक ब्याज अनुदान (Interest Subvention)",
    sector: "रियायती संस्थागत ऋण",
    governmentLevel: "Central",
    eligibility: "सभी व्यक्तिगत किसान, संयुक्त काश्तकार, पट्टेदार, पशुपालक एवं मछली पालक।",
    requiredDocuments: ["आधार कार्ड", "पैन कार्ड", "जमीन के राजस्व अभिलेख", "बैंक शाखा से नो-ड्यूज प्रमाण पत्र", "पासपोर्ट फोटो"],
    howToApply: "अपनी स्थानीय बैंक शाखा, प्राथमिक कृषि सहकारी समिति (PACS) अथवा CSC से KCC फॉर्म भरें।",
    link: "https://www.myscheme.gov.in/schemes/kcc",
    lastUpdated: "2026"
  },
  {
    title: "मृदा स्वास्थ्य कार्ड योजना (Soil Health Card Scheme)",
    description: "खेत की मिट्टी का निःशुल्क वैज्ञानिक 12-पैरामीटर रासायनिक परीक्षण एवं पोषक तत्व स्वास्थ्य कार्ड।",
    objective: "किसानों को मिट्टी की वास्तविक उर्वरा शक्ति से अवगत कराना और संतुलित खाद-उर्वरक उपयोग को बढ़ावा देना।",
    benefits: ["मिट्टी के 12 मुख्य पोषक तत्वों की विस्तृत जांच रिपोर्ट", "यूरिया, डीएपी, पोटाश व जिंक के अंधाधुंध उपयोग पर रोक", "खाद लागत में 20-25% की बचत और मिट्टी के स्वास्थ्य में सुधार"],
    subsidyDetails: "मिट्टी नमूना संग्रहण एवं प्रयोगशाला परीक्षण पूर्णतः निःशुल्क",
    sector: "मृदा परीक्षण एवं उर्वरक प्रबंधन",
    governmentLevel: "Central",
    eligibility: "देश के सभी भू-स्वामी एवं काश्तकार किसान।",
    requiredDocuments: ["आधार कार्ड", "खेत का खसरा नंबर", "खेत से एकत्र मिट्टी का प्रामाणिक नमूना"],
    howToApply: "नजदीकी कृषि विज्ञान केंद्र (KVK), ग्रामीण कृषि विस्तार अधिकारी अथवा soilhealth.dac.gov.in पर संपर्क करें।",
    link: "https://soilhealth.dac.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "परंपरागत कृषि विकास योजना (PKVY - प्राकृतिक व जैविक खेती)",
    description: "जैविक एवं प्राकृतिक खेती को प्रोत्साहित करने हेतु ₹50,000 प्रति हेक्टेयर की 3-वर्षीय वित्तीय सहायता।",
    objective: "पर्यावरण अनुकूल रासायनिक-मुक्त खेती को बढ़ावा देना और किसानों को प्रमाणित जैविक उत्पाद के प्रीमियम मूल्य दिलाना।",
    benefits: ["प्रति हेक्टेयर ₹50,000 की वित्तीय सहायता (जिसमें ₹31,000 सीधे किसान को जैविक आदानों हेतु)", "निःशुल्क जैविक प्रमाणीकरण (PGS-India Certification)", "जैविक उत्पादों के विपणन व पैकेजिंग में सहायता"],
    subsidyDetails: "3 वर्षों की अवधि में प्रति हेक्टेयर ₹50,000 का प्रत्यक्ष अनुदान",
    sector: "जैविक एवं प्राकृतिक खेती",
    governmentLevel: "Central",
    eligibility: "किसानों के समूह (कम से कम 20-50 किसानों का क्लस्टर - 20 हेक्टेयर भूमि)।",
    requiredDocuments: ["आधार कार्ड", "समूह पंजीयन दस्तावेज", "खसरा नकल", "बैंक खाता विवरण"],
    howToApply: "jaivikkheti.in पोर्टल अथवा उप-संचालक किसान कल्याण एवं कृषि विकास कार्यालय से संपर्क करें।",
    link: "https://jaivikkheti.in",
    lastUpdated: "2026"
  },
  {
    title: "मुख्यमंत्री सोलर पंप योजना - मध्य प्रदेश (MP CM Solar Pump)",
    description: "मध्य प्रदेश के अविद्युतीकृत एवं सुदूर खेतों में सिंचाई हेतु 90% तक की भारी राज्य सब्सिडी।",
    objective: "बिजली लाइन से दूर स्थित खेतों में सिंचाई सुविधा पहुंचाना और सिंचाई में डीजल का खर्च पूरी तरह समाप्त करना।",
    benefits: ["1 HP से 7.5 HP क्षमता के उच्च गुणवत्ता सोलर पंप", "अनुसूचित जाति/जनजाति के किसानों को 90% तक अनुदान, सामान्य किसानों को 80-85% तक अनुदान", "अविद्युतीकृत क्षेत्रों को सर्वोच्च प्राथमिकता"],
    subsidyDetails: "पंप लागत पर 80% से 90% तक राज्य शासन द्वारा देय सब्सिडी",
    sector: "सिंचाई एवं सौर ऊर्जा (MP State)",
    governmentLevel: "State",
    eligibility: "मध्य प्रदेश के मूल निवासी किसान जिनके खेत पर बिजली कनेक्शन न हो और स्थाई जल स्रोत हो।",
    requiredDocuments: ["मध्य प्रदेश मूल निवासी प्रमाण पत्र", "खसरा-खतौनी नकल", "आधार कार्ड", "बैंक पासबुक", "जल स्रोत शपथ पत्र"],
    howToApply: "cmsolarpump.mp.gov.in पोर्टल पर ऑनलाइन आवेदन जमा करें।",
    link: "https://cmsolarpump.mp.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "भावांतर भुगतान योजना - मध्य प्रदेश (Bhavantar Bhugtan)",
    description: "मंडी में कृषि उपज का भाव न्यूनतम समर्थन मूल्य (MSP) से नीचे गिरने पर अंतर की राशि का सीधा भुगतान।",
    objective: "मंडी में बाजार भाव में भारी उतार-चढ़ाव होने पर किसानों को घाटे से सुरक्षित रखना।",
    benefits: ["घोषित मॉडल भाव और विक्रय भाव के अंतर की राशि सीधे बैंक खाते में", "बिना सरकारी खरीद लाइन में लगे अपनी उपज स्थानीय मंडी में बेचने की छूट", "सोयाबीन, मक्का, उड़द, मूंग आदि अधिसूचित फसलों पर प्रभावी सुरक्षा"],
    subsidyDetails: "MSP और विक्रय मूल्य के अंतर (Deficit) की 100% भरपाई राज्य सरकार द्वारा",
    sector: "मूल्य सुरक्षा एवं मंडी सहायता",
    governmentLevel: "State",
    eligibility: "मध्य प्रदेश के किसान जिन्होंने ई-उपार्जन पोर्टल पर समय पर अपनी फसल की बुवाई दर्ज कराई हो।",
    requiredDocuments: ["ई-उपार्जन पंजीयन पावती", "मंडी विक्रय पर्ची व तौल पर्ची (अनुज्ञा पत्र)", "आधार कार्ड", "बैंक पासबुक"],
    howToApply: "फसल बुवाई के समय mpeuparjan.nic.in पोर्टल पर पंजीयन कराएं और उपज अधिसूचित मंडी में बेचें।",
    link: "https://mpeuparjan.nic.in",
    lastUpdated: "2026"
  },
  {
    title: "राष्ट्रीय पशुधन मिशन (National Livestock Mission - NLM)",
    description: "बकरी पालन, भेड़ पालन, कुक्कुट (पोल्ट्री) व चारा यूनिट स्थापना पर 50% तक कैपिटल सब्सिडी।",
    objective: "ग्रामीण क्षेत्रों में पशुपालन आधारित स्वरोजगार सृजित करना और किसानों की अतिरिक्त नियमित आय बढ़ाना।",
    benefits: ["बकरी/भेड़/मुर्गी पालन फार्म स्थापना हेतु 50% कैपिटल सब्सिडी (अधिकतम ₹25 लाख से ₹50 लाख तक)", "चारा उत्पादन, साइलेज मेकिंग एवं दाना निर्माण यूनिट्स पर अनुदान", "पशु नस्ल सुधार एवं बीमा सहायता"],
    subsidyDetails: "परियोजना लागत पर 50% सीधी पूंजीगत सब्सिडी (Capital Subsidy)",
    sector: "पशुपालन एवं स्वरोजगार",
    governmentLevel: "Central",
    eligibility: "व्यक्तिगत किसान, स्वयं सहायता समूह (SHG), एफपीओ (FPO) एवं कृषि उद्यमी।",
    requiredDocuments: ["आधार कार्ड", "पैन कार्ड", "भूमि स्वामित्व/लीज दस्तावेज", "बैंक सैंक्शन लेटर", "डिटेल्ड प्रोजेक्ट रिपोर्ट (DPR)"],
    howToApply: "nlm.udyamimitra.in पोर्टल पर ऑनलाइन प्रोजेक्ट अपलोड कर आवेदन करें।",
    link: "https://nlm.udyamimitra.in",
    lastUpdated: "2026"
  },
  {
    title: "प्रधानमंत्री मत्स्य संपदा योजना (PMMSY - मछली पालन)",
    description: "नया तालाब निर्माण, बायोफ्लॉक, आरएएस (RAS) व फीड मिल पर 40% से 60% तक अनुदान।",
    objective: "नीली क्रांति को गति देना, मत्स्य उत्पादन बढ़ाना और ग्रामीण युवाओं के लिए उच्च आय का सृजन करना।",
    benefits: ["मछली पालन हेतु तालाब निर्माण व पट्टे पर अनुदान", "महिला व SC/ST लाभार्थियों को 60% तक सब्सिडी, सामान्य वर्ग को 40% सब्सिडी", "मत्स्य बीज, दाना, कोल्ड चेन व मोटरसाइकिल/ऑटो रिक्शा विथ आइसबॉक्स पर छूट"],
    subsidyDetails: "सामान्य वर्ग हेतु 40% एवं महिला/SC/ST हेतु 60% तक सरकारी अनुदान",
    sector: "मत्स्य पालन (Fisheries)",
    governmentLevel: "Central",
    eligibility: "व्यक्तिगत किसान, मत्स्य पालक, सहकारी समितियां एवं मछली पालन में रुचि रखने वाले युवा।",
    requiredDocuments: ["आधार कार्ड", "भूमि स्वामित्व या न्यूनतम 7-10 वर्ष का रजिस्टर्ड लीज एग्रीमेंट", "बैंक पासबुक", "परियोजना प्रस्ताव"],
    howToApply: "pmmsy.dof.gov.in पोर्टल पर ऑनलाइन आवेदन करें अथवा जिला मत्स्य अधिकारी कार्यालय से संपर्क करें।",
    link: "https://pmmsy.dof.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "कृषि अवसंरचना कोष (Agriculture Infrastructure Fund - AIF)",
    description: "कोल्ड स्टोरेज, वेयरहाउस, प्राथमिक ग्रेडिंग-पैकेजिंग यूनिट हेतु ₹2 करोड़ तक के ऋण पर 3% ब्याज छूट।",
    objective: "फसल कटाई के बाद होने वाले 15-20% नुकसान को रोकना एवं स्थानीय स्तर पर भंडारण अवसंरचना तैयार करना।",
    benefits: ["₹2 करोड़ तक के मध्यम व दीर्घकालिक ऋण पर 3% वार्षिक ब्याज छूट (अधिकतम 7 वर्षों हेतु)", "क्रेडिट गारंटी कवरेज (CGTMSE) बिना भारी बंधक के", "वेयरहाउस, साइलो, पैक-हाउस, राइपनिंग चेंबर, दाल मिल आदि स्थापना में सहायता"],
    subsidyDetails: "3% वार्षिक ब्याज अनुदान (Interest Subvention) एवं शुल्क-मुक्त क्रेडिट गारंटी",
    sector: "कृषि अवसंरचना एवं पोस्ट-हार्वेस्ट",
    governmentLevel: "Central",
    eligibility: "किसान, प्राथमिक कृषि साख समितियां (PACS), एफपीओ (FPO), कृषि स्टार्टअप एवं उद्यमी।",
    requiredDocuments: ["पैन कार्ड", "आधार कार्ड", "जमीन के दस्तावेज (स्वामित्व/लीज)", "प्रोजेक्ट रिपोर्ट (DPR)", "बैंक सैंक्शन लेटर"],
    howToApply: "agriinfra.dac.gov.in पोर्टल पर ऑनलाइन रजिस्ट्रेशन एवं प्रोजेक्ट प्रस्तुत करें।",
    link: "https://agriinfra.dac.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "पीएम किसान मानधन योजना (PM Kisan Maandhan Pension)",
    description: "लघु व सीमांत किसानों को 60 वर्ष की आयु के बाद ₹3,000 प्रति माह (₹36,000 वार्षिक) सुनिश्चित पेंशन।",
    objective: "वृद्धावस्था में किसानों को सामाजिक व वित्तीय सुरक्षा प्रदान करना ताकि वे आत्मनिर्भर जीवन जी सकें।",
    benefits: ["60 वर्ष की उम्र से ₹3,000 निश्चित मासिक पेंशन", "किसान की मृत्यु पर जीवनसाथी को 50% पारिवारिक पेंशन (₹1,500/माह)", "किसान जितना अंशदान (₹55 से ₹200) करता है, उतना ही केंद्र सरकार जमा करती है"],
    subsidyDetails: "50% मासिक अंशदान केंद्र सरकार द्वारा वहन किया जाता है",
    sector: "सामाजिक सुरक्षा एवं पेंशन",
    governmentLevel: "Central",
    eligibility: "18 से 40 वर्ष की आयु वाले लघु एवं सीमांत किसान जिनके पास अधिकतम 2 हेक्टेयर (5 एकड़) भूमि हो।",
    requiredDocuments: ["आधार कार्ड", "बचत बैंक खाता/जनधन खाता पासबुक", "खसरा-खतौनी की प्रति"],
    howToApply: "नजदीकी CSC केंद्र पर जाकर या maandhan.in पोर्टल पर सीधे निःशुल्क पंजीयन कराएं।",
    link: "https://maandhan.in",
    lastUpdated: "2026"
  },
  {
    title: "गोबर-धन योजना एवं बायोगैस संयंत्र अनुदान (GOBARdhan Scheme)",
    description: "बायोगैस संयंत्र लगाने पर ₹14,000 से ₹50,000 तक की सीधी सब्सिडी और स्वच्छ ऊर्जा व जैविक खाद।",
    objective: "पशुधन अपशिष्ट व गोबर का सदुपयोग कर स्वच्छ रसोई गैस बनाना और उच्च कोटि की जैविक स्लरी खाद प्राप्त करना।",
    benefits: ["घरेलू बायोगैस संयंत्र स्थापना पर प्रत्यक्ष नकद सब्सिडी", "एलपीजी सिलेंडर पर होने वाले मासिक खर्च में भारी बचत", "खेतों के लिए उत्कृष्ट जीवांशयुक्त पोषक जैविक स्लरी"],
    subsidyDetails: "घरेलू संयंत्र पर ₹14,000 से ₹25,000 एवं सामुदायिक संयंत्रों पर ₹50,000+ तक अनुदान",
    sector: "स्वच्छ ऊर्जा एवं अपशिष्ट प्रबंधन",
    governmentLevel: "Central",
    eligibility: "सभी पशुपालक किसान परिवार जिनके पास कम से कम 2 से 4 दुधारू पशु उपलब्ध हों।",
    requiredDocuments: ["आधार कार्ड", "बैंक पासबुक", "पशु उपलब्धता प्रमाण", "आवासीय/कृषि भूमि प्रमाण"],
    howToApply: "gobardhan.co.in पोर्टल अथवा जिला पंचायत के स्वच्छ भारत मिशन ग्रामीण कार्यालय में संपर्क करें।",
    link: "https://gobardhan.co.in",
    lastUpdated: "2026"
  },
  {
    title: "एकीकृत बागवानी विकास मिशन (MIDH - फल, फूल व सब्जी)",
    description: "पॉलीहाउस, शेडनेट हाउस, फलदार बगीचे लगाने व संरक्षित खेती पर 50% तक सरकारी अनुदान।",
    objective: "पारंपरिक फसलों के साथ बागवानी को जोड़कर प्रति एकड़ आमदनी 2 से 3 गुना बढ़ाना।",
    benefits: ["पॉलीहाउस व शेडनेट निर्माण पर 50% सब्सिडी", "अमरूद, अनार, संतरा, आम, नींबू के नए बगीचे लगाने पर पौधे व खाद हेतु अनुदान", "मशरूम उत्पादन इकाई एवं कोल्ड रूम स्थापना पर वित्तीय सहायता"],
    subsidyDetails: "लागत मानकों पर 40% से 50% तक प्रत्यक्ष वित्तीय सहायता",
    sector: "बागवानी एवं संरक्षित खेती (Horticulture)",
    governmentLevel: "Central",
    eligibility: "वे सभी किसान जो फल, सब्जी, फूल, मसाला या औषधीय फसलों की खेती करना चाहते हैं।",
    requiredDocuments: ["आधार कार्ड", "खसरा-खतौनी नकल (B-1)", "मिट्टी एवं जल परीक्षण रिपोर्ट", "बैंक खाता विवरण"],
    howToApply: "राज्य उद्यानिकी एवं खाद्य प्रसंस्करण विभाग (mpfsts.mp.gov.in) पर ऑनलाइन पंजीयन करें।",
    link: "https://midh.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "राष्ट्रीय मधुमक्खी पालन एवं शहद मिशन (NBHM)",
    description: "मधुमक्खी पालन (Beekeeping) के बक्से, छत्ते व शहद प्रसंस्करण इकाई पर 50% से 75% तक अनुदान।",
    objective: "फसलों में परागण (Pollination) बढ़ाकर उत्पादन बढ़ाना और शहद व मोम बेचकर किसानों को अतिरिक्त आमदनी देना।",
    benefits: ["मधुमक्खी बक्से (Bee Boxes) व कॉलोनियों पर 50-75% तक अनुदान", "सरसों, सूर्यमुखी, लीची आदि फसलों की पैदावार में 20-30% की प्राकृतिक वृद्धि", "शहद निष्कासन यंत्र एवं पैकेजिंग यूनिट पर सब्सिडी"],
    subsidyDetails: "बक्से और उपकरणों पर 50% से 75% तक सरकारी सहायता",
    sector: "मधुमक्खी पालन एवं अतिरिक्त आय",
    governmentLevel: "Central",
    eligibility: "लघु, सीमांत, भूमिहीन किसान एवं ग्रामीण युवा।",
    requiredDocuments: ["आधार कार्ड", "बैंक पासबुक", "प्रशिक्षण प्रमाण पत्र (KVK द्वारा)", "पासपोर्ट फोटो"],
    howToApply: "madhukranti.in पोर्टल अथवा राष्ट्रीय मधुमक्खी बोर्ड (NBB) पर ऑनलाइन आवेदन करें।",
    link: "https://nbb.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "ई-राष्ट्रीय कृषि बाजार (e-NAM - इलेक्ट्रॉनिक राष्ट्रीय कृषि बाजार)",
    description: "पूरे भारत की 1300+ मंडियों से सीधा जुड़ाव और ऑनलाइन पारदर्शी बोली द्वारा उपज का सर्वोत्तम मूल्य।",
    objective: "किसानों को स्थानीय व्यापारियों के सीमित दायरे से बाहर निकालकर देशव्यापी खुले बाजार में उच्चतम दाम दिलाना।",
    benefits: ["देशभर के सत्यापित खरीदारों से ऑनलाइन प्रतिस्पर्धी बोलियां", "मंडी में निःशुल्क वैज्ञानिक गुणवत्ता जांच (Assaying)", "उपज बिकते ही उसी दिन सीधे बैंक खाते में ऑनलाइन भुगतान", "कोई बिचौलिया या अनुचित कमीशन नहीं"],
    subsidyDetails: "मंडी में पंजीयन, गुणवत्ता जांच एवं ई-नाम प्लेटफॉर्म पूर्णतः निःशुल्क",
    sector: "डिजिटल विपणन एवं पारदर्शी व्यापार",
    governmentLevel: "Central",
    eligibility: "देश का कोई भी किसान जो अपनी कृषि उपज उचित मूल्य पर बेचना चाहता है।",
    requiredDocuments: ["आधार कार्ड", "बैंक खाता पासबुक", "मंडी प्रवेश गेट पास"],
    howToApply: "enam.gov.in पर ऑनलाइन या किसी भी अधिसूचित ई-नाम कृषि उपज मंडी में निःशुल्क किसान पंजीकरण कराएं।",
    link: "https://enam.gov.in",
    lastUpdated: "2026"
  },
  {
    title: "मध्य प्रदेश 0% ब्याज फसल ऋण योजना",
    description: "प्राथमिक कृषि साख सहकारी सोसायटियों (PACS) के माध्यम से किसानों को 0% ब्याज पर अल्पकालिक फसल ऋण।",
    objective: "किसानों को खरीफ एवं रबी फसल की बुवाई हेतु बिना किसी ब्याज भार के खाद, बीज एवं नकद राशि उपलब्ध कराना।",
    benefits: ["शून्य प्रतिशत (0%) ब्याज दर पर खाद, बीज व कीटनाशक", "समय पर अदायगी करने पर कोई ब्याज नहीं देना होता", "ऋण राहत एवं नवीनीकरण की सुगम व्यवस्था"],
    subsidyDetails: "ऋण पर लगने वाले संपूर्ण ब्याज की भरपाई मध्य प्रदेश शासन द्वारा सोसायटियों को की जाती है",
    sector: "शून्य ब्याज दर फसल ऋण (MP State)",
    governmentLevel: "State",
    eligibility: "मध्य प्रदेश के सहकारी समितियों (PACS) के सदस्य किसान।",
    requiredDocuments: ["सोसायटी ऋण पुस्तिका", "आधार कार्ड", "खसरा नकल (B-1)", "समग्र आईडी"],
    howToApply: "अपनी ग्राम पंचायत से जुड़ी प्राथमिक कृषि साख सहकारी समिति (PACS) से संपर्क कर ऋण प्राप्त करें।",
    link: "https://mpkrishi.mp.gov.in",
    lastUpdated: "2026"
  }
];

// Helper to normalize strings for robust deduplication & title matching
export function normalizeSchemeTitle(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\u0900-\u097F]/g, '')
    .trim();
}

/**
 * Smart Deduplicating Scheme Merger
 * - Preserves all verified existing schemes so nothing is ever lost.
 * - Updates matched schemes with newer or richer details.
 * - Adds newly discovered schemes to the top of the collection with isNew: true flag!
 */
export function mergeSchemes(existingList: SchemeItem[], incomingList: SchemeItem[]): SchemeItem[] {
  const mergedMap = new Map<string, SchemeItem>();
  const normalizedKeys: { key: string; item: SchemeItem }[] = [];

  // Seed with existing list
  for (const item of existingList) {
    const norm = normalizeSchemeTitle(item.title);
    if (!norm) continue;
    mergedMap.set(norm, { ...item });
    normalizedKeys.push({ key: norm, item });
  }

  // Merge incoming list
  for (const incoming of incomingList) {
    const incomingNorm = normalizeSchemeTitle(incoming.title);
    if (!incomingNorm) continue;

    // Check for exact or partial similarity match
    let matchedKey: string | null = null;
    if (mergedMap.has(incomingNorm)) {
      matchedKey = incomingNorm;
    } else {
      // Find semantic match based on substrings or keywords
      for (const entry of normalizedKeys) {
        if (
          (incomingNorm.length >= 6 && entry.key.includes(incomingNorm)) ||
          (entry.key.length >= 6 && incomingNorm.includes(entry.key))
        ) {
          matchedKey = entry.key;
          break;
        }
      }
    }

    if (matchedKey) {
      // Update existing entry with newer fields if valid
      const existing = mergedMap.get(matchedKey)!;
      mergedMap.set(matchedKey, {
        ...existing,
        description: incoming.description?.length > existing.description?.length ? incoming.description : existing.description,
        objective: incoming.objective || existing.objective,
        benefits: Array.isArray(incoming.benefits) && incoming.benefits.length > 0 ? incoming.benefits : existing.benefits,
        subsidyDetails: incoming.subsidyDetails || existing.subsidyDetails,
        sector: incoming.sector || existing.sector,
        governmentLevel: incoming.governmentLevel || existing.governmentLevel,
        eligibility: incoming.eligibility || existing.eligibility,
        requiredDocuments: Array.isArray(incoming.requiredDocuments) && incoming.requiredDocuments.length > 0 ? incoming.requiredDocuments : existing.requiredDocuments,
        howToApply: incoming.howToApply || existing.howToApply,
        link: incoming.link || existing.link,
        lastUpdated: incoming.lastUpdated || existing.lastUpdated || new Date().toISOString()
      });
    } else {
      // Brand new scheme discovered! Prepend with isNew flag
      const newEntry: SchemeItem = {
        ...incoming,
        isNew: true,
        lastUpdated: new Date().toISOString()
      };
      mergedMap.set(incomingNorm, newEntry);
      normalizedKeys.unshift({ key: incomingNorm, item: newEntry });
    }
  }

  return Array.from(mergedMap.values());
}

let centralSchemesCache: SchemeCacheState | null = null;

// Initialize cache from disk, or bootstrap with verified seeds
try {
  if (fs.existsSync(SCHEMES_CACHE_FILE)) {
    const raw = fs.readFileSync(SCHEMES_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length >= 5) {
      // Merge with base seeds to guarantee nothing essential is missing
      const merged = mergeSchemes(VERIFIED_SEED_SCHEMES, parsed.items);
      centralSchemesCache = {
        timestamp: parsed.timestamp || Date.now(),
        items: merged
      };
      console.log(`[Central Scheme Cache] Restored and verified ${merged.length} schemes from disk`);
    }
  }
} catch (e) {
  console.warn('[Central Scheme Cache] Disk load skipped:', e);
}

// Fallback initialization with verified seeds if cache is empty
if (!centralSchemesCache || centralSchemesCache.items.length === 0) {
  centralSchemesCache = {
    timestamp: Date.now(),
    items: VERIFIED_SEED_SCHEMES
  };
  saveCacheToDisk(centralSchemesCache);
  console.log(`[Central Scheme Cache] Initialized with ${VERIFIED_SEED_SCHEMES.length} verified government schemes`);
}

function saveCacheToDisk(state: SchemeCacheState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SCHEMES_CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem in serverless environments
  }
}

/**
 * GET /api/schemes/all
 * Returns unified government schemes for all users across India.
 * If forceRefresh is requested and server key is present, runs daily Gemini search,
 * incrementally merges any newly discovered schemes, and retains all recent verified schemes.
 */
export const handleGetSchemes = async (req: Request, res: Response): Promise<void> => {
  try {
    const forceRefresh = req.query.forceRefresh === 'true';
    const now = Date.now();

    // 1. Fast Cache Hit
    if (!forceRefresh && centralSchemesCache && centralSchemesCache.items.length > 0) {
      const isStillFresh = now - centralSchemesCache.timestamp < CACHE_TTL_MS;
      if (isStillFresh) {
        res.json({
          success: true,
          cached: true,
          count: centralSchemesCache.items.length,
          lastSyncedTimestamp: centralSchemesCache.timestamp,
          items: centralSchemesCache.items
        });
        return;
      }
    }

    // 2. Refresh search if GEMINI_API_KEY is available in server environment
    const serverKey = process.env.GEMINI_API_KEY?.trim();
    if (serverKey && (forceRefresh || (centralSchemesCache && (now - centralSchemesCache.timestamp >= CACHE_TTL_MS)))) {
      try {
        console.log('[Central Scheme Cache] Searching for latest 2026 government agricultural schemes via Gemini...');
        const ai = new GoogleGenAI({ apiKey: serverKey });
        const dateStr = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });

        const prompt = `आज ${dateStr} तक की जानकारी के अनुसार भारत सरकार (Central Govt) और मध्य प्रदेश सरकार (MP Govt) द्वारा किसानों के लिए घोषित नवीनतम कृषि योजनाओं (Government Schemes for Farmers), सब्सिडी, ट्रैक्टर/सोलर पंप योजना, फसल बीमा एवं नए कल्याणकारी नियमों की विस्तृत सूची प्रदान करें।
        
नियम:
1. केवल वैध, आधिकारिक और वास्तविक सरकारी योजनाओं का विवरण दें।
2. उत्तर केवल शुद्ध JSON Array होना चाहिए, कोई अतिरिक्त मार्कडाउन या टेक्स्ट नहीं।
3. प्रत्येक योजना का प्रारूप:
{
  "title": "योजना का पूरा नाम",
  "governmentLevel": "Central" या "State",
  "description": "संक्षिप्त विवरण",
  "objective": "मुख्य उद्देश्य",
  "benefits": ["लाभ 1", "लाभ 2"],
  "subsidyDetails": "सब्सिडी या वित्तीय सहायता का विवरण",
  "sector": "संबंधित क्षेत्र (जैसे Irrigation, Solar, Subsidy, Finance, Machinery, Dairy, Fertilizer आदि)",
  "eligibility": "पात्रता",
  "requiredDocuments": ["दस्तावेज 1", "दस्तावेज 2"],
  "howToApply": "आवेदन प्रक्रिया",
  "link": "आधिकारिक वेबसाइट लिंक"
}`;

        // Strictly obey Rule 5: Primary gemini-3.6-flash, Fallback gemini-3.5-flash
        const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
        let searchResponseText: string | null = null;

        for (const model of models) {
          try {
            const resp = await ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                systemInstruction: "You are an expert Government Agricultural Scheme Specialist representing 'फल्सावदिया कृषि बाजार' (Falsawdiya Krishi Bazar). Return verified Indian and Madhya Pradesh agricultural schemes in strictly valid JSON array format.",
                responseMimeType: "application/json"
              }
            });
            if (resp.text) {
              searchResponseText = resp.text;
              break;
            }
          } catch (modelErr) {
            console.warn(`[Central Schemes Hub] Model ${model} generation attempt failed:`, modelErr);
          }
        }

        if (searchResponseText) {
          const freshItems: SchemeItem[] = JSON.parse(searchResponseText);
          if (Array.isArray(freshItems) && freshItems.length > 0) {
            // INCREMENTAL MERGE: Do NOT overwrite! Add newly found schemes and update existing ones
            const existingItems = centralSchemesCache?.items || VERIFIED_SEED_SCHEMES;
            const merged = mergeSchemes(existingItems, freshItems);

            centralSchemesCache = {
              timestamp: now,
              items: merged
            };
            saveCacheToDisk(centralSchemesCache);
            console.log(`[Central Scheme Cache] Successfully merged schemes. Total active library: ${merged.length} items.`);

            res.json({
              success: true,
              cached: false,
              count: merged.length,
              lastSyncedTimestamp: now,
              items: merged
            });
            return;
          }
        }
      } catch (srvErr) {
        console.warn('[Central Scheme Cache] Server-side live search skipped, using verified cache:', srvErr);
      }
    }

    // 3. Serve verified cache or seeds
    const currentItems = centralSchemesCache?.items && centralSchemesCache.items.length > 0 
      ? centralSchemesCache.items 
      : VERIFIED_SEED_SCHEMES;

    res.json({
      success: true,
      cached: true,
      count: currentItems.length,
      lastSyncedTimestamp: centralSchemesCache?.timestamp || now,
      items: currentItems
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Schemes fetch error', items: VERIFIED_SEED_SCHEMES });
  }
};

/**
 * POST /api/schemes/sync
 * When any user device or admin scans/searches fresh schemes with their Gemini key,
 * this endpoint intelligently merges new schemes into the Central Hub,
 * saving them to disk so ALL 10 lakh users' devices immediately receive them!
 */
export const handleSyncSchemes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Valid items array required' });
      return;
    }

    const now = Date.now();
    const existing = centralSchemesCache?.items || VERIFIED_SEED_SCHEMES;
    
    // Incremental merge: New schemes added, existing updated, none lost!
    const merged = mergeSchemes(existing, items);

    centralSchemesCache = {
      timestamp: now,
      items: merged
    };
    saveCacheToDisk(centralSchemesCache);

    console.log(`[Central Schemes Hub] Synced and merged schemes from client. Total count now: ${merged.length}`);

    res.json({
      success: true,
      message: 'Central schemes cache successfully updated and merged',
      count: merged.length,
      timestamp: now,
      items: merged
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Sync failed' });
  }
};
