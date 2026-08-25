-- Approved display-time translations for official learning content only.
-- Source CMS tables remain unchanged. News, channel, comments, profiles, shorts,
-- live chat, and private messages are intentionally not valid source types.
create table if not exists public.content_localizations (
  source_type text not null check (source_type in (
    'homepage', 'topic', 'subtopic', 'lesson', 'quiz', 'quiz_question', 'material', 'about'
  )),
  source_id text not null,
  field text not null,
  locale text not null check (locale in ('en', 'am')),
  source_hash text not null,
  translated_value text not null,
  status text not null default 'machine' check (status in ('machine', 'reviewed')),
  source_updated_at timestamptz,
  translated_at timestamptz not null default timezone('utc', now()),
  reviewed_by uuid,
  primary key (source_type, source_id, field, locale)
);

alter table public.content_localizations enable row level security;

drop policy if exists "public can read official content localizations" on public.content_localizations;
create policy "public can read official content localizations"
  on public.content_localizations
  for select
  to anon, authenticated
  using (true);

create index if not exists content_localizations_source_lookup
  on public.content_localizations (source_type, source_id, field, locale, source_hash);
