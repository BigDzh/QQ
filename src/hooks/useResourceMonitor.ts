import { useEffect, useRef, useCallback, useState } from 'react';
import { getStorageInfo, formatBytes } from '../services/storageManager';
import {
  type ResourceMetrics,
  type ResourceAlert,
  type ResourceType,
  type ResourceStatus,
  type LowPerformanceModeConfig,
  DEFAULT_LOW_PERFORMANCE_CONFIG,
  getResourceStatus,
  getOverallResourceStatus,
} from '../types/lowPerformanceMode';

export interface UseResourceMonitorOptions {
  config?: Partial<LowPerformanceModeConfig>;
  onAlert?: (alert: ResourceAlert) => void;
  onStatusChange?: (status: ResourceStatus, metrics: ResourceMetrics) => void;
  enabled?: boolean;
}

export interface UseResourceMonitorReturn {
  metrics: ResourceMetrics | null;
  alerts: ResourceAlert[];
  isLowResource: boolean;
  checkResources: () => void;
  forceCleanup: () => void;
  getResourceByType: (type: ResourceType) => ResourceMetrics[typeof type] | null;
  dismissAlert: (alertId: string) => void;
  clearAlerts: () => void;
}

const createEmptyMetrics = (): ResourceMetrics => ({
  memory: {
    usedHeap: 0,
    totalHeap: 0,
    heapLimit: 0,
    usagePercent: 0,
    status: 'normal',
  },
  cpu: {
    usagePercent: 0,
    status: 'normal',
    cores: navigator.hardwareConcurrency || 4,
  },
  battery: {
    level: 1,
    charging: false,
    status: 'normal',
    estimatedTimeRemaining: null,
  },
  network: {
    type: 'unknown',
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    status: 'normal',
  },
  storage: {
    used: 0,
    quota: 5 * 1024 * 1024,
    usagePercent: 0,
    status: 'normal',
  },
  overallStatus: 'normal',
  lastUpdated: Date.now(),
});

