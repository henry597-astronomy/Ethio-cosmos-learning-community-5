import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import { PremiumContext, type PremiumEntitlement, type PremiumFeature, type PremiumSettings } from '@/context/premium-context';

function isCurrentlyActive(entitlement: PremiumEntitlement): boolean {
  const now = Date.now();
  return entitlement.status === 'active'
    && new Date(entitlement.starts_at).getTime() <= now
    && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > now);
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [entitlements, setEntitlements] = useState<PremiumEntitlement[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResult, featuresResult, entitlementsResult] = await Promise.all([
        supabase.from('premium_settings').select('id, is_enabled').eq('id', 'global').maybeSingle(),
        supabase.from('premium_features').select('key, is_premium'),
        user
          ? supabase.from('premium_entitlements').select('id, status, source, starts_at, expires_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!settingsResult.error && settingsResult.data) {
        setGlobalEnabled(Boolean((settingsResult.data as PremiumSettings).is_enabled));
      }
      if (!featuresResult.error) {
        setFeatures((featuresResult.data || []) as PremiumFeature[]);
      }
      if (!entitlementsResult.error) {
        setEntitlements((entitlementsResult.data || []) as PremiumEntitlement[]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handle = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(handle);
  }, [refresh]);

  const hasActiveGrant = useMemo(() => entitlements.some(isCurrentlyActive), [entitlements]);
  const featureMap = useMemo(() => new Map(features.map((feature) => [feature.key, feature])), [features]);

  const isPremiumFeature = useCallback((featureKey: string) => Boolean(featureMap.get(featureKey)?.is_premium), [featureMap]);
  const canUse = useCallback((featureKey: string) => {
    const feature = featureMap.get(featureKey);
    if (!feature) return false;
    if (!feature.is_premium) return true;
    if (!globalEnabled) return false;
    return hasActiveGrant;
  }, [featureMap, globalEnabled, hasActiveGrant]);

  const value = useMemo(() => ({
    loading,
    globalEnabled,
    features,
    entitlements,
    hasActiveGrant,
    isPremiumFeature,
    canUse,
    refresh,
  }), [loading, globalEnabled, features, entitlements, hasActiveGrant, isPremiumFeature, canUse, refresh]);

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

