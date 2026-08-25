/**
 * API configuration for the EthioCosmos application.
 * Native builds must always use the current production API host so an old
 * VITE_API_BASE_URL cannot strand an installed APK on a retired deployment.
 */

export const PRODUCTION_URL = 'https://ethio-cosmos-learning-community-5.vercel.app';

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed, 'http://localhost');
    const apiPathIndex = parsed.pathname.toLowerCase().indexOf('/api');
    if (apiPathIndex >= 0) {
      parsed.pathname = parsed.pathname.slice(0, apiPathIndex) || '/';
      parsed.search = '';
      parsed.hash = '';
    }
    const normalized = parsed.toString().replace(/\/+$/, '');
    return normalized === 'http://localhost' ? '' : normalized;
  } catch {
    return trimmed.replace(/\/api(?:\/.*)?$/i, '').replace(/\/+$/, '');
  }
}

const configuredWebBaseUrl = typeof import.meta.env.VITE_API_BASE_URL === 'string'
  ? normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
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
