import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getApiUrl } from '@/lib/api-config';

const ANALYTICS_ID_KEY = 'ethio-anonymous-analytics-id';
const FIRST_OPEN_VERSION_KEY = 'ethio-apk-first-open-version';
const APP_VERSION_CODE = 22;
const RELEASE_TAG = 'v1.9.3';

let nativeOpenPromise: Promise<void> | null = null;

type AnalyticsEventName = 'apk_download_click' | 'apk_first_open' | 'apk_open';
type AnalyticsPlatform = 'web' | 'android';

function createAnonymousId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2);
  return `ethio-${Date.now().toString(36)}-${randomPart}`;
}

async function getAnonymousId(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const stored = await Preferences.get({ key: ANALYTICS_ID_KEY });
    if (stored.value) return stored.value;

    const created = createAnonymousId();
    await Preferences.set({ key: ANALYTICS_ID_KEY, value: created });
    return created;
  }

  const existing = window.localStorage.getItem(ANALYTICS_ID_KEY);
  if (existing) return existing;

  const created = createAnonymousId();
  window.localStorage.setItem(ANALYTICS_ID_KEY, created);
  return created;
}

async function recordEvent(eventName: AnalyticsEventName, platform: AnalyticsPlatform): Promise<boolean> {
  try {
    const anonymousId = await getAnonymousId();
    const response = await fetch(getApiUrl('/api/analytics/event'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        anonymousId,
        platform,
        appVersion: platform === 'android' ? APP_VERSION_CODE : null,
        releaseTag: platform === 'android' ? RELEASE_TAG : null,
      }),
      keepalive: eventName === 'apk_download_click',
    });
    return response.ok;
  } catch {
    // Analytics must never block navigation, login, or app startup.
    return false;
  }
}

export function recordApkDownloadClick(): void {
  void recordEvent('apk_download_click', 'web');
}

export function recordAndroidAppOpen(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (nativeOpenPromise) return nativeOpenPromise;

  nativeOpenPromise = (async () => {
    await recordEvent('apk_open', 'android');

    const firstOpenVersion = await Preferences.get({ key: FIRST_OPEN_VERSION_KEY });
    if (firstOpenVersion.value === String(APP_VERSION_CODE)) return;

    const recorded = await recordEvent('apk_first_open', 'android');
    if (recorded) {
      await Preferences.set({ key: FIRST_OPEN_VERSION_KEY, value: String(APP_VERSION_CODE) });
    }
  })();

  return nativeOpenPromise;
}

export const APK_ANALYTICS_VERSION = APP_VERSION_CODE;
export const APK_ANALYTICS_RELEASE = RELEASE_TAG;
