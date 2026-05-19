import { useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { formatBytes, formatTime } from '../utils/formatters';

export interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  tti: number | null;
  fid: number | null;
  cls: number;
  fcpEntry: PerformanceEntry | null;
  lcpEntry: PerformanceEntry | null;
}

export function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    tti: null,
    fid: null,
    cls: 0,
    fcpEntry: null,
    lcpEntry: null,
  });

  useEffect(() => {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries.find(e => e.entryType === 'paint' && e.name === 'first-contentful-paint');
      if (fcpEntry) {
        setMetrics(prev => ({
          ...prev,
          fcp: fcpEntry.startTime,
          fcpEntry,
        }));
      }
    });

    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry;
      if (lastEntry) {
        setMetrics(prev => ({
          ...prev,
          lcp: lastEntry.startTime,
          lcpEntry: lastEntry,
        }));
      }
    });

    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      if (entries.length > 0) {
        const firstInput = entries[0] as PerformanceEventTiming;
        setMetrics(prev => ({
          ...prev,
          fid: firstInput.processingStart - firstInput.startTime,
        }));
      }
    });

    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      let clsValue = 0;
      entries.forEach((entry: PerformanceEntry) => {
        const layoutShift = entry as unknown as { hadRecentInput?: boolean; value?: number };
        if (layoutShift.hadRecentInput) return;
        clsValue += layoutShift.value || 0;
      });
      setMetrics(prev => ({
        ...prev,
        cls: prev.cls + clsValue,
      }));
    });

    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch {
      logger.warn('FCP observation not supported');
    }

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      logger.warn('LCP observation not supported');
    }

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {
      logger.warn('FID observation not supported');
    }

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      logger.warn('CLS observation not supported');
    }

    const calculateTTI = () => {
      const timing = performance.timing;
      const loadEventEnd = timing.loadEventEnd;
      const navigationStart = timing.navigationStart;

      if (loadEventEnd > 0 && navigationStart > 0) {
        setMetrics(prev => ({
          ...prev,
          tti: loadEventEnd - navigationStart,
        }));
      }
    };

    if (document.readyState === 'complete') {
      calculateTTI();
    } else {
      window.addEventListener('load', calculateTTI);
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      if (document.readyState !== 'complete') {
        window.removeEventListener('load', calculateTTI);
      }
    };
  }, []);

  return metrics;
}

export function useResourceTiming() {
  const [resourceTiming, setResourceTiming] = useState<PerformanceResourceTiming[]>([]);
  const MAX_RESOURCE_ENTRIES = 100;

  useEffect(() => {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const timingEntries = entries.filter(
        (entry): entry is PerformanceResourceTiming => entry.entryType === 'resource'
      );
      if (timingEntries.length === 0) return;

      setResourceTiming(prev => {
        const combined = [...prev, ...timingEntries];
        return combined.slice(-MAX_RESOURCE_ENTRIES);
      });
    });

    try {
      observer.observe({ type: 'resource', buffered: true });
    } catch {
      logger.warn('Resource timing observation not supported');
    }

    return () => observer.disconnect();
  }, []);

  return resourceTiming;
}

export function getResourceSizes(): { transferSize: number; encodedBodySize: number; decodedBodySize: number } {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  return resources.reduce(
    (acc, resource) => ({
      transferSize: acc.transferSize + resource.transferSize,
      encodedBodySize: acc.encodedBodySize + resource.encodedBodySize,
      decodedBodySize: acc.decodedBodySize + resource.decodedBodySize,
    }),
    { transferSize: 0, encodedBodySize: 0, decodedBodySize: 0 }
  );
}

export { formatBytes, formatTime };