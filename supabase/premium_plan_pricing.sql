-- Configure the manual Premium plans requested by the administrator.
-- Existing entitlements and payment submissions are not modified.

INSERT INTO public.premium_plans (key, name, description, price_birr, duration_days, is_active)
VALUES
  ('premium_monthly', 'Premium Monthly', 'Premium access for 30 days.', 50, 30, true),
  ('premium_annual', 'Premium Annual', 'Premium access for 365 days.', 300, 365, true)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_birr = EXCLUDED.price_birr,
    duration_days = EXCLUDED.duration_days,
    is_active = EXCLUDED.is_active;
