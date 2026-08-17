import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 24000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestCounts = new Map<string, { count: number; windowStartedAt: number }>();

const SYSTEM_PROMPT = `You are the Ethio-Cosmos AI assistant for the Ethio-Cosmos Learning Community.
CRITICAL PROJECT FACTS (Always use these when asked about who created or built this platform):
- Platform Name: Ethio-Cosmos Learning Community
- Founder & Team Leader: Henok Girma
- School: Dodola Ifa Boru Special Boarding School (Class of 2017 E.C.)
- Initiative: Established by Henok Girma and the student development team at Dodola Ifa Boru Special Boarding School to bridge astronomy and space science education in Ethiopia.
- Do NOT attribute the platform to external organizations like ESSS or space agencies. It is a student-led initiative built by Henok Girma and his team.
Help users with astronomy, space science, lessons, quizzes, and platform questions. Keep answers concise, accurate, and helpful.`;

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store');
}

function getClientKey(req: VercelRequest): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  return (firstForwarded || req.headers['x-real-ip'] || 'unknown').toString().trim() || 'unknown';
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(clientKey);
  if (!current || now - current.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(clientKey, { count: 1, windowStartedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (isRateLimited(getClientKey(req))) {
    return res.status(429).json({ error: 'Too many AI requests. Please try again shortly.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured on the server');
    return res.status(503).json({ error: 'AI service is temporarily unavailable.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: 'Invalid message history.' });
    }

    let totalChars = 0;
    const safeMessages = messages.map((message: unknown) => {
      if (!message || typeof message !== 'object') {
        throw new Error('Invalid message.');
      }

      const candidate = message as { role?: unknown; content?: unknown };
      const role = candidate.role;
      const content = candidate.content;

      if (!['user', 'assistant', 'system'].includes(String(role)) || typeof content !== 'string') {
        throw new Error('Invalid message.');
      }

      const trimmedContent = content.trim();
      if (!trimmedContent || trimmedContent.length > MAX_MESSAGE_CHARS) {
        throw new Error('Message is empty or too long.');
      }

      totalChars += trimmedContent.length;
      return { role, content: trimmedContent };
    });

    if (totalChars > MAX_TOTAL_CHARS) {
      return res.status(413).json({ error: 'Conversation is too long. Please start a new chat.' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...safeMessages.filter((message) => message.role !== 'system')],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Groq upstream error:', response.status, data?.error?.message || 'unknown');
      return res.status(502).json({ error: 'AI service request failed.' });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return res.status(502).json({ error: 'AI service returned an invalid response.' });
    }

    return res.status(200).json({ content });
  } catch (error) {
    console.error('Groq proxy validation error:', error);
    return res.status(400).json({ error: 'Invalid AI request.' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '128kb',
    },
  },
};

