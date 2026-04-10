import { useEffect, useRef, useCallback } from 'react';

export interface MonitoringConfig {
  enabled: boolean;
  projectKey?: string;
  sampleRate?: number;
  onError?: (error: Error, context?: Record<string, unknown>) => void;
  onDeleteOperation?: (operation: DeleteMonitorOperation) => void;
}

export interface DeleteMonitorOperation {
  id: string;
  type: string;
  timestamp: number;
  userId?: string;
  targetName?: string;
}

class GlobalMonitoringService {
  private static instance: GlobalMonitoringService;
  private config: MonitoringConfig = { enabled: false };
  private deleteOperations: DeleteMonitorOperation[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): GlobalMonitoringService {
    if (!GlobalMonitoringService.instance) {
      GlobalMonitoringService.instance = new GlobalMonitoringService();
    }
    return GlobalMonitoringService.instance;
  }

  configure(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  recordDelete(operation: Omit<DeleteMonitorOperation, 'timestamp'>): void {
    const fullOperation: DeleteMonitorOperation = {
      ...operation,
      timestamp: Date.now(),
    };

    this.deleteOperations = [
      fullOperation,
      ...this.deleteOperations.slice(0, this.maxHistorySize - 1),
    ];

    if (this.config.onDeleteOperation) {
      this.config.onDeleteOperation(fullOperation);
    }

    if (this.config.enabled && import.meta.env.DEV) {
      console.group('[GlobalMonitor] Delete Operation Recorded');
      logger.log('Operation:', fullOperation);
      logger.log('Total operations:', this.deleteOperations.length);
      console.groupEnd();
    }
  }

  getDeleteHistory(): DeleteMonitorOperation[] {
    return [...this.deleteOperations];
  }

  getDeleteStats(): {
    total: number;
    byType: Record<string, number>;
    recentCount: number;
    averagePerHour: number;
  } {
    const byType: Record<string, number> = {};
    let recentCount = 0;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    this.deleteOperations.forEach((op) => {
      byType[op.type] = (byType[op.type] || 0) + 1;
      if (op.timestamp > oneHourAgo) {
        recentCount++;
      }
    });

    const oldestTimestamp = this.deleteOperations.length > 0
      ? Math.min(...this.deleteOperations.map((op) => op.timestamp))
      : Date.now();
    const hoursSinceOldest = Math.max(1, (Date.now() - oldestTimestamp) / (1000 * 60 * 60));
    const averagePerHour = this.deleteOperations.length / hoursSinceOldest;

    return {
      total: this.deleteOperations.length,
      byType,
      recentCount,
      averagePerHour: Math.round(averagePerHour * 100) / 100,
    };
  }

  isDeleteFrequencyHigh(threshold: number = 10): boolean {
    const stats = this.getDeleteStats();
    return stats.recentCount > threshold;
  }

  clearHistory(): void {
    this.deleteOperations = [];
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    if (this.config.onError) {
      this.config.onError(error, context);
    }

    if (this.config.enabled) {
      logger.error('[GlobalMonitor] Error tracked:', error, context);
    }
  }

  getPerformanceMetrics(): Record<string, number> {
    const perfEntries = performance.getEntriesByType('navigation');
    const paintEntries = performance.getEntriesByType('paint');

    const metrics: Record<string, number> = {};

    if (perfEntries.length > 0) {
      const navEntry = perfEntries[0] as PerformanceNavigationTiming;
      metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.fetchStart;
      metrics.loadComplete = navEntry.loadEventEnd - navEntry.fetchStart;
      metrics.firstByte = navEntry.responseStart - navEntry.requestStart;
    }

    paintEntries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime;
      }
    });

    return metrics;
  }
}

export const globalMonitor = GlobalMonitoringService.getInstance();

export function useGlobalMonitoring() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      globalMonitor.configure({
        enabled: import.meta.env.DEV || process.env.NODE_ENV === 'production',
      });
      initialized.current = true;
    }
  }, []);

  const recordDelete = useCallback((operation: Omit<DeleteMonitorOperation, 'timestamp'>) => {
    globalMonitor.recordDelete(operation);
  }, []);

  const getStats = useCallback(() => globalMonitor.getDeleteStats(), []);
  const isFrequencyHigh = useCallback((threshold?: number) => globalMonitor.isDeleteFrequencyHigh(threshold), []);
  const getMetrics = useCallback(() => globalMonitor.getPerformanceMetrics(), []);
  const clearHistory = useCallback(() => globalMonitor.clearHistory(), []);

  return {
    recordDelete,
    getStats,
    isFrequencyHigh,
    getMetrics,
    clearHistory,
    getHistory: globalMonitor.getDeleteHistory.bind(globalMonitor),
    configure: globalMonitor.configure.bind(globalMonitor),
  };
}

export default globalMonitor;