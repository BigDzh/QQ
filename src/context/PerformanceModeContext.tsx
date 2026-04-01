import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

export type PerformanceMode = 'high' | 'low';

interface PerformanceModeContextType {
  mode: PerformanceMode;
  setMode: (mode: PerformanceMode) => void;
  toggleMode: () => void;
  isHighPerformance: boolean;
  isLowPerformance: boolean;
  onModeChange?: (mode: PerformanceMode) => void;
}

const PerformanceModeContext = createContext<PerformanceModeContextType | undefined>(undefined);

const PERFORMANCE_MODE_KEY = 'performance_mode';
const PERFORMANCE_MODE_STORAGE_KEY = 'app_performance_mode';

export function PerformanceModeProvider({ children, onModeChange }: { children: ReactNode; onModeChange?: (mode: PerformanceMode) => void }) {
  const [mode, setModeState] = useState<PerformanceMode>('high');
  const previousModeRef = useRef<PerformanceMode | null>(null);
  const onModeChangeRef = useRef(onModeChange);
  onModeChangeRef.current = onModeChange;

  useEffect(() => {
    const savedMode = localStorage.getItem(PERFORMANCE_MODE_KEY);
    if (savedMode === 'high' || savedMode === 'low') {
      setModeState(savedMode);
      localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, savedMode);
    }
  }, []);

  const notifyModeChange = useCallback((newMode: PerformanceMode, oldMode: PerformanceMode) => {
    if (oldMode === newMode) return;

    setTimeout(() => {
      onModeChangeRef.current?.(newMode);
    }, 0);
  }, []);

  const setMode = useCallback((newMode: PerformanceMode) => {
    const oldMode = mode;
    setModeState(newMode);
    localStorage.setItem(PERFORMANCE_MODE_KEY, newMode);
    localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, newMode);

    if (newMode === 'low') {
      disableHighPerformanceFeatures();
    } else {
      enableHighPerformanceFeatures();
    }

    notifyModeChange(newMode, oldMode);
    previousModeRef.current = oldMode;
  }, [mode, notifyModeChange]);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'high' ? 'low' : 'high';
    setMode(newMode);
  }, [mode, setMode]);

  const isHighPerformance = mode === 'high';
  const isLowPerformance = mode === 'low';

  return (
    <PerformanceModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isHighPerformance,
        isLowPerformance,
      }}
    >
      {children}
    </PerformanceModeContext.Provider>
  );
}

function disableHighPerformanceFeatures() {
  document.body.setAttribute('data-performance-mode', 'low');

  const existingStyle = document.getElementById('low-performance-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'low-performance-styles';
    style.textContent = `
      * {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function enableHighPerformanceFeatures() {
  document.body.setAttribute('data-performance-mode', 'high');
  const style = document.getElementById('low-performance-styles');
  if (style) {
    style.remove();
  }
}

export function usePerformanceMode() {
  const context = useContext(PerformanceModeContext);
  if (!context) {
    throw new Error('usePerformanceMode must be used within a PerformanceModeProvider');
  }
  return context;
}

export default PerformanceModeProvider;