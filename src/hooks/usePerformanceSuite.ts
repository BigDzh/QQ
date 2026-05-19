import { useMemo } from 'react';
import { usePerformanceMetrics, formatBytes, formatTime } from './usePerformanceMetrics';
import { usePerformanceAlert, type AlertConfig } from './usePerformanceAlert';
import { useMemoryMonitor } from './useMemoryMonitor';

export interface PerformanceSuiteOptions {
  enableMetrics?: boolean;
  enableAlerts?: boolean;
  enableMemoryMonitoring?: boolean;
  alertConfig?: Partial<AlertConfig>;
}

export interface PerformanceSuiteReturn {
  metrics: ReturnType<typeof usePerformanceMetrics>;
  alerts: {
    config: AlertConfig;
    updateConfig: (config: Partial<AlertConfig>) => void;
    resetConfig: () => void;
  };
  memory: ReturnType<typeof useMemoryMonitor> | null;
  formatters: {
    bytes: typeof formatBytes;
    time: typeof formatTime;
  };
}

export function usePerformanceSuite(options: PerformanceSuiteOptions = {}): PerformanceSuiteReturn {
  const {
    enableMetrics: _enableMetrics,
    enableAlerts: _enableAlerts,
    enableMemoryMonitoring = true,
    alertConfig: _initialAlertConfig,
  } = options;

  const metrics = usePerformanceMetrics();
  
  const alertResult = usePerformanceAlert(
    {
      cpu: 0,
      memory: 0,
      disk: 0,
      fps: 60,
    },
    true
  );

  const memory = enableMemoryMonitoring ? useMemoryMonitor() : null;

  return useMemo(() => ({
    metrics,
    alerts: {
      config: alertResult.config,
      updateConfig: alertResult.updateConfig,
      resetConfig: alertResult.resetConfig,
    },
    memory,
    formatters: {
      bytes: formatBytes,
      time: formatTime,
    },
  }), [metrics, alertResult, memory]);
}

export { formatBytes, formatTime } from './usePerformanceMetrics';
export { getAlertConfig, saveAlertConfig } from './usePerformanceAlert';
export type { AlertConfig, AlertThreshold } from './usePerformanceAlert';
