import { useEffect, useRef, useCallback, useState } from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface PerformanceStats {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  memoryUsage?: number;
  memoryLimit?: number;
}

export interface UsePerformanceObserverOptions {
  enabled?: boolean;
  onMetric?: (metric: PerformanceMetric) => void;
  trackMemory?: boolean;
  memoryCheckInterval?: number;
}

const DEFAULT_MEMORY_CHECK_INTERVAL = 10000;

export function usePerformanceObserver(options: UsePerformanceObserverOptions = {}) {
  const {
    enabled = true,
    onMetric,
    trackMemory = false,
    memoryCheckInterval = DEFAULT_MEMORY_CHECK_INTERVAL,
  } = options;

  const [stats, setStats] = useState<PerformanceStats>({});
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const observersRef = useRef<PerformanceObserver[]>([]);
  const memoryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addMetric = useCallback((name: string, value: number, unit: string = 'ms') => {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };
    setMetrics(prev => [...prev.slice(-99), metric]);
    onMetric?.(metric);
  }, [onMetric]);

  const measureTTFB = useCallback(() => {
    if (typeof window === 'undefined') return;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const ttfb = navigation.responseStart - navigation.requestStart;
      addMetric('TTFB', ttfb);
      setStats(prev => ({ ...prev, ttfb }));
    }
  }, [addMetric]);

  useEffect(() => {
    if (!enabled) return;

    measureTTFB();

    if (trackMemory && 'memory' in performance) {
      memoryIntervalRef.current = setInterval(() => {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        if (memory) {
          addMetric('Memory Used', memory.usedJSHeapSize, 'bytes');
          setStats(prev => ({
            ...prev,
            memoryUsage: memory.usedJSHeapSize,
            memoryLimit: memory.jsHeapSizeLimit,
          }));
        }
      }, memoryCheckInterval);
    }

    const metricNames: Array<{ name: string; type: string }> = [
      { name: 'FCP', type: 'paint' },
      { name: 'LCP', type: 'paint' },
      { name: 'FID', type: 'event' },
      { name: 'CLS', type: 'layout-shift' },
    ];

    metricNames.forEach(({ name, type }) => {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const entry = entries[entries.length - 1];
            let value: number;

            switch (type) {
              case 'paint':
                value = (entry as PerformancePaintTiming).startTime;
                if (name === 'FCP') {
                  setStats(prev => ({ ...prev, fcp: value }));
                } else if (name === 'LCP') {
                  setStats(prev => ({ ...prev, lcp: value }));
                }
                break;
              case 'event':
                value = (entry as PerformanceEventTiming).duration;
                if (name === 'FID') {
                  setStats(prev => ({ ...prev, fid: value }));
                }
                break;
              case 'layout-shift':
                value = (entry as PerformanceEntry & { value: number }).value;
                if (name === 'CLS') {
                  setStats(prev => ({ ...prev, cls: value }));
                }
                break;
              default:
                value = entry.startTime;
            }

            addMetric(name, value);
          }
        });

        observer.observe({ type: type as string, buffered: true });
        observersRef.current.push(observer);
      } catch {
      }
    });

    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current = [];
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
        memoryIntervalRef.current = null;
      }
    };
  }, [enabled, trackMemory, memoryCheckInterval, measureTTFB, addMetric]);

  const getMetricByName = useCallback((name: string): PerformanceMetric | undefined => {
    return metrics.find(m => m.name === name);
  }, [metrics]);

  const getMetricsByTimeRange = useCallback((startTime: number, endTime: number): PerformanceMetric[] => {
    return metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }, [metrics]);

  const clearMetrics = useCallback(() => {
    setMetrics([]);
  }, []);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }, []);

  return {
    stats,
    metrics,
    addMetric,
    getMetricByName,
    getMetricsByTimeRange,
    clearMetrics,
    formatBytes,
  };
}

export function useComponentRenderTracker(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef<number>(performance.now());
  const renderTimesRef = useRef<number[]>([]);

  useEffect(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    const renderDuration = now - lastRenderTimeRef.current;
    renderTimesRef.current.push(renderDuration);
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift();
    }
    lastRenderTimeRef.current = now;

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Performance] ${componentName} rendered #${renderCountRef.current} in ${renderDuration.toFixed(2)}ms`);
    }
  });

  const getAverageRenderTime = useCallback(() => {
    const times = renderTimesRef.current;
    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }, []);

  const getRenderCount = useCallback(() => renderCountRef.current, []);

  return {
    renderCount: renderCountRef.current,
    averageRenderTime: getAverageRenderTime(),
    getRenderCount,
    getAverageRenderTime,
  };
}

export function measureAsync<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  metricName: string,
  onComplete?: (duration: number, result: ReturnType<T>) => void
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      onComplete?.(duration, result);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.warn(`[Performance] ${metricName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

export function measureSync<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  metricName: string,
  onComplete?: (duration: number, result: ReturnType<T>) => void
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    try {
      const result = fn(...args);
      const duration = performance.now() - start;
      onComplete?.(duration, result);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.warn(`[Performance] ${metricName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

export default usePerformanceObserver;
