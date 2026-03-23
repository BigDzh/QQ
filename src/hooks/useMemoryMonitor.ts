import { useEffect, useRef, useCallback, useState } from 'react';
import { getStorageInfo, formatBytes } from '../services/storageManager';

export interface MemoryMetrics {
  usedHeap: number;
  totalHeap: number;
  heapLimit: number;
  external: number;
  usedStorage: number;
  storageQuota: number;
  storageUsagePercent: number;
  isMemoryWarning: boolean;
  isMemoryCritical: boolean;
  isStorageWarning: boolean;
  isStorageCritical: boolean;
}

export interface MemoryAlert {
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
}

const MEMORY_WARNING_THRESHOLD = 0.7;
const MEMORY_CRITICAL_THRESHOLD = 0.9;
const STORAGE_WARNING_THRESHOLD = 0.8;
const STORAGE_CRITICAL_THRESHOLD = 0.95;
const CHECK_INTERVAL = 10000;
const METRICS_HISTORY_SIZE = 20;

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
  const [alerts, setAlerts] = useState<MemoryAlert[]>([]);
  const metricsHistoryRef = useRef<MemoryMetrics[]>([]);
  const lastCheckTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkMemory = useCallback(() => {
    const performance = window.performance;

    let usedHeap = 0;
    let totalHeap = 0;
    let heapLimit = 0;
    let external = 0;

    const perf = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number; externals?: number } };
    if (perf.memory) {
      usedHeap = perf.memory.usedJSHeapSize;
      totalHeap = perf.memory.totalJSHeapSize;
      heapLimit = perf.memory.jsHeapSizeLimit;
      external = perf.memory.externals || 0;
    }

    const storageInfo = getStorageInfo();
    const memoryUsagePercent = totalHeap > 0 ? usedHeap / heapLimit : 0;
    const storageUsagePercent = storageInfo.usagePercent / 100;

    const currentMetrics: MemoryMetrics = {
      usedHeap,
      totalHeap,
      heapLimit,
      external,
      usedStorage: storageInfo.used,
      storageQuota: storageInfo.quota,
      storageUsagePercent,
      isMemoryWarning: memoryUsagePercent >= MEMORY_WARNING_THRESHOLD,
      isMemoryCritical: memoryUsagePercent >= MEMORY_CRITICAL_THRESHOLD,
      isStorageWarning: storageUsagePercent >= STORAGE_WARNING_THRESHOLD,
      isStorageCritical: storageUsagePercent >= STORAGE_CRITICAL_THRESHOLD,
    };

    if (metricsHistoryRef.current.length >= METRICS_HISTORY_SIZE) {
      metricsHistoryRef.current.shift();
    }
    metricsHistoryRef.current.push(currentMetrics);
    setMetrics(currentMetrics);

    const now = Date.now();
    if (now - lastCheckTimeRef.current >= checkInterval) {
      lastCheckTimeRef.current = now;

      if (currentMetrics.isMemoryCritical || currentMetrics.isStorageCritical) {
        const alert: MemoryAlert = {
          type: 'critical',
          message: currentMetrics.isMemoryCritical
            ? `内存使用严重: ${formatBytes(usedHeap)} / ${formatBytes(heapLimit)}`
            : `存储空间严重不足: ${storageInfo.usagePercent}%`,
          timestamp: now,
        };
        setAlerts((prev) => [...prev.slice(-9), alert]);
        onAlert?.(alert);
      } else if (currentMetrics.isMemoryWarning || currentMetrics.isStorageWarning) {
        const alert: MemoryAlert = {
          type: 'warning',
          message: currentMetrics.isMemoryWarning
            ? `内存使用较高: ${formatBytes(usedHeap)} / ${formatBytes(heapLimit)}`
            : `存储空间使用率较高: ${storageInfo.usagePercent}%`,
          timestamp: now,
        };
        setAlerts((prev) => [...prev.slice(-9), alert]);
        onAlert?.(alert);
      }
    }

    return currentMetrics;
  }, [checkInterval, onAlert]);

  const forceCleanup = useCallback(() => {
    if (metricsHistoryRef.current.length > 0) {
      metricsHistoryRef.current = [];
    }
    setAlerts([]);
  }, []);

  const getMetricsHistory = useCallback(() => {
    return [...metricsHistoryRef.current];
  }, []);

  useEffect(() => {
    if (!enabled) return;

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
    alerts,
    checkMemory,
    forceCleanup,
    getMetricsHistory,
    formatBytes,
  };
}