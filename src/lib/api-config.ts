/**
 * API configuration for the EthioCosmos application.
 * Native builds must always use the current production API host so an old
 * VITE_API_BASE_URL cannot strand an installed APK on a retired deployment.
 */

export const PRODUCTION_URL = 'https://ethio-cosmos-learning-community-5.vercel.app';

const configuredWebBaseUrl = typeof import.meta.env.VITE_API_BASE_URL === 'string'
  ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, '')
  : '';

function isNativeApp(): boolean {
  const nativeCapacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return Boolean(nativeCapacitor?.isNativePlatform?.());
}

export const getApiUrl = (path: string): string => {
  if (path.startsWith('http')) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = isNativeApp() || !configuredWebBaseUrl
    ? PRODUCTION_URL
    : configuredWebBaseUrl;

  return `${baseUrl}${normalizedPath}`;
};
