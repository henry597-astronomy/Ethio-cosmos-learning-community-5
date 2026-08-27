-- External Shorts storage metadata and bounded R2 free-tier accounting.
-- Existing rows remain Supabase-backed because storage_provider defaults to 'supabase'.

ALTER TABLE public.shorts
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS video_size_bytes BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shorts_storage_provider_check'
      AND conrelid = 'public.shorts'::regclass
  ) THEN
    ALTER TABLE public.shorts
      ADD CONSTRAINT shorts_storage_provider_check
      CHECK (storage_provider IN ('supabase', 'r2'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS shorts_storage_provider_key_idx
  ON public.shorts (storage_provider, storage_key);

CREATE TABLE IF NOT EXISTS public.short_r2_usage (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  reserved_bytes BIGINT NOT NULL DEFAULT 0 CHECK (reserved_bytes >= 0),
  committed_bytes BIGINT NOT NULL DEFAULT 0 CHECK (committed_bytes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.short_r2_usage (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.short_r2_uploads (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  requested_bytes BIGINT NOT NULL CHECK (requested_bytes > 0),
  content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'committed', 'cancelled', 'expired')),
  short_id UUID REFERENCES public.shorts(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS short_r2_uploads_owner_status_idx
  ON public.short_r2_uploads (user_id, status, expires_at);

ALTER TABLE public.short_r2_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_r2_uploads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.short_r2_usage FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.short_r2_uploads FROM PUBLIC, anon, authenticated;

-- These functions are called only by the server with the Supabase service role.
-- They make the free-tier cap atomic across concurrent Admin uploads.
CREATE OR REPLACE FUNCTION public.reserve_short_r2_upload(
  p_upload_id UUID,
  p_user_id UUID,
  p_object_key TEXT,
  p_requested_bytes BIGINT,
  p_content_type TEXT,
  p_expires_at TIMESTAMPTZ,
  p_max_bytes BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reclaimed_bytes BIGINT := 0;
  affected_rows INTEGER := 0;
BEGIN
  IF p_requested_bytes IS NULL OR p_requested_bytes <= 0
     OR p_max_bytes IS NULL OR p_max_bytes <= 0
     OR p_expires_at IS NULL OR p_expires_at <= NOW()
     OR p_user_id IS NULL OR p_object_key IS NULL OR p_object_key = ''
     OR p_content_type IS NULL OR p_content_type = '' THEN
    RETURN FALSE;
  END IF;

  -- Serialize all reservations against the singleton usage row. This prevents
  -- concurrent Admin uploads from double-reclaiming expired reservations or
  -- exceeding the application cap.
  PERFORM 1 FROM public.short_r2_usage WHERE id = TRUE FOR UPDATE;

  -- Reclaim abandoned reservations whenever a new upload starts.
  SELECT COALESCE(SUM(requested_bytes), 0)
    INTO reclaimed_bytes
    FROM public.short_r2_uploads
   WHERE status = 'reserved'
     AND expires_at <= NOW();

  IF reclaimed_bytes > 0 THEN
    UPDATE public.short_r2_uploads
       SET status = 'expired', updated_at = NOW()
     WHERE status = 'reserved'
       AND expires_at <= NOW();
  END IF;

  UPDATE public.short_r2_usage
     SET reserved_bytes = GREATEST(0, reserved_bytes - reclaimed_bytes),
         updated_at = NOW()
   WHERE id = TRUE;

  INSERT INTO public.short_r2_uploads (
    id, user_id, object_key, requested_bytes, content_type, expires_at
  )
  VALUES (
    p_upload_id, p_user_id, p_object_key, p_requested_bytes, p_content_type, p_expires_at
  );

  UPDATE public.short_r2_usage
     SET reserved_bytes = reserved_bytes + p_requested_bytes,
         updated_at = NOW()
   WHERE id = TRUE
     AND reserved_bytes + committed_bytes + p_requested_bytes <= p_max_bytes;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows = 0 THEN
    DELETE FROM public.short_r2_uploads WHERE id = p_upload_id;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_short_r2_upload(
  p_upload_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested BIGINT;
BEGIN
  SELECT requested_bytes
    INTO requested
    FROM public.short_r2_uploads
   WHERE id = p_upload_id
     AND user_id = p_user_id
     AND status = 'reserved'
   FOR UPDATE;

  IF requested IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.short_r2_uploads
     SET status = 'cancelled', updated_at = NOW()
   WHERE id = p_upload_id;

  UPDATE public.short_r2_usage
     SET reserved_bytes = GREATEST(0, reserved_bytes - requested),
         updated_at = NOW()
   WHERE id = TRUE;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_short_r2_upload(
  p_upload_id UUID,
  p_user_id UUID,
  p_actual_bytes BIGINT,
  p_video_url TEXT,
  p_caption TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upload_row public.short_r2_uploads%ROWTYPE;
  new_short_id UUID;
BEGIN
  SELECT *
    INTO upload_row
    FROM public.short_r2_uploads
   WHERE id = p_upload_id
     AND user_id = p_user_id
     AND status = 'reserved'
     AND expires_at > NOW()
   FOR UPDATE;

  IF upload_row.id IS NULL THEN
    RAISE EXCEPTION 'R2 upload reservation is missing or expired';
  END IF;

  IF p_actual_bytes IS NULL OR p_actual_bytes <= 0
     OR p_actual_bytes > upload_row.requested_bytes
     OR p_video_url IS NULL OR length(p_video_url) > 2048 THEN
    RAISE EXCEPTION 'R2 upload metadata is invalid';
  END IF;

  INSERT INTO public.shorts (
    user_id,
    video_url,
    caption,
    is_active,
    storage_provider,
    storage_key,
    video_size_bytes
  )
  VALUES (
    p_user_id,
    p_video_url,
    COALESCE(NULLIF(left(p_caption, 500), ''), 'New short'),
    TRUE,
    'r2',
    upload_row.object_key,
    p_actual_bytes
  )
  RETURNING id INTO new_short_id;

  UPDATE public.short_r2_usage
     SET reserved_bytes = GREATEST(0, reserved_bytes - upload_row.requested_bytes),
         committed_bytes = committed_bytes + p_actual_bytes,
         updated_at = NOW()
   WHERE id = TRUE;

  UPDATE public.short_r2_uploads
     SET status = 'committed', short_id = new_short_id, updated_at = NOW()
   WHERE id = p_upload_id;

  RETURN jsonb_build_object(
    'short_id', new_short_id,
    'video_url', p_video_url,
    'storage_provider', 'r2'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_short_r2_metadata(
  p_short_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_bytes BIGINT;
BEGIN
  SELECT video_size_bytes
    INTO stored_bytes
    FROM public.shorts
   WHERE id = p_short_id
     AND storage_provider = 'r2'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.shorts WHERE id = p_short_id;

  UPDATE public.short_r2_usage
     SET committed_bytes = GREATEST(0, committed_bytes - COALESCE(stored_bytes, 0)),
         updated_at = NOW()
   WHERE id = TRUE;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_short_r2_upload(UUID, UUID, TEXT, BIGINT, TEXT, TIMESTAMPTZ, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_short_r2_upload(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_short_r2_upload(UUID, UUID, BIGINT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_short_r2_metadata(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_short_r2_upload(UUID, UUID, TEXT, BIGINT, TEXT, TIMESTAMPTZ, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_short_r2_upload(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_short_r2_upload(UUID, UUID, BIGINT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_short_r2_metadata(UUID) TO service_role;

COMMENT ON TABLE public.short_r2_usage IS 'Server-only accounting for the bounded no-cost R2 Shorts quota; does not include existing Supabase videos.';
COMMENT ON TABLE public.short_r2_uploads IS 'Server-only R2 upload reservations used to enforce the application quota and finalize uploads safely.';
COMMENT ON COLUMN public.shorts.storage_key IS 'Non-secret R2 object key for provider-aware deletion; never stores an API credential.';
COMMENT ON COLUMN public.shorts.video_size_bytes IS 'Verified R2 object size used for quota accounting; NULL for legacy/external links.';
