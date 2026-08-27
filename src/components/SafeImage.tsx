import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getOfflineData, getOfflineMediaKey } from '@/lib/offline-cache';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackText?: string;
}

/**
 * Image component that gracefully handles missing or broken sources without
 * breaking the surrounding layout. Explicitly downloaded media is preferred
 * while offline; normal online image behavior remains unchanged.
 */
export function SafeImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fallbackText,
}: SafeImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setResolvedSrc(src);
    setHasError(false);

    if (typeof navigator === 'undefined' || navigator.onLine || !src) return undefined;

    void getOfflineData<Blob>(getOfflineMediaKey(src)).then((blob) => {
      if (!active || !blob || typeof blob.arrayBuffer !== 'function') return;
      objectUrl = URL.createObjectURL(blob);
      setResolvedSrc(objectUrl);
    }).catch(() => {
      // The normal image request will still have a chance to use a service
      // worker cache or fall through to the existing visual fallback.
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (hasError || !resolvedSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-slate-800 rounded-lg text-gray-400 text-sm p-6',
          fallbackClassName || className
        )}
        role="img"
        aria-label={alt}
      >
        <span className="mr-2 text-2xl" aria-hidden="true">🌌</span>
        {fallbackText ?? 'Image unavailable'}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

export default SafeImage;
