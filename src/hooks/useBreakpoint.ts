import { useState, useEffect, useMemo } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const BREAKPOINT_VALUES: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINT_VALUES['2xl']) return '2xl';
  if (width >= BREAKPOINT_VALUES.xl) return 'xl';
  if (width >= BREAKPOINT_VALUES.lg) return 'lg';
  if (width >= BREAKPOINT_VALUES.md) return 'md';
  if (width >= BREAKPOINT_VALUES.sm) return 'sm';
  return 'xs';
}

const DEBOUNCE_MS = 100;

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window !== 'undefined') {
      return getBreakpoint(window.innerWidth);
    }
    return 'lg';
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setBreakpoint(getBreakpoint(window.innerWidth));
      }, DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return {
    breakpoint,
    isXs: breakpoint === 'xs',
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2xl: breakpoint === '2xl',
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md' || breakpoint === 'lg',
    isDesktop: breakpoint === 'xl' || breakpoint === '2xl',
  } as const;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${BREAKPOINT_VALUES.md - 1}px)`);
}

export function useIsTablet() {
  const isMobile = useIsMobile();
  return useMediaQuery(`(min-width: ${BREAKPOINT_VALUES.md}px) and (max-width: ${BREAKPOINT_VALUES.lg - 1}px)`) && !isMobile;
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINT_VALUES.lg}px)`);
}

export function useIsDarkMode() {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

export function useIsReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    setOrientation(mediaQuery.matches ? 'portrait' : 'landscape');

    const handler = (event: MediaQueryListEvent) => {
      setOrientation(event.matches ? 'portrait' : 'landscape');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return orientation;
}
