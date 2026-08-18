import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type NasaApod = {
  date?: string;
  title?: string;
  explanation?: string;
  url?: string;
  hdurl?: string;
  media_type?: string;
};

type DraftContent = {
  title: string;
  summary: string;
  full_explanation: string;
  fun_fact: string;
};

function clean(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function fallbackDraft(apod: NasaApod): DraftContent {
  const explanation = clean(apod.explanation, 'NASA shared this astronomy picture and explanation.');
  const summary = explanation.length > 240 ? `${explanation.slice(0, 237).trim()}…` : explanation;
  return {
    title: clean(apod.title, 'NASA Astronomy Picture of the Day'),
    summary,
    full_explanation: explanation,
    fun_fact: 'This picture comes from NASA’s Astronomy Picture of the Day collection.',
  };
}

async function createStudentDraft(apod: NasaApod): Promise<{ draft: DraftContent; aiGenerated: boolean }> {
  const GROQ_MODEL = 'llama-3.3-70b-versatile';

  const fallback = fallbackDraft(apod);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { draft: fallback, aiGenerated: false };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a careful astronomy educator. Rewrite only the supplied NASA text for students in simple English. Do not add facts, dates, names, measurements, claims, source links, or image URLs that are not explicitly supported by the source. Return JSON with title, summary, full_explanation, and fun_fact. Keep the fun_fact as a direct, clearly supported statement from the source.',
          },
          {
            role: 'user',
            content: JSON.stringify({ title: apod.title, explanation: apod.explanation, date: apod.date }),
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI request failed with ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI response was empty');
    const parsed = JSON.parse(content) as Partial<DraftContent>;
    const draft: DraftContent = {
      title: clean(parsed.title),
      summary: clean(parsed.summary),
      full_explanation: clean(parsed.full_explanation),
      fun_fact: clean(parsed.fun_fact),
    };
    if (!draft.title || !draft.summary || !draft.full_explanation || !draft.fun_fact) {
      throw new Error('AI response was incomplete');
    }
    return { draft, aiGenerated: true };
  } catch (error) {
    console.error('[daily-space-news] Groq draft failed; using source fallback:', error);
    return { draft: fallback, aiGenerated: false };
  }
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function fetchApod(date: string, nasaKey: string): Promise<NasaApod | null> {
  const request = async (key: string) => fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}&date=${date}`);
  let response = await request(nasaKey);
  if (response.status === 401 || response.status === 403) {
    response = await request('DEMO_KEY');
  }
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`NASA request failed with ${response.status}`);
  const apod = await response.json() as NasaApod;
  if (apod.media_type !== 'image' || !apod.date || !apod.explanation || !apod.title || !apod.url) return null;
  return apod;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const nasaKey = process.env.NASA_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!nasaKey || !supabaseUrl || !serviceRoleKey) {
    console.error('[daily-space-news] Missing server configuration');
    return res.status(500).json({ error: 'Server configuration is incomplete' });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    // Only publish the APOD for the current UTC calendar date. Never use
    // yesterday's item as today's content when the current APOD is delayed.
    const currentDate = dateDaysAgo(0);
    const selected = await fetchApod(currentDate, nasaKey);
    if (!selected?.date) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'current_nasa_item_not_available', date: currentDate });
    }

    const externalId = `nasa-apod-${selected.date}`;
    const { data: existing, error: existingError } = await supabase
      .from('space_news')
      .select('id, status')
      .eq('external_id', externalId)
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'current_item_already_exists', date: currentDate, status: existing.status });
    }

    const { draft, aiGenerated } = await createStudentDraft(selected);
    const sourceDate = selected.date as string;
    const { data, error } = await supabase
      .from('space_news')
      .insert({
        external_id: externalId,
        title: draft.title,
        summary: draft.summary,
        full_explanation: draft.full_explanation,
        fun_fact: draft.fun_fact,
        image_url: selected.hdurl || selected.url,
        source_name: 'NASA APOD',
        source_url: `https://apod.nasa.gov/apod/ap${sourceDate.replaceAll('-', '').slice(2)}.html`,
        category: 'Astronomy',
        published_date: new Date(`${sourceDate}T00:00:00Z`).toISOString(),
        ai_generated: aiGenerated,
        status: 'published',
      })
      .select('id, external_id, status')
      .limit(1)
      .single();
    if (error) throw error;

    return res.status(201).json({ ok: true, item: data, status: 'published', aiGenerated });
  } catch (error) {
    console.error('[daily-space-news] pipeline failed:', error);
    return res.status(500).json({ error: 'Daily space-news pipeline failed' });
  }
}
