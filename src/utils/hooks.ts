import {
  useCallback,
  useRef,
  useEffect,
  useState,
  type DependencyList,
} from 'react';

export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ deps: DependencyList; value: T } | null>(null);

  if (!ref.current || !depsAreEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

function depsAreEqual(prevDeps: DependencyList, nextDeps: DependencyList): boolean {
  if (prevDeps.length !== nextDeps.length) return false;

  for (let i = 0; i < prevDeps.length; i++) {
    if (!deepEqual(prevDeps[i], nextDeps[i])) return false;
  }

  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    if (arrA.length !== arrB.length) return false;
    return arrA.every((item, index) => deepEqual(item, arrB[index]));
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => deepEqual(
    (a as Record<string, unknown>)[key],
    (b as Record<string, unknown>)[key]
  ));
}

export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  callbackRef.current = callback;

  const stableCallback = useCallback((...args: Parameters<T>): ReturnType<T> => {
    return callbackRef.current(...args);
  }, []);

  return stableCallback as T;
}

export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  return useCallback(callback, deps);
}

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottledValue<T>(value: T, delay: number = 300): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdateRef = useRef<number>(0);
  const pendingValueRef = useRef(value);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    pendingValueRef.current = value;

    if (timeSinceLastUpdate >= delay) {
      lastUpdateRef.current = now;
      setThrottledValue(value);
    } else {
      const remainingDelay = delay - timeSinceLastUpdate;
      const timer = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setThrottledValue(pendingValueRef.current);
      }, remainingDelay);

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}

export function useToggle(initialValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setValueDirect = useCallback((newValue: boolean) => setValue(newValue), []);

  return [value, toggle, setValueDirect];
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
): {
  loading: boolean;
  error: Error | null;
  value: T | null;
  execute: () => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<{
    loading: boolean;
    error: Error | null;
    value: T | null;
  }>({
    loading: immediate,
    error: null,
    value: null,
  });

  const execute = useCallback(async () => {
    setState({ loading: true, error: null, value: null });
    
    try {
      const value = await asyncFunction();
      setState({ loading: false, error: null, value });
    } catch (error) {
      setState({ loading: false, error: error as Error, value: null });
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, value: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return { ...state, execute, reset };
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);
    
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return windowSize;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    
    mediaQuery.addEventListener('change', handler);
    setMatches(mediaQuery.matches);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<null | HTMLElement>, IntersectionObserverEntry | null] {
  const ref = useRef<HTMLElement | null>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return [ref as React.RefObject<null | HTMLElement>, entry];
}

export function useClickOutside(
  handler: () => void
): React.RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler]);

  return ref;
}

export function useScrollLock(lock: boolean = true): void {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    if (lock) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [lock]);
}

export function useCopyToClipboard(text: string): { copy: () => void; copied: boolean } {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [text]);

  return { copy, copied };
}
