import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface BackButtonProps {
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  fallbackPath?: string;
  preserveState?: boolean;
}

export function BackButton({
  className = '',
  children,
  showIcon = true,
  fallbackPath,
  preserveState = true,
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useThemeStyles();
  const isNavigatingRef = useRef(false);
  const locationKeyRef = useRef(location.pathname);

  useEffect(() => {
    locationKeyRef.current = location.pathname;
  }, [location.pathname]);

  const handleBack = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    if (window.history.length > 1 && preserveState) {
      const scrollY = window.scrollY;
      sessionStorage.setItem(`scroll_${locationKeyRef.current}`, String(scrollY));

      navigate(-1 as any, { replace: true });

      setTimeout(() => {
        const savedScroll = sessionStorage.getItem(`scroll_${locationKeyRef.current}`);
        if (savedScroll) {
          window.scrollTo(0, parseInt(savedScroll, 10));
          sessionStorage.removeItem(`scroll_${locationKeyRef.current}`);
        }
        isNavigatingRef.current = false;
      }, 100);
    } else if (fallbackPath) {
      navigate(fallbackPath, { replace: true });
      isNavigatingRef.current = false;
    } else {
      navigate(-1 as any, { replace: true });
      isNavigatingRef.current = false;
    }
  }, [navigate, fallbackPath, preserveState]);

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 ${t.textSecondary} hover:${t.text} transition-colors ${className}`}
    >
      {showIcon && <ArrowLeft size={20} />}
      {children || '返回'}
    </button>
  );
}

interface ScrollRestorationProps {
  children: React.ReactNode;
}

export function ScrollRestoration({ children }: ScrollRestorationProps) {
  const location = useLocation();
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }

    const path = location.pathname;
    const savedPosition = sessionStorage.getItem(`scroll_${path}`);
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      window.scrollTo(0, position);
      sessionStorage.removeItem(`scroll_${path}`);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoringRef.current) {
        scrollPositionsRef.current.set(location.pathname, window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  return <>{children}</>;
}

interface PageStateProviderProps {
  children: React.ReactNode;
}

export function PageStateProvider({ children }: PageStateProviderProps) {
  return (
    <ScrollRestoration>
      {children}
    </ScrollRestoration>
  );
}

export default BackButton;
