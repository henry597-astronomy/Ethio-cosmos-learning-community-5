-- Manual Premium payment evidence submitted by users for Admin review.
-- This does not process payments or grant Premium automatically.

CREATE TABLE IF NOT EXISTS public.premium_payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key text REFERENCES public.premium_plans(key) ON DELETE SET NULL,
  plan_name text NOT NULL DEFAULT 'Premium access' CHECK (char_length(plan_name) BETWEEN 1 AND 160),
  amount_birr numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount_birr > 0),
  payment_method text NOT NULL CHECK (char_length(payment_method) BETWEEN 1 AND 80),
  transaction_reference text NOT NULL CHECK (char_length(transaction_reference) BETWEEN 1 AND 160),
  user_note text NOT NULL DEFAULT '' CHECK (char_length(user_note) <= 1200),
  proof_path text,
  proof_mime_type text,
  proof_size_bytes bigint,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_note text NOT NULL DEFAULT '' CHECK (char_length(admin_note) <= 1200),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT premium_payment_submissions_proof_metadata CHECK (
    (proof_path IS NULL AND proof_mime_type IS NULL AND proof_size_bytes IS NULL)
    OR (
      proof_path IS NOT NULL
      AND proof_mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
      AND proof_size_bytes > 0
      AND proof_size_bytes <= 10485760
    )
  ),
  CONSTRAINT premium_payment_submissions_review_metadata CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS premium_payment_submissions_created_idx
  ON public.premium_payment_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS premium_payment_submissions_user_created_idx
  ON public.premium_payment_submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS premium_payment_submissions_status_created_idx
  ON public.premium_payment_submissions (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS premium_payment_submissions_one_pending_per_user_idx
  ON public.premium_payment_submissions (user_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.touch_premium_payment_submission_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS premium_payment_submissions_updated_at ON public.premium_payment_submissions;
CREATE TRIGGER premium_payment_submissions_updated_at
  BEFORE UPDATE ON public.premium_payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_premium_payment_submission_updated_at();

CREATE OR REPLACE FUNCTION public.protect_premium_payment_submission_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF TG_OP = 'INSERT' AND NOT public.is_active_admin() THEN
      IF NEW.user_id IS DISTINCT FROM auth.uid()
         OR NEW.status <> 'pending'
         OR NEW.reviewed_by IS NOT NULL
         OR NEW.reviewed_at IS NOT NULL
         OR NEW.admin_note <> ''
         OR (NEW.proof_path IS NOT NULL AND NEW.proof_path NOT LIKE auth.uid()::text || '/%') THEN
        RAISE EXCEPTION 'Payment submissions must belong to the current user and start pending';
      END IF;
      IF regexp_match(
        format('%s %s %s', NEW.payment_method, NEW.transaction_reference, NEW.user_note),
        '\y(pin|password|otp|cvv|cvc|card(\s+number)?|api[\s-]?key|secret)\y'
      ) IS NOT NULL THEN
        RAISE EXCEPTION 'Do not store payment credentials or secrets in a payment submission';
      END IF;
    ELSIF TG_OP = 'UPDATE' AND public.is_active_admin() THEN
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.user_id IS DISTINCT FROM OLD.user_id
         OR NEW.plan_key IS DISTINCT FROM OLD.plan_key
         OR NEW.plan_name IS DISTINCT FROM OLD.plan_name
         OR NEW.amount_birr IS DISTINCT FROM OLD.amount_birr
         OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
         OR NEW.transaction_reference IS DISTINCT FROM OLD.transaction_reference
         OR NEW.user_note IS DISTINCT FROM OLD.user_note
         OR NEW.proof_path IS DISTINCT FROM OLD.proof_path
         OR NEW.proof_mime_type IS DISTINCT FROM OLD.proof_mime_type
         OR NEW.proof_size_bytes IS DISTINCT FROM OLD.proof_size_bytes
         OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Only payment submission review fields can be changed';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Only an active administrator can update payment submissions';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_premium_payment_submission_fields ON public.premium_payment_submissions;
CREATE TRIGGER protect_premium_payment_submission_fields
  BEFORE INSERT OR UPDATE ON public.premium_payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_premium_payment_submission_fields();

ALTER TABLE public.premium_payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own payment submissions" ON public.premium_payment_submissions;
CREATE POLICY "Users can read their own payment submissions"
  ON public.premium_payment_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own payment submissions" ON public.premium_payment_submissions;
CREATE POLICY "Users can create their own payment submissions"
  ON public.premium_payment_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND admin_note = ''
  );

DROP POLICY IF EXISTS "Admins read payment submissions" ON public.premium_payment_submissions;
CREATE POLICY "Admins read payment submissions"
  ON public.premium_payment_submissions
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS "Admins review payment submissions" ON public.premium_payment_submissions;
CREATE POLICY "Admins review payment submissions"
  ON public.premium_payment_submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (
    public.is_active_admin()
    AND status IN ('approved', 'rejected')
    AND reviewed_by = auth.uid()
    AND reviewed_at IS NOT NULL
  );

GRANT SELECT, INSERT ON public.premium_payment_submissions TO authenticated;
GRANT UPDATE ON public.premium_payment_submissions TO authenticated;

REVOKE ALL ON FUNCTION public.touch_premium_payment_submission_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_premium_payment_submission_updated_at() TO service_role;
REVOKE ALL ON FUNCTION public.protect_premium_payment_submission_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_premium_payment_submission_fields() TO service_role;

-- A separate private bucket keeps payment evidence isolated from the existing
-- public uploads and Shorts buckets. The allowlist is enforced by Storage too.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[];

DROP POLICY IF EXISTS "Users upload their own payment proofs" ON storage.objects;
CREATE POLICY "Users upload their own payment proofs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp', 'pdf'])
  );

DROP POLICY IF EXISTS "Users read their own payment proofs" ON storage.objects;
CREATE POLICY "Users read their own payment proofs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete their own payment proofs" ON storage.objects;
CREATE POLICY "Users delete their own payment proofs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins read payment proofs" ON storage.objects;
CREATE POLICY "Admins read payment proofs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins delete payment proofs" ON storage.objects;
CREATE POLICY "Admins delete payment proofs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.is_active_admin());
