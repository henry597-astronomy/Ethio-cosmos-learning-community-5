/**
 * Video utility functions for handling different video sources
 * Supports: YouTube, Google Drive, and Direct Video Files
 */

export type VideoType = 'youtube' | 'google-drive' | 'direct' | 'unknown';

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortUrlMatch) return shortUrlMatch[1];
    const longUrlMatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (longUrlMatch) return longUrlMatch[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts Google Drive file ID from various Drive URL formats
 */
export function extractGoogleDriveId(url: string): string | null {
  if (!url) return null;
  try {
    // Matches /file/d/FILE_ID/ or id=FILE_ID
    const match = url.match(/(?:\/file\/d\/|id=)([a-zA-Z0-9_-]{25,})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Determines the type of video URL
 */
export function getVideoType(url: string): VideoType {
  if (!url) return 'unknown';

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }

  if (url.includes('drive.google.com')) {
    return 'google-drive';
  }

  const directExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  if (directExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'direct';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'direct';
  }

  return 'unknown';
}

/**
 * Converts a video URL to an embeddable iframe URL
 */
export function getEmbedUrl(url: string): string | null {
  const type = getVideoType(url);
  
  if (type === 'youtube') {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1` : null;
  }

  if (type === 'google-drive') {
    const fileId = extractGoogleDriveId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  }

  return null;
}
