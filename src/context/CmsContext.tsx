import { createContext, useContext, type ReactNode } from 'react';

/**
 * CmsContext is now a lightweight shell.
 *
 * The old version fired 9 Supabase queries the moment the app loaded —
 * before login, during login, always. On Supabase free tier this flooded
 * the connection pool and caused login to appear frozen for minutes.
 *
 * Fix: each page now fetches only the data it actually needs, only when
 * the user visits that page. Nothing fires at app startup.
 *
 * Hooks that individual pages use (useTopics, useQuizzes, etc.) are still
 * exported from use-cms-data.ts — pages just call them directly.
 */
interface CmsContextType {
  // Intentionally empty — pages fetch their own data lazily.
  // This shell exists so any existing useCms() calls don't break.
  _placeholder: true;
}

const CmsContext = createContext<CmsContextType>({ _placeholder: true });

export function CmsProvider({ children }: { children: ReactNode }) {
  // No queries here. Zero. Pages load their own data.
  return (
    <CmsContext.Provider value={{ _placeholder: true }}>
      {children}
    </CmsContext.Provider>
  );
}

export function useCms() {
  return useContext(CmsContext);
}
