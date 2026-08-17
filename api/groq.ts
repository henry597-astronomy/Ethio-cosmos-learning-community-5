import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  boundedString,
  cleanupRateLimitBuckets,
  enforceRateLimit,
  getClientAddress,
  handleOptions,
} from './_lib/security.js';

// Groq's legacy Llama model IDs are retired. Pin the production proxy to a supported model.
const GROQ_MODEL = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT = `You are the Ethio-Cosmos AI assistant for the Ethio-Cosmos Learning Community. 
CRITICAL PROJECT FACTS (Always use these when asked about who created or built this platform):
- Platform Name: Ethio-Cosmos Learning Community
- Founder & Team Leader: Henok Girma
- School: Dodola Ifa Boru Special Boarding School (Class of 2017 E.C.)
- Initiative: Established by Henok Girma and the student development team at Dodola Ifa Boru Special Boarding School to bridge astronomy and space science education in Ethiopia.
- Do NOT attribute the platform to external organizations like ESSS or space agencies. It is a student-led initiative built by Henok Girma and his team.
Help users with astronomy, space science, lessons, quizzes, and platform questions. Keep answers concise, accurate, and helpful.`;

type IncomingMessage = {
  role?: unknown;
  content?: unknown;
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

function parseMessages(value: unknown): Array<{ role: 'user' | 'assistant'; content: string }> | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) return null;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let totalLength = 0;

  for (const item of value as IncomingMessage[]) {
    const role = item?.role;
    const content = boundedString(item?.content, 4_000);
    if ((role !== 'user' && role !== 'assistant') || !content) return null;

    totalLength += content.length;
    if (totalLength > 20_000) return null;
    messages.push({ role, content });
  }

  return messages;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res, 'OPTIONS, POST')) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  cleanupRateLimitBuckets();
  const address = getClientAddress(req);
  if (!enforceRateLimit(`groq:${address}`, 20, 60_000, res)) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[groq] Missing server-side GROQ_API_KEY');
    return res.status(503).json({ error: 'AI service is temporarily unavailable' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body as { messages?: unknown } : {};
  const messages = parseMessages(body.messages);
  if (!messages) return res.status(400).json({ error: 'Invalid message payload' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      console.error('[groq] Upstream request failed with status:', response.status);
      return res.status(502).json({ error: 'AI service is temporarily unavailable' });
    }

    const data = await response.json() as GroqResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0 || content.length > 20_000) {
      console.error('[groq] Upstream response did not contain a valid answer');
      return res.status(502).json({ error: 'AI service returned an invalid response' });
    }

    return res.status(200).json({ content });
  } catch (error) {
    console.error('[groq] Request failed:', error);
    return res.status(502).json({ error: 'AI service is temporarily unavailable' });
  }
}
