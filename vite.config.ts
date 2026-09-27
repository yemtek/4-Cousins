import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

// Custom Vite middleware to handle /api/parse-receipt directly in Vite dev server on port 3000
function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', server: 'vite-integrated' }));
          return;
        }

        if (req.url === '/api/parse-receipt' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const { imageBase64, mimeType } = JSON.parse(body || '{}');

              if (!imageBase64) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No image provided' }));
                return;
              }

              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: 'GEMINI_API_KEY environment variable is not configured.',
                  })
                );
                return;
              }

              const ai = new GoogleGenAI({ apiKey });
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
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, data: parsedData }));
            } catch (err: any) {
              console.error('Vite Gemini middleware error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: err?.message || 'Failed to analyze receipt with Gemini AI.',
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      geminiApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg'],
        manifest: {
          id: '/',
          name: '4 Cousins Togetherness',
          short_name: '4Cousins',
          description: 'Family contribution fund tracker with Gemini AI payment receipt OCR.',
          theme_color: '#78350f',
          background_color: '#FAF8F5',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
