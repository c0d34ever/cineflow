import React, { useState, useRef, useEffect } from 'react';
import { imageCache } from '../utils/imageCache';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: () => void;
  loading?: 'lazy' | 'eager';
}

/**
 * Lazy-loaded image component with progressive loading
 * Shows placeholder while loading, then fades in the actual image
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  onError,
  onLoad,
  loading = 'lazy'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager' || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px' // Start loading 50px before image enters viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loading, isInView]);

  // Image URL state with caching
  const [cachedImageUrl, setCachedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isInView || cachedImageUrl) return;

    // Try to get from cache or fetch
    imageCache.getImage(src)
      .then(url => setCachedImageUrl(url))
      .catch(() => {
        // Fallback to direct URL if cache fails
        setCachedImageUrl(src);
      });
  }, [isInView, src, cachedImageUrl]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  const defaultPlaceholder = (
    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
      <div className="text-zinc-600 text-2xl">🎬</div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0">
          {placeholder || defaultPlaceholder}
        </div>
      )}

      {/* Actual Image */}
      {isInView && (cachedImageUrl || src) && (cachedImageUrl || src).trim() !== '' && (
        <img
          ref={imgRef}
          src={cachedImageUrl || src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${hasError ? 'hidden' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
        />
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0">
          {defaultPlaceholder}
        </div>
      )}
    </div>
  );
};

export default LazyImage;

