
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // ensure no caching of responses

const BRAND_NAME = process.env.BRAND_NAME || 'cortif.ai';

const SYSTEM_PROMPT = `
You are ${BRAND_NAME}.
Be professional, warm, and concise (1–2 sentences by default).
Avoid filler. Use bullets only when explicitly helpful.
If asked for more detail, expand clearly and stay structured.
`;

const generationConfig = {
  temperature: 0.5,
  maxOutputTokens: 180,
  responseMimeType: 'text/plain',
};

export async function POST(req) {
  try {
    const { prompt = '', history = [] } = await req.json();

    // Basic validations returned as text so the UI shows them
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ text: '[Error] Missing GEMINI_API_KEY in .env.local' }, { status: 200 });
    }
    if (!prompt.trim()) {
      return NextResponse.json({ text: '[Error] Empty prompt' }, { status: 200 });
    }

    // Initialize SDK
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Use a supported, current model. 1.5-flash may 404 in v1beta;
    // gemini-2.0-flash is widely available for generateContent.
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig,
    });

    // Map prior chat turns to Gemini format (trim to last ~10)
    const prior = Array.isArray(history)
      ? history.slice(-10).map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(m.text || m.content || '') }],
        }))
      : [];

    // Generate
    const result = await model.generateContent({
      contents: [
        ...prior,
        { role: 'user', parts: [{ text: String(prompt) }] },
      ],
    });

    // Extract reply text safely
    const replyText = result?.response?.text?.();
    const finalText = (replyText && replyText.trim().length > 0)
      ? replyText
      : '[Error] Empty response from model';

    return NextResponse.json({ text: finalText }, { status: 200 });
  } catch (err) {
    // Return readable error back to UI (status 200 so the UI bubble shows it)
    const message = String(err?.message || err);
    return NextResponse.json(
      { text: `[Error] Generation failed: ${message}` },
      { status: 200 }
    );
  }
}
