import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Permissive CORS middleware so Netlify, mobile apps, and other frontends can call Gemini AI
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parser with larger payload support for receipt photos / base64 images
app.use(express.json({ limit: '25mb' }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Gemini Receipt Parsing Endpoint
app.post('/api/parse-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key is not configured in server environment.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are a financial document and receipt OCR expert for a family contribution fund named "4 Cousins Togetherness".
Examine this payment receipt / screenshot (such as bank transfer, OPAY, Palmpay, GTBank, Access, Zenith, Kuda, Moniepoint, M-Pesa, Zelle, CashApp, wire / deposit slip).
Extract the following information accurately:
1. contributorName: The name of the sender, contributor, account holder, or payer making the contribution. Look closely for "Paid by", "Sender", "From", "Debit Account Name", "Customer Name", or similar. Clean up unnecessary titles.
2. amount: The transaction amount as a pure number (no currency signs or commas). Example: 50000 or 15000 or 250.00.
3. currency: The currency code or symbol (e.g., "NGN", "USD", "KES", "GBP", "EUR", "GHS", "ZAR", or "₦"). If it's a Nigerian bank slip (OPAY, GTB, Zenith, Kuda, Moniepoint, Access, First Bank), the currency is "NGN".
4. date: The transaction date formatted strictly as "YYYY-MM-DD" (e.g. "2026-09-27"). If only day/month given, assume current year 2026.
5. time: The transaction time formatted as "HH:mm" (e.g. "14:35" or "09:20"). If 12-hour AM/PM format, convert to 24-hour "HH:mm". If not detected on the receipt, return "".
6. paymentMethod: Type of payment or bank/platform if visible (e.g., "OPAY", "GTBank", "Bank Transfer", "Mobile Money", "Zelle", "Wire").
7. referenceNumber: The transaction reference number, session ID, transaction ref, or receipt number. This is crucial for verifying against duplicate submissions.
8. confidenceNotes: Brief explanation of what was found (e.g., "Sender identified as Babatunde Adeleke. Amount ₦50,000 confirmed.").

If an exact field is missing, provide your best reasonable inference or empty string.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contributorName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            date: { type: Type.STRING },
            time: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            referenceNumber: { type: Type.STRING },
            confidenceNotes: { type: Type.STRING },
          },
          required: ['contributorName', 'amount', 'currency', 'date', 'time'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response received from Gemini');
    }

    const parsedData = JSON.parse(text);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Receipt parsing error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze receipt with Gemini AI.',
    });
  }
});

// Serve compiled static assets from dist folder
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback for all HTML routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // In development before build
  app.get('/', (req, res) => {
    res.send('AI Studio build running. Please build or use dev server.');
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Application server running on port ${port}`);
});
