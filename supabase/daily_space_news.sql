-- Daily Space News: isolated table with draft-first publishing.
create table if not exists public.space_news (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title text not null,
  summary text not null,
  full_explanation text,
  fun_fact text,
  image_url text,
  source_name text not null default 'NASA',
  source_url text not null,
  category text not null default 'Astronomy',
  published_date timestamptz not null,
  ai_generated boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists space_news_published_idx
  on public.space_news (status, published_date desc);

alter table public.space_news enable row level security;

 drop policy if exists "Published space news is publicly readable" on public.space_news;
create policy "Published space news is publicly readable"
  on public.space_news for select
  using (status = 'published');

 drop policy if exists "Admins manage space news" on public.space_news;
create policy "Admins manage space news"
  on public.space_news for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create or replace function public.set_space_news_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_space_news_updated_at on public.space_news;
create trigger set_space_news_updated_at
before update on public.space_news
for each row execute function public.set_space_news_updated_at();
