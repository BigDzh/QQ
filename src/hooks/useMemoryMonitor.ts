import { useEffect, useRef, useCallback, useState } from 'react';
import { getStorageInfo, formatBytes } from '../services/storageManager';

export interface MemoryMetrics {
  usedHeap: number;
  totalHeap: number;
  heapLimit: number;
  usedStorage: number;
  storageUsagePercent: number;
  isMemoryWarning: boolean;
  isMemoryCritical: boolean;
}

export interface MemoryAlert {
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
}

const MEMORY_WARNING_THRESHOLD = 0.8;
const MEMORY_CRITICAL_THRESHOLD = 0.9;
const CHECK_INTERVAL = 30000;

export function useMemoryMonitor(options: {
  onAlert?: (alert: MemoryAlert) => void;
  checkInterval?: number;
  enabled?: boolean;
} = {}) {
  const {
    onAlert,
    checkInterval = CHECK_INTERVAL,
    enabled = true,
  } = options;

  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
  const alertsRef = useRef<MemoryAlert[]>([]);
  const lastAlertTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const monitoringRef = useRef(false);
  const callbackRef = useRef(onAlert);
  callbackRef.current = onAlert;

  const checkMemory = useCallback(() => {
    if (monitoringRef.current) return;
    monitoringRef.current = true;

    try {
      let usedHeap = 0;
      let totalHeap = 0;
      let heapLimit = 0;

      const perf = window.performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
      if (perf?.memory) {
        usedHeap = perf.memory.usedJSHeapSize;
        totalHeap = perf.memory.totalJSHeapSize;
        heapLimit = perf.memory.jsHeapSizeLimit;
      }

      const memoryUsagePercent = heapLimit > 0 ? usedHeap / heapLimit : 0;

      let storageUsagePercent = 0;
      try {
        const storageInfo = getStorageInfo();
        storageUsagePercent = storageInfo.usagePercent / 100;
      } catch {
      }

      const isMemoryWarning = memoryUsagePercent >= MEMORY_WARNING_THRESHOLD;
      const isMemoryCritical = memoryUsagePercent >= MEMORY_CRITICAL_THRESHOLD;

      const currentMetrics: MemoryMetrics = {
        usedHeap,
        totalHeap,
        heapLimit,
        usedStorage: 0,
        storageUsagePercent,
        isMemoryWarning,
        isMemoryCritical,
      };

      setMetrics(currentMetrics);

      const now = Date.now();
      if (now - lastAlertTimeRef.current >= 60000) {
        lastAlertTimeRef.current = now;

        if (isMemoryCritical) {
          const alert: MemoryAlert = {
            type: 'critical',
            message: `内存使用严重: ${formatBytes(usedHeap)} / ${formatBytes(heapLimit)}`,
            timestamp: now,
          };
          alertsRef.current = alertsRef.current.slice(-4);
          alertsRef.current.push(alert);
          callbackRef.current?.(alert);
        } else if (isMemoryWarning) {
          const alert: MemoryAlert = {
            type: 'warning',
            message: `内存使用较高: ${formatBytes(usedHeap)} / ${formatBytes(heapLimit)}`,
            timestamp: now,
          };
          alertsRef.current = alertsRef.current.slice(-4);
          alertsRef.current.push(alert);
          callbackRef.current?.(alert);
        }
      }
    } finally {
      monitoringRef.current = false;
    }
  }, []);

  const forceCleanup = useCallback(() => {
    alertsRef.current = [];
    setMetrics(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    checkMemory();

    intervalRef.current = setInterval(checkMemory, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, checkMemory, checkInterval]);

  return {
    metrics,
    alerts: alertsRef.current,
    checkMemory,
    forceCleanup,
    formatBytes,
  };
}