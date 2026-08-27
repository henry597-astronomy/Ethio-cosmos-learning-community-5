-- Idempotently link approved payment submissions created before automatic
-- entitlement creation was connected to the manual Admin review flow.

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
