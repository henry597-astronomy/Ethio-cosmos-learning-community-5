-- Connect manual Admin payment approval to the existing Premium entitlement path.
-- This remains manual verification: no payment provider or automatic payment processing is added.

ALTER TABLE public.premium_entitlements
  ADD COLUMN IF NOT EXISTS payment_submission_id uuid
  REFERENCES public.premium_payment_submissions(id) ON DELETE SET NULL;

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

REVOKE ALL ON FUNCTION public.protect_premium_payment_submission_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_premium_payment_submission_fields() TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS premium_entitlements_payment_submission_idx
  ON public.premium_entitlements (payment_submission_id)
  WHERE payment_submission_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.review_premium_payment_submission(
  p_submission_id uuid,
  p_status text,
  p_admin_note text DEFAULT ''
)
RETURNS public.premium_payment_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission public.premium_payment_submissions;
  v_plan_duration integer := 30;
  v_starts_at timestamptz := now();
  v_expires_at timestamptz;
  v_review_note text := left(coalesce(p_admin_note, ''), 1200);
  v_result public.premium_payment_submissions;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Only an active administrator can review payment submissions';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Payment submission status must be approved or rejected';
  END IF;
  IF length(coalesce(p_admin_note, '')) > 1200 THEN
    RAISE EXCEPTION 'The administrator note is too long';
  END IF;

  SELECT *
  INTO v_submission
  FROM public.premium_payment_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment submission was not found';
  END IF;
  IF v_submission.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending payment submissions can be reviewed';
  END IF;

  IF p_status = 'approved' THEN
    IF v_submission.plan_key IS NOT NULL THEN
      SELECT duration_days
      INTO v_plan_duration
      FROM public.premium_plans
      WHERE key = v_submission.plan_key;
    END IF;
    IF v_plan_duration IS NULL OR v_plan_duration < 1 OR v_plan_duration > 3650 THEN
      v_plan_duration := 30;
    END IF;
    v_expires_at := v_starts_at + make_interval(days => v_plan_duration);

    INSERT INTO public.premium_entitlements (
      user_id,
      status,
      source,
      starts_at,
      expires_at,
      note,
      granted_by,
      payment_submission_id
    )
    VALUES (
      v_submission.user_id,
      'active',
      'payment',
      v_starts_at,
      v_expires_at,
      left(format('Payment submission %s approved.%s', p_submission_id, CASE WHEN v_review_note = '' THEN '' ELSE ' ' || v_review_note END), 1200),
      auth.uid(),
      p_submission_id
    )
    ON CONFLICT (payment_submission_id) WHERE payment_submission_id IS NOT NULL DO NOTHING;
  END IF;

  UPDATE public.premium_payment_submissions
  SET
    status = p_status,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    admin_note = v_review_note
  WHERE id = p_submission_id
    AND status = 'pending'
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment submission review could not be completed';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_approved_premium_payment_submission(
  p_submission_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission public.premium_payment_submissions;
  v_plan_duration integer := 30;
  v_starts_at timestamptz := now();
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Only an active administrator can sync Premium access';
  END IF;

  SELECT *
  INTO v_submission
  FROM public.premium_payment_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment submission was not found';
  END IF;
  IF v_submission.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved payment submissions can be synced';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.premium_entitlements
    WHERE payment_submission_id = p_submission_id
  ) THEN
    RETURN true;
  END IF;

  IF v_submission.plan_key IS NOT NULL THEN
    SELECT duration_days
    INTO v_plan_duration
    FROM public.premium_plans
    WHERE key = v_submission.plan_key;
  END IF;
  IF v_plan_duration IS NULL OR v_plan_duration < 1 OR v_plan_duration > 3650 THEN
    v_plan_duration := 30;
  END IF;

  INSERT INTO public.premium_entitlements (
    user_id,
    status,
    source,
    starts_at,
    expires_at,
    note,
    granted_by,
    payment_submission_id
  )
  VALUES (
    v_submission.user_id,
    'active',
    'payment',
    v_starts_at,
    v_starts_at + make_interval(days => v_plan_duration),
    left(format('Legacy approved payment submission %s synced to Premium access.', p_submission_id), 1200),
    auth.uid(),
    p_submission_id
  )
  ON CONFLICT (payment_submission_id) WHERE payment_submission_id IS NOT NULL DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.review_premium_payment_submission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_premium_payment_submission(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.sync_approved_premium_payment_submission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_approved_premium_payment_submission(uuid) TO authenticated;

-- Repair approved submissions created before approval was connected to entitlements.
DO $$
DECLARE
  v_submission record;
  v_plan_duration integer;
BEGIN
  FOR v_submission IN
    SELECT s.id, s.user_id, s.plan_key
    FROM public.premium_payment_submissions s
    WHERE s.status = 'approved'
      AND NOT EXISTS (
        SELECT 1
        FROM public.premium_entitlements e
        WHERE e.payment_submission_id = s.id
      )
    ORDER BY s.reviewed_at
    LIMIT 500
  LOOP
    v_plan_duration := 30;
    IF v_submission.plan_key IS NOT NULL THEN
      SELECT duration_days
      INTO v_plan_duration
      FROM public.premium_plans
      WHERE key = v_submission.plan_key;
    END IF;
    IF v_plan_duration IS NULL OR v_plan_duration < 1 OR v_plan_duration > 3650 THEN
      v_plan_duration := 30;
    END IF;

    INSERT INTO public.premium_entitlements (
      user_id,
      status,
      source,
      starts_at,
      expires_at,
      note,
      granted_by,
      payment_submission_id
    )
    SELECT
      v_submission.user_id,
      'active',
      'payment',
      now(),
      now() + make_interval(days => v_plan_duration),
      left(format('Approved payment submission %s synchronized to Premium access.', v_submission.id), 1200),
      s.reviewed_by,
      v_submission.id
    FROM public.premium_payment_submissions s
    WHERE s.id = v_submission.id
    ON CONFLICT (payment_submission_id) WHERE payment_submission_id IS NOT NULL DO NOTHING;
  END LOOP;
END;
$$;
