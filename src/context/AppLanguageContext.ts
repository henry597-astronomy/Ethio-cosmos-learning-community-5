import { createContext, useContext } from 'react';

export type AppLanguage = 'en' | 'am';

export const APP_LANGUAGE_STORAGE_KEY = 'ethio-cosmos-language';

export type AppLanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  languageName: string;
};

export const AppLanguageContext = createContext<AppLanguageContextValue | undefined>(undefined);

export function useAppLanguage(): AppLanguageContextValue {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error('useAppLanguage must be used inside AppLanguageProvider');
  }
  return context;
}
