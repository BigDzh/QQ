import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export interface PageState {
  scrollPosition: number;
  formData?: Record<string, any>;
  filters?: Record<string, any>;
  expandedItems?: string[];
  activeTab?: string;
  [key: string]: any;
}

export interface PageEntry {
  path: string;
  state: PageState;
  timestamp: number;
  scrollY?: number;
}

export interface NavigationEntry {
  path: string;
  scrollPosition: number;
  state?: any;
}

const MAX_HISTORY_SIZE = 50;

class PageNavigatorStore {
  private history: NavigationEntry[] = [];
  private scrollPositions: Map<string, number> = new Map();
  private pageStates: Map<string, PageState> = new Map();

  getHistory(): NavigationEntry[] {
    return this.history;
  }

  getLastPath(): string | null {
    if (this.history.length < 2) return null;
    return this.history[this.history.length - 2].path;
  }

  addEntry(path: string, scrollPosition: number = 0, state?: any) {
    this.history.push({ path, scrollPosition, state });
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history.shift();
    }
  }

  recordNavigation(from: string, to: string, scrollY: number = 0) {
    this.scrollPositions.set(from, scrollY);
    this.addEntry(to, scrollY);
  }

  getScrollPosition(path: string): number {
    return this.scrollPositions.get(path) || 0;
  }

  savePageState(path: string, state: PageState) {
    this.pageStates.set(path, { ...state, timestamp: Date.now() });
  }

  getPageState(path: string): PageState | null {
    const state = this.pageStates.get(path);
    if (!state) return null;
    const age = Date.now() - state.timestamp;
    if (age > 30 * 60 * 1000) {
      this.pageStates.delete(path);
      return null;
    }
    return state;
  }

  clear() {
    this.history = [];
    this.scrollPositions.clear();
    this.pageStates.clear();
  }
}

const globalStore = new PageNavigatorStore();

export function usePageNavigator() {
  const navigate = useNavigate();
  const currentPathRef = useRef<string>('');
  const isNavigatingRef = useRef(false);

  const recordPageState = useCallback((path: string, state: PageState) => {
    globalStore.savePageState(path, state);
  }, []);

  const getPageState = useCallback((path: string): PageState | null => {
    return globalStore.getPageState(path);
  }, []);

  const getLastValidPath = useCallback((): string | null => {
    const history = globalStore.getHistory();
    if (history.length < 2) return null;
    const lastEntry = history[history.length - 2];
    return lastEntry.path;
  }, []);

  const goBack = useCallback((): boolean => {
    if (isNavigatingRef.current) return false;
    isNavigatingRef.current = true;

    const history = globalStore.getHistory();
    if (history.length < 2) {
      isNavigatingRef.current = false;
      return false;
    }

    history.pop();
    const lastEntry = history[history.length - 1];

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);

    if (lastEntry) {
      navigate(lastEntry.path, { replace: true });
      return true;
    }
    return false;
  }, [navigate]);

  const navigateTo = useCallback((path: string, options?: { state?: any }) => {
    const currentPath = currentPathRef.current;
    const scrollY = window.scrollY;

    if (currentPath && currentPath !== path) {
      globalStore.recordNavigation(currentPath, path, scrollY);
    }

    currentPathRef.current = path;
    navigate(path, options);
  }, [navigate]);

  const updateCurrentPath = useCallback((path: string) => {
    currentPathRef.current = path;
  }, []);

  const initNavigation = useCallback((initialPath: string) => {
    currentPathRef.current = initialPath;
    if (globalStore.getHistory().length === 0) {
      globalStore.addEntry(initialPath, 0);
    }
  }, []);

  return {
    recordPageState,
    getPageState,
    getLastValidPath,
    goBack,
    navigateTo,
    updateCurrentPath,
    initNavigation,
    getScrollPosition: (path: string) => globalStore.getScrollPosition(path),
  };
}

export { globalStore as pageNavigatorStore };
