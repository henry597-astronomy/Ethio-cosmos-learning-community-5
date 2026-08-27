export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function extractGoogleDriveId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function extractVimeoVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? match[1] : null;
}

export function extractTikTokVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/video\/(\d+)/) || url.match(/\/v\/(\d+)/);
  if (match) return match[1];

  const shortMatch = url.match(/tiktok\.com\/.*\/(\d+)/);
  if (shortMatch) return shortMatch[1];

  return null;
}

export function getVideoType(url: string): 'youtube' | 'vimeo' | 'tiktok' | 'drive' | 'google-drive' | 'direct' | 'unknown' {
  if (!url) return 'unknown';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('tiktok.com') || url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
  if (url.includes('drive.google.com') || url.includes('docs.google.com')) return 'drive';
  if (url.match(/\.(mp4|webm|ogg|mov)(#|\?|$)/i) || url.startsWith('blob:')) return 'direct';
  return 'direct';
}

export async function resolveVideoUrl(url: string): Promise<string> {
  if (!url) return url;
  if (url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com')) {
    try {
      const res = await fetch('/api/video/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) return data.url;
      }
    } catch (err) {
      console.error('Failed to resolve TikTok URL via API:', err);
    }
  }
  return url;
}

export function getEmbedUrl(url: string): string | null {
  const type = getVideoType(url);

  if (type === 'youtube') {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=1` : null;
  }

  if (type === 'vimeo') {
    const videoId = extractVimeoVideoId(url);
    return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0` : null;
  }

  if (type === 'drive' || type === 'google-drive') {
    const fileId = extractGoogleDriveId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  }

  if (type === 'tiktok') {
    const videoId = extractTikTokVideoId(url);
    return videoId ? `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1&loop=1` : null;
  }

  return null;
}

/** Returns a public preview image for hosted links that expose a stable thumbnail URL. */
export function getVideoPreviewUrl(url: string): string | null {
  const type = getVideoType(url);
  if (type === 'youtube') {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  }
  if (type === 'vimeo') {
    const videoId = extractVimeoVideoId(url);
    return videoId ? `https://vumbnail.com/${videoId}.jpg` : null;
  }
  if (type === 'drive' || type === 'google-drive') {
    const fileId = extractGoogleDriveId(url);
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w640` : null;
  }
  return null;
}
