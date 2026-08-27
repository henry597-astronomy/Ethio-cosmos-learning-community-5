-- Tighten payment-submission validation after the initial additive migration.

ALTER TABLE public.premium_payment_submissions
  DROP CONSTRAINT IF EXISTS premium_payment_submissions_amount_birr_check;
ALTER TABLE public.premium_payment_submissions
  ADD CONSTRAINT premium_payment_submissions_amount_birr_check CHECK (amount_birr > 0);

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
