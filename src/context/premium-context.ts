import { createContext } from 'react';

export type PremiumSettings = {
  id: string;
  is_enabled: boolean;
};

export type PremiumFeature = {
  key: string;
  is_premium: boolean;
};

export type PremiumEntitlement = {
  id: string;
  status: 'active' | 'revoked';
  source: 'manual' | 'payment' | 'test';
  starts_at: string;
  expires_at: string | null;
};

export type PremiumContextValue = {
  loading: boolean;
  globalEnabled: boolean;
  features: PremiumFeature[];
  entitlements: PremiumEntitlement[];
  hasActiveGrant: boolean;
  isPremiumFeature: (featureKey: string) => boolean;
  canUse: (featureKey: string) => boolean;
  refresh: () => Promise<void>;
};

export const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);
