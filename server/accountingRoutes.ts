import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client server-side
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export const handleAccountingInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = 'monthly', summaryData } = req.body;

    if (!summaryData) {
      res.status(400).json({ success: false, error: 'अकाउंटिंग डेटा उपलब्ध नहीं है।' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(500).json({ success: false, error: 'Gemini API Key उपलब्ध नहीं है।' });
      return;
    }

    const prompt = `You are a Senior Retail Business Financial Advisor & Agriculture Accountant for "Falsawdiya Krishi Bazaar" (फल्सावदिया कृषि बाजार).

Review this real confirmed financial performance data for the period (${period}):
${JSON.stringify(summaryData, null, 2)}

Provide a concise, practical, and highly valuable Hindi business insight report:
1. **वित्तीय स्वास्थ्य का सारांश (Financial Health Summary)**: Gross Revenue, COGS, Gross Margin %, Expenses, and Actual Net Profit.
2. **शीर्ष खर्चे और बचत के अवसर (Top Expense Drivers & Cost Optimization)**: Where is money leaking?
3. **उधारी और कैश फ्लो विश्लेषण (Udhari vs Cash Flow Health)**: Outstanding credit risk, recovery rate, and recommendations.
4. **मोलभाव (Bargaining) का प्रभाव**: Is customer discount eating too much into product margins?
5. **व्यावहारिक सलाह (3 Key Action Items for the Shopkeeper)**: Clear practical steps in respectful Hindi.

Strict Rule: Base all analysis 100% on the figures provided. Do NOT invent fake figures.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
    } catch (primaryErr: any) {
      console.warn('[Accounting API] Primary model failed, trying fallback model...', primaryErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });
    }

    res.json({
      success: true,
      insights: response.text || 'रिपोर्ट तैयार नहीं हो सकी।',
    });
  } catch (err: any) {
    console.error('[Accounting API] Error in handleAccountingInsights:', err);
    res.status(500).json({ success: false, error: err.message || 'AI सलाह तैयार करने में त्रुटि आई।' });
  }
};
