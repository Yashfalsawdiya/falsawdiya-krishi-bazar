import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

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

interface ExistingEntityContext {
  products?: Array<{ id: string; name: string; hindiName: string; unit: string; costPrice: number; defaultSellingPrice: number }>;
  suppliers?: Array<{ id: string; name: string; phone?: string; companyName?: string }>;
  customers?: Array<{ id: string; name: string; phone?: string; village?: string }>;
}

export const handleScanBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', existingContext = {} } = req.body as {
      imageBase64: string;
      mimeType?: string;
      existingContext?: ExistingEntityContext;
    };

    if (!imageBase64 || imageBase64.trim() === '') {
      res.status(400).json({ success: false, error: 'कृपया बिल या रसीद की फोटो अपलोड करें।' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(500).json({
        success: false,
        error: 'Gemini API Key सर्वर पर उपलब्ध नहीं है। कृपया Settings > Secrets में API Key जांचें।',
      });
      return;
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const productsListStr = (existingContext.products || [])
      .slice(0, 100)
      .map(p => `[ID: ${p.id}] ${p.hindiName} / ${p.name} (Unit: ${p.unit}, Cost: ₹${p.costPrice}, Sale: ₹${p.defaultSellingPrice})`)
      .join('\n');

    const suppliersListStr = (existingContext.suppliers || [])
      .slice(0, 50)
      .map(s => `[ID: ${s.id}] ${s.name} (${s.companyName || ''}, Ph: ${s.phone})`)
      .join(', ');

    const customersListStr = (existingContext.customers || [])
      .slice(0, 50)
      .map(c => `[ID: ${c.id}] ${c.name} (${c.village || ''}, Ph: ${c.phone})`)
      .join(', ');

    const prompt = `You are a Senior Indian Retail Accountant and Agricultural Business Expert for "Falsawdiya Krishi Bazaar" (फल्सावदिया कृषि बाजार - खाद, बीज, कीटनाशक एवं कृषि उपकरण विक्रेता, शामगढ़).

You are given a photo of a financial document. It can be:
1. **Wholesaler / Distributor Inward Tax Invoice (थोक व्यापारी खरीद बिल)** - Printed GST / Non-GST invoice from suppliers like Bayer, Syngenta, UPL, Dhanuka, IFFCO, local mandi distributors.
2. **Customer Retail Sale Bill / Parchi (ग्राहक बिक्री पर्ची)** - Printed POS slip or handwritten agricultural bill given to a farmer with multiple items (fertilizer bags, pesticide bottles, seeds, etc.).
3. **Handwritten Raw Slip (हाथ से लिखी कच्ची पर्ची / डायरी का पन्ना)** - Rural Indian agri-store shopkeeper's handwritten rough entry note with short names like 'क्लोरो', '2,4-D', 'यूरिया', 'DAP', 'पोटाश', 'सोयाबीन बीज', 'तारा 909', quantities (उदा. 2 बोरी, 500gm, 1Ltr), and rates/totals.
4. **Expense Receipt (खर्च रसीद)** - Petrol/Diesel pump slip, tempo/transport bhada receipt, hamali/loading slip, electricity bill, tea/refreshment bill, equipment repair voucher, packaging purchase slip.

---
### KNOWN STORE DATABASE (FOR INTELLIGENT MATCHING):
Existing Products:
${productsListStr || 'None provided'}

Existing Suppliers:
${suppliersListStr || 'None provided'}

Existing Customers:
${customersListStr || 'None provided'}

---
### STRICT EXTRACTION RULES:
1. **DO NOT HALLUCINATE**: If the invoice number, date, or contact is not visible, do NOT invent one. Return empty string or null.
2. **DOCUMENT CLASSIFICATION**: Correctly classify the documentType as one of:
   - "wholesaler_invoice" (माल आवक / परचेज बिल)
   - "customer_bill" (ग्राहक बिक्री बिल)
   - "expense_receipt" (दुकान का खर्च)
   - "handwritten_slip" (कच्ची पर्ची / हस्तलिखित हिसाब)
   - "unknown"
3. **ITEMIZED BREAKDOWN**: Extract every single product line item with:
   - \`name\`: English/standard chemical brand name
   - \`hindiName\`: Clear Hindi name (e.g., 'क्लोरोपायरीफॉस 20% EC', 'यूरिया खाद 45 किग्रा')
   - \`quantity\`: numeric value (e.g. 2, 5.5, 10)
   - \`unit\`: standard unit ('Kg', 'Ltr', 'Gram', 'Ml', 'Packet', 'Bottle', 'Bag', 'Piece')
   - \`unitPrice\`: rate per unit (numeric)
   - \`totalPrice\`: line total (numeric)
   - \`matchedProductId\`: if this closely matches one of the existing products provided above, output its ID, otherwise empty string.
   - \`confidence\`: float between 0.1 and 1.0 indicating OCR reading clarity for this item.
4. **FINANCIAL TOTALS**:
   - Subtotal before discount
   - Discount amount (if written on bill)
   - Tax amount (GST/SGST/CGST if written)
   - Grand Total (Total payable/receivable)
5. **EXPENSE DETAILS**: If it's an expense receipt, identify \`suggestedExpenseCategory\` from:
   ['tea_refreshment', 'fuel', 'transport', 'salary', 'electricity', 'rent', 'repair', 'packaging', 'other'] and its Hindi label.
6. **DATE FORMAT**: Convert date to standard "YYYY-MM-DD" if legible, otherwise return today or empty.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType as any,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentType: {
              type: Type.STRING,
              description: 'wholesaler_invoice | customer_bill | expense_receipt | handwritten_slip | unknown',
            },
            documentTypeHindi: {
              type: Type.STRING,
              description: 'Hindi name for document type',
            },
            partyName: {
              type: Type.STRING,
              description: 'Supplier, Customer, or Vendor name extracted from bill',
            },
            partyPhone: {
              type: Type.STRING,
              description: 'Phone number if available',
            },
            partyGstin: {
              type: Type.STRING,
              description: 'GSTIN if available on invoice',
            },
            invoiceNumber: {
              type: Type.STRING,
              description: 'Invoice/Bill number',
            },
            date: {
              type: Type.STRING,
              description: 'Date in YYYY-MM-DD format if detected',
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hindiName: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER },
                  matchedProductId: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
                required: ['name', 'quantity', 'unit', 'unitPrice', 'totalPrice'],
              },
            },
            subtotal: { type: Type.NUMBER },
            discount: { type: Type.NUMBER },
            taxAmount: { type: Type.NUMBER },
            grandTotal: { type: Type.NUMBER },
            suggestedExpenseCategory: { type: Type.STRING },
            suggestedExpenseCategoryHindi: { type: Type.STRING },
            rawNotes: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            isHandwritten: { type: Type.BOOLEAN },
          },
          required: [
            'documentType',
            'documentTypeHindi',
            'items',
            'subtotal',
            'grandTotal',
            'confidenceScore',
            'isHandwritten',
          ],
        },
      },
    });

    const text = response.text || '{}';
    const parsedData = JSON.parse(text);

    res.json({
      success: true,
      data: parsedData,
      rawSummary: parsedData.rawNotes || '',
    });
  } catch (err: any) {
    console.error('[Accounting API] Error in handleScanBill:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'AI बिल स्कैनिंग विफल रही। कृपया पुनः प्रयास करें।',
    });
  }
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      insights: response.text || 'रिपोर्ट तैयार नहीं हो सकी।',
    });
  } catch (err: any) {
    console.error('[Accounting API] Error in handleAccountingInsights:', err);
    res.status(500).json({ success: false, error: err.message || 'AI सलाह तैयार करने में त्रुटि आई।' });
  }
};
