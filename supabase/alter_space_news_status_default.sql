-- Alter space_news status default to published so items appear automatically
alter table public.space_news alter column status set default 'published';

-- Update existing drafts to published if desired
update public.space_news set status = 'published' where status = 'draft';
