import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PremiumProvider = 'manual' | 'chapa' | 'arifpay';

export type PremiumProviderConfig = {
  provider: PremiumProvider;
  readyForCheckout: boolean;
  reason: string;
};

export async function getPublicFeatureStatus(
  featureKey: string,
): Promise<{ isPremium: boolean; error: string | null }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { isPremium: true, error: 'Supabase Premium configuration is unavailable' };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client
    .from('premium_features')
    .select('is_premium')
    .eq('key', featureKey)
    .maybeSingle();

  if (error || !data) {
    return { isPremium: true, error: error?.message || 'Premium feature is not configured' };
  }
  return { isPremium: data.is_premium === true, error: null };
}

export async function hasPremiumFeature(
  client: SupabaseClient,
  featureKey: string,
): Promise<{ allowed: boolean; error: string | null }> {
  const { data, error } = await client.rpc('user_has_premium_feature', {
    requested_feature: featureKey,
  });

  if (error) {
    return { allowed: false, error: error.message };
  }

  return { allowed: data === true, error: null };
}

export async function requirePremiumFeature(
  client: SupabaseClient,
  featureKey: string,
): Promise<{ allowed: true } | { allowed: false; status: 403 | 500; message: string }> {
  const result = await hasPremiumFeature(client, featureKey);
  if (result.error) {
    console.error(`[premium] Feature access lookup failed for ${featureKey}:`, result.error);
    return { allowed: false, status: 500, message: 'Unable to verify Premium access' };
  }
  if (!result.allowed) {
    return { allowed: false, status: 403, message: 'Premium access is required for this feature' };
  }
  return { allowed: true };
}

export function getPremiumProviderConfig(): PremiumProviderConfig {
  const configuredProvider = (process.env.PREMIUM_PAYMENT_PROVIDER || 'manual').trim().toLowerCase();
  const provider: PremiumProvider = configuredProvider === 'chapa' || configuredProvider === 'arifpay'
    ? configuredProvider
    : 'manual';

  if (provider === 'manual') {
    return {
      provider,
      readyForCheckout: false,
      reason: 'No Ethiopian payment provider is connected. Manual Admin grants are the only active access path.',
    };
  }

  // These names are intentionally server-only placeholders for a later provider
  // adapter. Do not add values to source, Git, the browser bundle, or the APK.
  const hasProviderSecret = provider === 'chapa'
    ? Boolean(process.env.CHAPA_SECRET_KEY)
    : Boolean(process.env.ARIFPAY_SECRET_KEY);
  const hasWebhookSecret = Boolean(process.env.PREMIUM_PROVIDER_WEBHOOK_SECRET);

  if (!hasProviderSecret || !hasWebhookSecret) {
    return {
      provider,
      readyForCheckout: false,
      reason: `${provider} is selected but its server-only credentials/webhook secret are not configured.`,
    };
  }

  return {
    provider,
    readyForCheckout: false,
    reason: `${provider} credentials are present, but its official checkout and webhook adapter is intentionally disabled until the merchant account and provider documentation are reviewed.`,
  };
}