export function useResourceMonitor(
  options: UseResourceMonitorOptions = {}
): UseResourceMonitorReturn {
  const {
    config = DEFAULT_LOW_PERFORMANCE_CONFIG,
    onAlert,
    onStatusChange,
    enabled = true,
  } = options;

  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null);
  const [alerts, setAlerts] = useState<ResourceAlert[]>([]);
  const [isLowResource, setIsLowResource] = useState(false);

  const configRef = useRef(config);
  const alertsRef = useRef<ResourceAlert[]>([]);
  const lastAlertTimeRef = useRef<Record<ResourceType, number>>({
    memory: 0,
    cpu: 0,
    battery: 0,
    network: 0,
    storage: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMonitoringRef = useRef(false);
  const previousStatusRef = useRef<ResourceStatus>('normal');

  const checkMemory = useCallback((): ResourceMetrics['memory'] => {
    const perf = window.performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    if (perf?.memory) {
      const usedHeap = perf.memory.usedJSHeapSize;
      const heapLimit = perf.memory.jsHeapSizeLimit;
      const usagePercent = heapLimit > 0 ? usedHeap / heapLimit : 0;

      return {
        usedHeap,
        totalHeap: perf.memory.totalJSHeapSize,
        heapLimit,
        usagePercent,
        status: getResourceStatus(usagePercent, configRef.current.memoryThreshold || { warning: 70, critical: 90 }),
      };
    }

    return {
      usedHeap: 0,
      totalHeap: 0,
      heapLimit: 0,
      usagePercent: 0,
      status: 'normal',
    };
  }, []);

  const checkCpu = useCallback((): ResourceMetrics['cpu'] => {
    const cores = navigator.hardwareConcurrency || 4;
    const navPerf = performance as Performance & {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
    };

    let usagePercent = 0;
    if (navPerf?.memory) {
      const { usedJSHeapSize, jsHeapSizeLimit } = navPerf.memory;
      usagePercent = usedJSHeapSize / jsHeapSizeLimit;
    }

    return {
      usagePercent,
      status: getResourceStatus(usagePercent, configRef.current.cpuThreshold || { warning: 70, critical: 90 }),
      cores,
    };
  }, []);

  const checkBattery = useCallback(async (): Promise<ResourceMetrics['battery']> => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as Navigator & {
          getBattery: () => Promise<{
            level: number;
            charging: boolean;
            estimatedTimeRemaining: number | null;
          }>;
        }).getBattery();

        const level = battery.level;
        const status = battery.charging
          ? 'normal'
          : getResourceStatus(level, configRef.current.batteryThreshold || { warning: 0.3, critical: 0.15 }, true);

        return {
          level,
          charging: battery.charging,
          status,
          estimatedTimeRemaining: battery.estimatedTimeRemaining,
        };
      } catch {
        return {
          level: 1,
          charging: false,
          status: 'normal',
          estimatedTimeRemaining: null,
        };
      }
    }

    return {
      level: 1,
      charging: true,
      status: 'normal',
      estimatedTimeRemaining: null,
    };
  }, []);

  const checkNetwork = useCallback((): ResourceMetrics['network'] => {
    const connection = (navigator as Navigator & {
      connection?: {
        type: string;
        effectiveType: string;
        downlink: number;
        rtt: number;
      };
    }).connection;

    if (connection) {
      const rttPercent = Math.min(connection.rtt / 1000, 1);
      return {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        status: getResourceStatus(rttPercent, { warning: 0.5, critical: 0.8 }),
      };
    }

    return {
      type: 'unknown',
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      status: 'normal',
    };
  }, []);

  const checkStorage = useCallback((): ResourceMetrics['storage'] => {
    try {
      const storageInfo = getStorageInfo();
      return {
        used: storageInfo.used,
        quota: storageInfo.quota,
        usagePercent: storageInfo.usagePercent / 100,
        status: getResourceStatus(
          storageInfo.usagePercent / 100,
          configRef.current.storageThreshold || { warning: 0.75, critical: 0.9 }
        ),
      };
    } catch {
      return {
        used: 0,
        quota: 5 * 1024 * 1024,
        usagePercent: 0,
        status: 'normal',
      };
    }
  }, []);

  const checkResources = useCallback(async () => {
    if (isMonitoringRef.current || !enabled) return;
    isMonitoringRef.current = true;

    try {
      const [memory, cpu, battery, network, storage] = await Promise.all([
        Promise.resolve(checkMemory()),
        Promise.resolve(checkCpu()),
        checkBattery(),
        Promise.resolve(checkNetwork()),
        Promise.resolve(checkStorage()),
      ]);

      const statuses: ResourceStatus[] = [
        memory.status,
        cpu.status,
        battery.status,
        network.status,
        storage.status,
      ];

      const overallStatus = getOverallResourceStatus(statuses);

      const newMetrics: ResourceMetrics = {
        memory,
        cpu,
        battery,
        network,
        storage,
        overallStatus,
        lastUpdated: Date.now(),
      };

      setMetrics(newMetrics);
      setIsLowResource(overallStatus !== 'normal');

      const now = Date.now();
      const alertCooldown = 60000;

      const resourceChecks: Array<{
        type: ResourceType;
        status: ResourceStatus;
        value: number;
        threshold: number;
      }> = [
        {
          type: 'memory',
          status: memory.status,
          value: memory.usagePercent,
          threshold: configRef.current.memoryThreshold?.critical || 0.9,
        },
        {
          type: 'cpu',
          status: cpu.status,
          value: cpu.usagePercent,
          threshold: configRef.current.cpuThreshold?.critical || 0.9,
        },
        {
          type: 'battery',
          status: battery.status,
          value: battery.level,
          threshold: configRef.current.batteryThreshold?.critical || 0.15,
        },
        {
          type: 'network',
          status: network.status,
          value: network.rtt / 1000,
          threshold: 0.5,
        },
        {
          type: 'storage',
          status: storage.status,
          value: storage.usagePercent,
          threshold: configRef.current.storageThreshold?.critical || 0.9,
        },
      ];

      for (const check of resourceChecks) {
        if (check.status !== 'normal' && now - lastAlertTimeRef.current[check.type] >= alertCooldown) {
          lastAlertTimeRef.current[check.type] = now;

          const alert: ResourceAlert = {
            id: `${check.type}-${now}`,
            type: check.type,
            status: check.status,
            message: getAlertMessage(check.type, check.status, check.value),
            value: check.value,
            threshold: check.threshold,
            timestamp: now,
          };

          alertsRef.current = alertsRef.current.slice(-9);
          alertsRef.current.push(alert);
          setAlerts([...alertsRef.current]);
          onAlert?.(alert);
        }
      }

      if (previousStatusRef.current !== overallStatus) {
        previousStatusRef.current = overallStatus;
        onStatusChange?.(overallStatus, newMetrics);
      }
    } finally {
      isMonitoringRef.current = false;
    }
  }, [
    enabled,
    checkMemory,
    checkCpu,
    checkBattery,
    checkNetwork,
    checkStorage,
    onAlert,
    onStatusChange,
  ]);

  const forceCleanup = useCallback(() => {
    alertsRef.current = [];
    setAlerts([]);
    setMetrics(null);
    setIsLowResource(false);
  }, []);

  const getResourceByType = useCallback(
    (type: ResourceType) => {
      if (!metrics) return null;
      return metrics[type];
    },
    [metrics]
  );

  const dismissAlert = useCallback((alertId: string) => {
    alertsRef.current = alertsRef.current.filter((a) => a.id !== alertId);
    setAlerts([...alertsRef.current]);
  }, []);

  const clearAlerts = useCallback(() => {
    alertsRef.current = [];
    setAlerts([]);
  }, []);

  useEffect(() => {
    configRef.current = { ...DEFAULT_LOW_PERFORMANCE_CONFIG, ...config };
  }, [config]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    checkResources();

    const checkInterval = config.checkInterval || DEFAULT_LOW_PERFORMANCE_CONFIG.checkInterval;
    intervalRef.current = setInterval(checkResources, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, checkResources, config.checkInterval]);

  return {
    metrics,
    alerts,
    isLowResource,
    checkResources,
    forceCleanup,
    getResourceByType,
    dismissAlert,
    clearAlerts,
  };
}

function getAlertMessage(type: ResourceType, status: ResourceStatus, value: number): string {
  const percent = (value * 100).toFixed(0);

  switch (type) {
    case 'memory':
      return status === 'critical'
        ? `内存使用严重: ${percent}% - 建议切换至低性能模式`
        : `内存使用较高: ${percent}%`;
    case 'cpu':
      return status === 'critical'
        ? `CPU 使用率过高: ${percent}% - 建议切换至低性能模式`
        : `CPU 使用率较高: ${percent}%`;
    case 'battery':
      return status === 'critical'
        ? `电池电量严重不足: ${percent}% - 建议切换至低性能模式`
        : `电池电量较低: ${percent}%`;
    case 'network':
      return status === 'critical'
        ? `网络连接较差 - 建议切换至低性能模式`
        : `网络连接质量下降`;
    case 'storage':
      return status === 'critical'
        ? `存储空间严重不足: ${percent}% - 建议清理存储`
        : `存储空间使用较高: ${percent}%`;
    default:
      return `资源状态: ${status}`;
  }
}

export default useResourceMonitor;
