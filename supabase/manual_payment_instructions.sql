-- Admin-managed manual payment instructions.
-- These values are intentionally public payment destination details, not banking secrets.
-- Never store passwords, PINs, OTPs, API keys, or card data here.

ALTER TABLE public.premium_settings
  ADD COLUMN IF NOT EXISTS manual_payment_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_payment_method text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manual_payment_receiver_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manual_payment_account text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manual_payment_instructions text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.premium_settings.manual_payment_enabled IS
  'Whether the public Premium screen should show the configured manual payment destination.';
COMMENT ON COLUMN public.premium_settings.manual_payment_method IS
  'Public payment method label such as CBE or telebirr; never a secret.';
COMMENT ON COLUMN public.premium_settings.manual_payment_receiver_name IS
  'Public legal receiver name shown to payers for confirmation.';
COMMENT ON COLUMN public.premium_settings.manual_payment_account IS
  'Public account or phone identifier intended for receiving Premium payments; never a PIN or credential.';
COMMENT ON COLUMN public.premium_settings.manual_payment_instructions IS
  'Public instructions for a payer; do not include confidential banking information.';

-- Existing premium_settings RLS already allows public SELECT and active-Admin writes.
-- Existing premium_settings audit trigger records these updates with updated_by/auth.uid().
