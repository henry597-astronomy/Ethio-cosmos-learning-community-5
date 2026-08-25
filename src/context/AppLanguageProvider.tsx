import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  APP_LANGUAGE_STORAGE_KEY,
  AppLanguageContext,
  type AppLanguage,
} from '@/context/AppLanguageContext';

const DEFAULT_LANGUAGE: AppLanguage = 'en';

function readStoredLanguage(storageKey: string): AppLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  return window.localStorage.getItem(storageKey) === 'am' ? 'am' : DEFAULT_LANGUAGE;
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = `${APP_LANGUAGE_STORAGE_KEY}:${user?.id ?? 'guest'}`;
  const [language, setLanguageState] = useState<AppLanguage>(() => readStoredLanguage(storageKey));
  const [hydratedKey, setHydratedKey] = useState(storageKey);

  useEffect(() => {
    const storedLanguage = readStoredLanguage(storageKey);
    document.documentElement.lang = storedLanguage === 'am' ? 'am' : 'en';
    const hydrationTimer = window.setTimeout(() => {
      setLanguageState(storedLanguage);
      setHydratedKey(storageKey);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [storageKey]);

  useEffect(() => {
    // Wait until the new account preference is hydrated before writing.
    if (hydratedKey !== storageKey) return;
    window.localStorage.setItem(storageKey, language);
    document.documentElement.lang = language === 'am' ? 'am' : 'en';
  }, [hydratedKey, language, storageKey]);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    languageName: language === 'am' ? 'አማርኛ' : 'English',
  }), [language]);

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  );
}
