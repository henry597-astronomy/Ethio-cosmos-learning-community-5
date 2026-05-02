/**
 * Video utility functions for handling different video sources
 * Supports: YouTube (including Shorts), Google Drive, Cloudinary, and Direct Video Files
 */

export type VideoType = 'youtube' | 'google-drive' | 'cloudinary' | 'direct' | 'unknown';

/**
 * Extracts YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    // Matches youtu.be/ID
    const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortUrlMatch) return shortUrlMatch[1];
    
    // Matches youtube.com/shorts/ID
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    // Matches youtube.com/watch?v=ID or youtube.com/embed/ID
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
    // Matches /file/d/FILE_ID/ or id=FILE_ID or /open?id=FILE_ID
    const match = url.match(/(?:\/file\/d\/|id=|\/d\/)([a-zA-Z0-9_-]{25,})/);
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

  if (url.includes('cloudinary.com')) {
    return 'cloudinary';
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
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview?rm=minimal` : null;
  }

  if (type === 'cloudinary') {
    // If it's already an embed URL, return it as is
    if (url.includes('/embed/')) {
      return url;
    }
    // Otherwise, try to handle basic Cloudinary video URLs if needed
    // For now, we assume the user provides the embed URL as requested
    return url;
  }

  return null;
}
