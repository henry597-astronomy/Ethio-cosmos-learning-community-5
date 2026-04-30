import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackText?: string;
}

/**
 * Image component that gracefully handles missing or broken sources without
 * breaking the surrounding layout. Used by lesson content, gallery items, etc.
 */
export function SafeImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fallbackText,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
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
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

export default SafeImage;
