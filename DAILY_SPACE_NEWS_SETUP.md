# Daily Space News setup

The feature is implemented as a draft-first pipeline. It fetches NASA Astronomy Picture of the Day on the server, optionally simplifies the source text with an AI provider, saves the result as a draft, and shows only published rows on the Home page.

## Required one-time setup

Apply `supabase/daily_space_news.sql` to the live Supabase project. Review it before applying because the repository could not verify the live project schema automatically.

Add these variables to Vercel for Production, Preview, and Development as appropriate:

```text
NASA_API_KEY=the replacement NASA key
SUPABASE_SERVICE_ROLE_KEY=the Supabase service-role key
CRON_SECRET=a long random secret
GROQ_API_KEY=optional; enables AI simplification
GROQ_MODEL=llama-3.3-70b-versatile
```

`NASA_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and `GROQ_API_KEY` are server-only. They must never use the `VITE_` prefix and must never be committed to GitHub.

## Operation

Vercel invokes `/api/daily-space-news` once per day using the schedule in `vercel.json`. The endpoint requires the `CRON_SECRET` bearer token, reads NASA content, prevents duplicates using the NASA date, and saves each new row with `status = 'draft'`.

An administrator opens the **Admin → space-news** tab, reviews the item, and chooses **Publish**. Published content then appears in the daily card in the Home-page hero area. If no published item exists, the existing Home hero remains unchanged.

If `GROQ_API_KEY` is absent or the Groq request fails, the pipeline keeps a validated source-based draft instead of saving broken content. This fallback is intentionally marked `ai_generated = false` so it can be reviewed honestly.
