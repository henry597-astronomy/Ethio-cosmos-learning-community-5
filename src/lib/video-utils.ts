/**
 * Video utility functions for handling different video sources
 * Supports both direct video URLs and YouTube embedded links
 */

export type VideoType = 'youtube' | 'direct' | 'unknown';

/**
 * Extracts YouTube video ID from various YouTube URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&t=...
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  try {
    // Handle youtu.be short URLs
    const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortUrlMatch) return shortUrlMatch[1];

    // Handle youtube.com URLs
    const longUrlMatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (longUrlMatch) return longUrlMatch[1];

    // Handle already embedded URLs
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Determines the type of video URL
 */
export function getVideoType(url: string): VideoType {
  if (!url) return 'unknown';

  // Check if it's a YouTube URL
  if (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('youtube-nocookie.com')
  ) {
    return 'youtube';
  }

  // Check if it's a direct video file (common video extensions)
  if (
    url.endsWith('.mp4') ||
    url.endsWith('.webm') ||
    url.endsWith('.ogg') ||
    url.endsWith('.mov') ||
    url.includes('.mp4?') ||
    url.includes('.webm?') ||
    url.includes('.ogg?')
  ) {
    return 'direct';
  }

  // If it looks like a URL but we can't determine the type, assume direct
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'direct';
  }

  return 'unknown';
}

/**
 * Converts a YouTube URL to an embeddable iframe URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  // Use youtube-nocookie.com for privacy
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Validates if a URL is a valid video URL
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url) return false;

  const videoType = getVideoType(url);

  if (videoType === 'youtube') {
    return extractYouTubeVideoId(url) !== null;
  }

  if (videoType === 'direct') {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
