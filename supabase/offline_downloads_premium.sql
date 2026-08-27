-- Enforce the product rule: offline topic/material downloads are Premium-only.
-- This changes only the feature flag and is safe to run repeatedly.
UPDATE public.premium_features
SET is_premium = true
WHERE key = 'offline_learning_packs';
