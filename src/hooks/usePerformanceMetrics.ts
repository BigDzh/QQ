import { useEffect, useRef, useState } from 'react';

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

    const observerEntries: PerformanceEntry[] = [];

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
      entries.forEach((entry: any) => {
        if (entry.hadRecentInput) return;
        clsValue += entry.value;
      });
      setMetrics(prev => ({
        ...prev,
        cls: prev.cls + clsValue,
      }));
    });

    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {
      console.warn('FCP observation not supported');
    }

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.warn('LCP observation not supported');
    }

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.warn('FID observation not supported');
    }

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.warn('CLS observation not supported');
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
    } catch (e) {
      console.warn('Resource timing observation not supported');
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

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatTime(ms: number): string {
  if (ms < 1000) return ms.toFixed(0) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}