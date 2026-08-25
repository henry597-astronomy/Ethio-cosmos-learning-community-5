import { useEffect, useState } from 'react';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { cacheOfflineData, getOfflineData } from '@/lib/offline-cache';
import {
  getOfficialTranslation,
  type OfficialSourceType,
} from '@/services/official-translation';

type LocalizedOfficialTextProps = {
  sourceType: OfficialSourceType;
  sourceId: string;
  field: string;
  sourceText: string;
  sourceUpdatedAt?: string;
  className?: string;
};

type ResolvedTranslation = {
  key: string;
  text: string;
};

function stableTextKey(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function getTranslationCacheKey(props: LocalizedOfficialTextProps): string {
  return [
    'official_translation',
    props.sourceType,
    props.sourceId,
    props.field,
    props.sourceUpdatedAt || 'no-version',
    stableTextKey(props.sourceText),
  ].join(':');
}

export default function LocalizedOfficialText({
  sourceType,
  sourceId,
  field,
  sourceText,
  sourceUpdatedAt,
  className,
}: LocalizedOfficialTextProps) {
  const { language } = useAppLanguage();
  const translationKey = getTranslationCacheKey({
    sourceType,
    sourceId,
    field,
    sourceText,
    sourceUpdatedAt,
  });
  const [resolvedTranslation, setResolvedTranslation] = useState<ResolvedTranslation>({
    key: '',
    text: '',
  });

  useEffect(() => {
    let cancelled = false;

    if (language === 'en' || !sourceText.trim()) return () => {
      cancelled = true;
    };

    const loadTranslation = async () => {
      try {
        const cached = await getOfflineData<string>(translationKey);
        if (!cancelled && cached) {
          setResolvedTranslation({ key: translationKey, text: cached });
          return;
        }
      } catch (error) {
        console.warn('Official translation cache read skipped:', error);
      }

      try {
        const translated = await getOfficialTranslation({
          sourceType,
          sourceId,
          field,
          locale: language,
          sourceText,
          sourceUpdatedAt,
        });
        await cacheOfflineData(translationKey, translated).catch((error) => {
          console.warn('Official translation cache write skipped:', error);
        });
        if (!cancelled) setResolvedTranslation({ key: translationKey, text: translated });
      } catch (error) {
        // Keep the immutable source text visible if translation is unavailable.
        console.warn('Official translation unavailable; showing source text:', error);
      }
    };

    void loadTranslation();
    return () => {
      cancelled = true;
    };
  }, [field, language, sourceId, sourceText, sourceType, sourceUpdatedAt, translationKey]);

  const displayText = language === 'am' && resolvedTranslation.key === translationKey
    ? resolvedTranslation.text
    : sourceText;
  if (className) return <span className={className}>{displayText}</span>;
  return <>{displayText}</>;
}
