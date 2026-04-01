import { useEffect, useRef, useState, useCallback } from 'react';

interface UseLazyImageOptions {
  src: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

interface UseLazyImageReturn {
  isLoaded: boolean;
  isInView: boolean;
  error: Error | null;
  ref: React.RefObject<HTMLDivElement>;
  currentSrc: string | null;
}

export function useLazyImage({
  src,
  placeholder,
  threshold = 0.1,
  rootMargin = '100px',
  enabled = true,
}: UseLazyImageOptions): UseLazyImageReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string | null>(placeholder || null);
  const ref = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsInView(true);
      setCurrentSrc(src);
      return;
    }

    const element = ref.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setCurrentSrc(src);
            observerRef.current?.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, enabled, threshold, rootMargin]);

  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setIsLoaded(true);
      setCurrentSrc(src);
      setError(null);
    };

    img.onerror = () => {
      setError(new Error(`Failed to load image: ${src}`));
      setIsLoaded(false);
    };
  }, [isInView, src]);

  return {
    isLoaded,
    isInView,
    error,
    ref,
    currentSrc,
  };
}

interface LazyImageProps extends UseLazyImageOptions {
  className?: string;
  alt: string;
  style?: React.CSSProperties;
  wrapperClassName?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function LazyImage({
  src,
  placeholder,
  threshold = 0.1,
  rootMargin = '100px',
  enabled = true,
  className = '',
  alt,
  style,
  wrapperClassName = '',
  onLoad,
  onError,
}: LazyImageProps) {
  const { isLoaded, isInView, error, ref, currentSrc } = useLazyImage({
    src,
    placeholder,
    threshold,
    rootMargin,
    enabled,
  });

  useEffect(() => {
    if (isLoaded && onLoad) {
      onLoad();
    }
  }, [isLoaded, onLoad]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  return (
    <div ref={ref} className={wrapperClassName} style={{ position: 'relative', overflow: 'hidden' }}>
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          style={{
            ...style,
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      {!isLoaded && placeholder && (
        <img
          src={placeholder}
          alt=""
          className={`absolute inset-0 ${className}`}
          style={{
            ...style,
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}