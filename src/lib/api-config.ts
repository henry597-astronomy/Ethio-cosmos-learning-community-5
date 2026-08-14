/**
 * API configuration for the EthioCosmos application.
 * Handles the base URL for API calls, ensuring they work on both web and mobile.
 */

// Production Vercel URL as the default fallback for mobile builds
export const PRODUCTION_URL = 'https://ethio-cosmos-learning-community-5.vercel.app';

// Determine the API base URL based on environment
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || PRODUCTION_URL;

/**
 * Utility to get the full API URL for a given relative path.
 * If the path already starts with http/https, it returns it as is.
 */
export const getApiUrl = (path: string): string => {
  if (path.startsWith('http')) return path;
  
  // Ensure the path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // On mobile (Capacitor), relative URLs won't work for API calls to the server.
  // We force the production URL if we're not in a browser environment that handles relative paths.
  return `${API_BASE_URL}${normalizedPath}`;
};
