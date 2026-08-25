import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { getApiUrl, PRODUCTION_URL } from '@/lib/api-config';

export type OfficialSourceType =
  | 'homepage'
  | 'topic'
  | 'subtopic'
  | 'lesson'
  | 'quiz'
  | 'quiz_question'
  | 'material'
  | 'about';

export type OfficialTranslationRequest = {
  sourceType: OfficialSourceType;
  sourceId: string;
  field: string;
  locale: 'en' | 'am';
  sourceText: string;
  sourceUpdatedAt?: string;
};

type TranslationResponse = {
  translatedValue?: unknown;
  error?: unknown;
};

const TRANSLATION_PATH = '/api/content/translate';
const CONNECT_TIMEOUT_MS = 10_000;
const READ_TIMEOUT_MS = 30_000;

function validateResponse(data: TranslationResponse | null, status: number): string {
  if (status < 200 || status >= 300) {
    const detail = typeof data?.error === 'string' ? data.error : `Translation request failed (${status})`;
    throw new Error(detail);
  }
  if (typeof data?.translatedValue !== 'string' || !data.translatedValue.trim()) {
    throw new Error('Translation service returned an invalid response.');
  }
  return data.translatedValue.trim();
}

async function requestTranslation(url: string, request: OfficialTranslationRequest): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.post({
      url,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      data: request,
      connectTimeout: CONNECT_TIMEOUT_MS,
      readTimeout: READ_TIMEOUT_MS,
      responseType: 'json',
    });
    return validateResponse(response.data as TranslationResponse | null, response.status);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
    body: JSON.stringify(request),
  });
  const data = await response.json().catch(() => null) as TranslationResponse | null;
  return validateResponse(data, response.status);
}

export async function getOfficialTranslation(request: OfficialTranslationRequest): Promise<string> {
  if (request.locale === 'en') return request.sourceText;
  const primaryUrl = getApiUrl(TRANSLATION_PATH);
  const productionUrl = `${PRODUCTION_URL}${TRANSLATION_PATH}`;

  try {
    return await requestTranslation(primaryUrl, request);
  } catch (primaryError) {
    console.warn('Primary official translation endpoint failed; retrying production endpoint.', primaryError);
    if (primaryUrl === productionUrl) throw primaryError;
    return requestTranslation(productionUrl, request);
  }
}
