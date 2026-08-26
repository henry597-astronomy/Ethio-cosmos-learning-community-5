import { useContext } from 'react';
import { PremiumContext, type PremiumContextValue } from '@/context/premium-context';

export function usePremium(): PremiumContextValue {
  const context = useContext(PremiumContext);
  if (!context) throw new Error('usePremium must be used inside PremiumProvider');
  return context;
}
