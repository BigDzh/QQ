import { useEffect, useCallback, useRef, useState } from 'react';

// ARIA attributes and accessibility utilities

interface ARIAProps {
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-disabled'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-hidden'?: boolean;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-pressed'?: boolean;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  'aria-controls'?: string;
  'aria-owns'?: string;
  'aria-flowto'?: string;
  tabIndex?: number;
}

/**
 * Generate ARIA props for common patterns
 */
export function getARIAProps(pattern: keyof typeof ARIAPatterns, options?: Record<string, any>): ARIAProps {
  const base = ARIAPatterns[pattern];
  return { ...base, ...options } as ARIAProps;
}

const ARIAPatterns = {
  button: {
    role: 'button',
    tabIndex: 0,
  } as ARIAProps,

  dialog: {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': undefined,
  } as ARIAProps,

  modal: {
    role: 'dialog',
    'aria-modal': true,
  } as ARIAProps,

  alert: {
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': true,
  } as ARIAProps,

  status: {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': true,
  } as ARIAProps,

  log: {
    role: 'log',
    'aria-live': 'polite',
  } as ARIAProps,

  marquee: {
    role: 'marquee',
    'aria-live': 'off',
  } as ARIAProps,

  menu: {
    role: 'menu',
    'aria-label': undefined,
  } as ARIAProps,

  menuItem: {
    role: 'menuitem',
    tabIndex: -1,
  } as ARIAProps,

  menuBar: {
    role: 'menubar',
  } as ARIAProps,

  navigation: {
    role: 'navigation',
    'aria-label': 'Main navigation',
  } as ARIAProps,

  main: {
    role: 'main',
  } as ARIAProps,

  search: {
    role: 'search',
    'aria-label': 'Search',
  } as ARIAProps,

  form: {
    role: 'form',
    'aria-label': undefined,
  } as ARIAProps,

  listbox: {
    role: 'listbox',
    'aria-expanded': undefined,
    'aria-label': undefined,
  } as ARIAProps,

  combobox: {
    role: 'combobox',
    'aria-expanded': undefined,
    'aria-autocomplete': 'list',
    'aria-label': undefined,
  } as ARIAProps,

  tablist: {
    role: 'tablist',
    'aria-label': undefined,
  } as ARIAProps,

  tab: {
    role: 'tab',
    tabIndex: 0,
    'aria-selected': undefined,
  } as ARIAProps,

  tabpanel: {
    role: 'tabpanel',
    'aria-labelledby': undefined,
  } as ARIAProps,

  slider: {
    role: 'slider',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': undefined,
    'aria-valuetext': undefined,
  } as ARIAProps,

  spinner: {
    role: 'progressbar',
    'aria-valuenow': undefined,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-busy': true,
  } as ARIAProps,

  tooltip: {
    role: 'tooltip',
  } as ARIAProps,

  tree: {
    role: 'tree',
    'aria-multiselectable': false,
    'aria-label': undefined,
  } as ARIAProps,

  treeItem: {
    role: 'treeitem',
    'aria-expanded': undefined,
    'aria-level': undefined,
    'aria-setsize': undefined,
    'aria-posinset': undefined,
  } as ARIAProps,

  grid: {
    role: 'grid',
    'aria-rowcount': undefined,
    'aria-colcount': undefined,
  } as ARIAProps,

  gridCell: {
    role: 'gridcell',
    'aria-rowindex': undefined,
    'aria-colindex': undefined,
  } as ARIAProps,
};

/**
 * Custom hook for keyboard navigation
 */
export function useKeyboardNavigation(options: {
  itemsCount: number;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  autoFocus?: boolean;
}) {
  const {
    itemsCount,
    onSelect,
    onEscape,
    orientation = 'both',
    loop = true,
    autoFocus = false,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(autoFocus ? 0 : -1);
  const containerRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    let newIndex = focusedIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = focusedIndex < itemsCount - 1 ? focusedIndex + 1 : (loop ? 0 : focusedIndex);
        }
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = focusedIndex > 0 ? focusedIndex - 1 : (loop ? itemsCount - 1 : focusedIndex);
        }
        break;

      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        newIndex = itemsCount - 1;
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && onSelect) {
          onSelect(focusedIndex);
        }
        return;

      case 'Escape':
        e.preventDefault();
        if (onEscape) {
          onEscape();
        }
        setFocusedIndex(-1);
        return;

      default:
        // Handle letter keys for quick navigation
        if (/^[a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          // Find next item starting with this letter
          // This would need access to item labels in a real implementation
          newIndex = Math.min(focusedIndex + 1, itemsCount - 1);
        }
        return;
    }

    if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < itemsCount) {
      setFocusedIndex(newIndex);
    }
  }, [focusedIndex, itemsCount, onSelect, onEscape, orientation, loop]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { containerRef, focusedIndex, setFocusedIndex };
}

/**
 * Custom hook for focus trap (modals, dialogs)
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      firstElement.focus();

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          e.preventDefault();

          if (e.shiftKey) {
            // Shift+Tab: go to last element
            if (document.activeElement === firstElement) {
              lastElement.focus();
            } else {
              const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);
              if (currentIndex > 0) {
                focusableElements[currentIndex - 1].focus();
              } else {
                lastElement.focus();
              }
            }
          } else {
            // Tab: go to first element
            if (document.activeElement === lastElement) {
              firstElement.focus();
            } else {
              const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement);
              if (currentIndex < focusableElements.length - 1) {
                focusableElements[currentIndex + 1].focus();
              } else {
                firstElement.focus();
              }
            }
          }
        }
      };

      container.addEventListener('keydown', handleTabKey);

      return () => {
        container.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isActive]);

  return containerRef;
}

/**
 * Custom hook for announcing to screen readers
 */
export function useAnnouncer() {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = '';

      // Force re-render
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = message;
        }
      }, 50);
    }
  }, []);

  return { announceRef, announce };
}

/**
 * Skip link component for keyboard users
 */
export function SkipLink({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={(e) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
          target.tabIndex = -1;
          target.focus({ preventScroll: false });
        }
      }}
      style={{
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        zIndex: 9999,
      }}
    >
      {children}
    </a>
  );
}

/**
 * Visually hidden text for screen readers
 */
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Reduced motion preference hook
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

/**
 * High contrast mode preference hook
 */
export function usePrefersHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersHighContrast;
}
