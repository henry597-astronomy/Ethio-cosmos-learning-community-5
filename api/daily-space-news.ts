import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type NasaApod = {
  date?: string;
  title?: string;
  explanation?: string;
  url?: string;
  hdurl?: string;
  media_type?: string;
  service_version?: string;
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
  const fallback = fallbackDraft(apod);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { draft: fallback, aiGenerated: false };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a careful astronomy educator. Rewrite only the supplied NASA text for Ethiopian high-school students in simple English. Do not add facts not supported by the source. Return JSON with title, summary, full_explanation, and fun_fact. Do not include source links or image URLs.',
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
    console.error('[daily-space-news] AI draft failed; using source fallback:', error);
    return { draft: fallback, aiGenerated: false };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const nasaKey = process.env.NASA_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!nasaKey || !supabaseUrl || !serviceRoleKey) {
    console.error('[daily-space-news] Missing NASA_API_KEY, VITE_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server configuration is incomplete' });
  }

  try {
    const nasaResponse = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(nasaKey)}`);
    if (!nasaResponse.ok) throw new Error(`NASA request failed with ${nasaResponse.status}`);
    const apod = await nasaResponse.json() as NasaApod;
    if (apod.media_type !== 'image' || !apod.date || !apod.explanation || !apod.title || !apod.url) {
      return res.status(422).json({ error: 'NASA returned an unusable astronomy item' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const externalId = `nasa-apod-${apod.date}`;
    const { data: existing, error: existingError } = await supabase
      .from('space_news')
      .select('id')
      .eq('external_id', externalId)
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return res.status(200).json({ ok: true, skipped: true, reason: 'already_exists' });

    const { draft, aiGenerated } = await createStudentDraft(apod);
    const { data, error } = await supabase
      .from('space_news')
      .insert({
        external_id: externalId,
        title: draft.title,
        summary: draft.summary,
        full_explanation: draft.full_explanation,
        fun_fact: draft.fun_fact,
        image_url: apod.hdurl || apod.url,
        source_name: 'NASA APOD',
        source_url: `https://apod.nasa.gov/apod/ap${apod.date.replaceAll('-', '').slice(2)}.html`,
        category: 'Astronomy',
        published_date: `${apod.date}T00:00:00.000Z`,
        ai_generated: aiGenerated,
        status: 'draft',
      })
      .select('id, external_id, status')
      .limit(1)
      .single();
    if (error) throw error;

    return res.status(201).json({ ok: true, item: data, status: 'draft', aiGenerated });
  } catch (error) {
    console.error('[daily-space-news] pipeline failed:', error);
    return res.status(500).json({ error: 'Daily space-news pipeline failed' });
  }
}
