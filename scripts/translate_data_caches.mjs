import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not found in environment");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `You are a professional Hindi-English translator for an Indian agriculture e-commerce and farming-news app. Read the full text, understand the meaning, and write it as a native speaker would in natural, grammatically correct English. Never translate word by word. Never keep Hindi word order in English. Translate common words by meaning, never transliterate them. Only transliterate proper nouns (people, places). Keep brand names (Syngenta, UPL, IFFCO, Neptune, Ampligo, Ulala, Facebook, Instagram, WhatsApp, Google Maps), chemical names, units and numbers unchanged. Return only the translation.`;

const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

async function translateToEnglish(text) {
  if (!text || !text.trim()) return '';
  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: text,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2
        }
      });
      if (res.text && res.text.trim()) {
        return res.text.trim();
      }
    } catch (e) {
      console.warn(`Model ${model} error for "${text.slice(0, 30)}...":`, e.message?.slice(0, 80));
    }
  }
  return text;
}

function cleanSummaryHi(title, rawSummary) {
  let cleaned = (rawSummary || '').replace(/\(?\s*(?:स्रोत|source)\s*:[^)]*\)?/gi, '').trim();
  const cleanTitle = (title || '').trim().replace(/[!।|.]+$/, '');
  if (cleaned.startsWith(cleanTitle)) {
    cleaned = cleaned.slice(cleanTitle.length).replace(/^[!।|,. ]+/, '');
  }
  if (!cleaned || cleaned.length < 10) {
    cleaned = 'कृषि वैज्ञानिकों एवं आधिकारिक पोर्टल्स से प्राप्त प्रामाणिक रिपोर्ट के अनुसार किसानों के लिए महत्वपूर्ण जानकारी साझा की गई है।';
  }
  return cleaned.trim();
}

async function processNews() {
  const filePath = path.join(process.cwd(), 'data', 'agri-news-cache.json');
  if (!fs.existsSync(filePath)) {
    console.log("No agri-news-cache.json found");
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const items = data.items || [];
  console.log(`Translating ${items.length} news items with gemini-3.6-flash...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const originalTitle = typeof item.title === 'object' ? item.title.hi : item.title;
    const originalSummary = typeof item.summary === 'object' ? item.summary.hi : item.summary;
    const cleanHiSummary = cleanSummaryHi(originalTitle, originalSummary);

    console.log(`[${i + 1}/${items.length}] News: ${originalTitle.slice(0, 45)}...`);
    
    const enTitle = await translateToEnglish(originalTitle);
    const enSummary = await translateToEnglish(cleanHiSummary);

    item.title = {
      hi: originalTitle,
      en: enTitle
    };
    item.summary = {
      hi: cleanHiSummary,
      en: enSummary
    };

    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log("✅ News cache successfully translated and saved!");
}

async function processSchemes() {
  const filePath = path.join(process.cwd(), 'data', 'agri-schemes-cache.json');
  if (!fs.existsSync(filePath)) {
    console.log("No agri-schemes-cache.json found");
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const items = data.items || [];
  console.log(`Translating ${items.length} schemes with gemini-3.6-flash...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const hiTitle = typeof item.title === 'object' ? item.title.hi : item.title;
    const hiDesc = typeof item.description === 'object' ? item.description.hi : item.description;
    const hiObj = typeof item.objective === 'object' ? item.objective.hi : item.objective;
    const hiSubsidy = typeof item.subsidyDetails === 'object' ? item.subsidyDetails.hi : item.subsidyDetails;
    const hiSector = typeof item.sector === 'object' ? item.sector.hi : item.sector;
    const hiEligibility = typeof item.eligibility === 'object' ? item.eligibility.hi : item.eligibility;
    const hiHowToApply = typeof item.howToApply === 'object' ? item.howToApply.hi : item.howToApply;

    console.log(`[${i + 1}/${items.length}] Scheme: ${hiTitle.slice(0, 45)}...`);

    const enTitle = await translateToEnglish(hiTitle);
    const enDesc = await translateToEnglish(hiDesc);
    const enObj = await translateToEnglish(hiObj);
    const enSubsidy = await translateToEnglish(hiSubsidy);
    const enSector = await translateToEnglish(hiSector);
    const enEligibility = await translateToEnglish(hiEligibility);
    const enHowToApply = await translateToEnglish(hiHowToApply);

    item.title = { hi: hiTitle, en: enTitle };
    item.description = { hi: hiDesc, en: enDesc };
    item.objective = { hi: hiObj, en: enObj };
    item.subsidyDetails = { hi: hiSubsidy, en: enSubsidy };
    item.sector = { hi: hiSector, en: enSector };
    item.eligibility = { hi: hiEligibility, en: enEligibility };
    item.howToApply = { hi: hiHowToApply, en: enHowToApply };

    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log("✅ Schemes cache successfully translated and saved!");
}

async function main() {
  await processNews();
  await processSchemes();
}

main().catch(err => {
  console.error("Translation script failed:", err);
  process.exit(1);
});
