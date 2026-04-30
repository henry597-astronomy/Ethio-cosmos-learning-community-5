import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FallbackImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function FallbackImage({ 
  src, 
  alt, 
  className = '', 
  fallbackClassName = '' 
}: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-slate-800 rounded-lg',
          fallbackClassName
        )}
        aria-label={alt}
      >
        <span className="text-4xl">🌌</span>
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

export default FallbackImage;
