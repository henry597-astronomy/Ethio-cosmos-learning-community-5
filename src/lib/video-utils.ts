/**
 * Video utility functions for YouTube, TikTok, Google Drive, and direct files.
 * Social share URLs are never treated as native video files.
 */

import { getApiUrl } from '@/lib/api-config';

export type VideoType = 'youtube' | 'tiktok' | 'google-drive' | 'direct' | 'unknown';

function parseUrl(value: string): URL | null {
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

/** Extract a YouTube video ID from watch, Shorts, embed, or short URLs. */
export function extractYouTubeVideoId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (host !== 'youtube.com' && host !== 'www.youtube.com' && host !== 'm.youtube.com') {
    return null;
  }

  const queryId = parsed.searchParams.get('v');
  if (queryId && /^[a-zA-Z0-9_-]{11}$/.test(queryId)) return queryId;

  const pathMatch = parsed.pathname.match(/^\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/i);
  return pathMatch?.[1] || null;
}

/**
 * Extract a TikTok post ID from canonical TikTok URLs and official player URLs.
 * Redirect-style links such as vt.tiktok.com/Z... do not contain the post ID;
 * resolveVideoUrl() handles those through the server-side redirect resolver.
 */
export function extractTikTokVideoId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();
  if (!host.endsWith('tiktok.com')) return null;

  const canonicalMatch = parsed.pathname.match(/\/@[\w.-]+\/video\/(\d+)/i);
  if (canonicalMatch?.[1]) return canonicalMatch[1];

  const playerMatch = parsed.pathname.match(/\/player\/v1\/(\d+)/i);
  if (playerMatch?.[1]) return playerMatch[1];

  const legacyMatch = parsed.pathname.match(/\/v\/(\d+)/i);
  return legacyMatch?.[1] || null;
}

/** Extract a Google Drive file ID from common Drive URL formats. */
export function extractGoogleDriveId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed || !parsed.hostname.toLowerCase().endsWith('google.com')) return null;

  const match = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/)
    || parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]{25,})/)
    || parsed.searchParams.get('id')?.match(/^([a-zA-Z0-9_-]{25,})$/);
  return match ? match[1] : null;
}

/** Determine the type of a video URL without assuming every HTTP URL is a file. */
export function getVideoType(url: string): VideoType {
  const parsed = parseUrl(url);
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) return 'unknown';

  const host = parsed.hostname.toLowerCase();
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be' || host === 'www.youtu.be') {
    return 'youtube';
  }

  if (host === 'drive.google.com' || host === 'docs.google.com') return 'google-drive';
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';

  const pathname = parsed.pathname.toLowerCase();
  if (['.mp4', '.webm', '.ogg', '.mov', '.m4v'].some((ext) => pathname.endsWith(ext))) return 'direct';

  return 'unknown';
}

/** Convert a supported URL into an official iframe player URL. */
export function getEmbedUrl(url: string): string | null {
  const type = getVideoType(url);

  if (type === 'youtube') {
    const videoId = extractYouTubeVideoId(url);
    return videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`
      : null;
  }

  if (type === 'google-drive') {
    const fileId = extractGoogleDriveId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  }

  if (type === 'tiktok') {
    const videoId = extractTikTokVideoId(url);
    return videoId
      ? `https://www.tiktok.com/player/v1/${videoId}?controls=1&description=1&music_info=1`
      : null;
  }

  return null;
}

/**
 * Resolve redirect-style TikTok shares such as vt.tiktok.com/Z... or vm.tiktok.com/Z...
 * through the production API. Canonical links return immediately without a network call.
 */
export async function resolveVideoUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('A video URL is required.');
  if (getVideoType(trimmed) !== 'tiktok' || getEmbedUrl(trimmed)) return trimmed;

  const response = await fetch(getApiUrl('/api/video/resolve'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmed }),
  });

  const payload = await response.json().catch(() => null) as { url?: unknown; error?: unknown } | null;
  if (!response.ok || typeof payload?.url !== 'string') {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'Could not resolve the TikTok link.');
  }

  return payload.url;
}
