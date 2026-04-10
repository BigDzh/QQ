import { useEffect, useCallback, useRef } from 'react';
import type {
  HierarchicalLogEntry,
  LogFilter,
  LogLayer,
  LogLevel,
  LogStatistics,
  LogListener,
} from '../services/logger/types';
import {
  getLogger,
} from '../services/logger/core';

const DEFAULT_USER = { id: null, username: '系统' };

interface UseHierarchicalLoggerOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useHierarchicalLogger(options: UseHierarchicalLoggerOptions = {}) {
  const { autoRefresh = false, refreshInterval = 5000 } = options;
  const loggerRef = useRef(getLogger());
  const listenersRef = useRef<Set<LogListener<HierarchicalLogEntry>>>(new Set());
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getAllLogs = useCallback((filter?: LogFilter): HierarchicalLogEntry[] => {
    return loggerRef.current.getAllLogs(filter);
  }, []);

  const getComponentLogs = useCallback((filter?: LogFilter) => {
    return loggerRef.current.getComponentLogs(filter);
  }, []);

  const getModuleLogs = useCallback((filter?: LogFilter) => {
    return loggerRef.current.getModuleLogs(filter);
  }, []);

  const getSystemLogs = useCallback((filter?: LogFilter) => {
    return loggerRef.current.getSystemLogs(filter);
  }, []);

  const getStatistics = useCallback((): LogStatistics => {
    return loggerRef.current.getStatistics();
  }, []);

  const filterLogs = useCallback((
    layer?: LogLayer | 'ALL',
    level?: LogLevel | 'ALL',
    searchTerm?: string,
    startDate?: string,
    endDate?: string
  ): HierarchicalLogEntry[] => {
    return loggerRef.current.getAllLogs({
      layer: layer || 'ALL',
      level: level || 'ALL',
      searchTerm,
      startDate,
      endDate,
    });
  }, []);

  const clearAllLogs = useCallback(() => {
    loggerRef.current.clearAllLogs();
  }, []);

  const clearLayerLogs = useCallback((layer: LogLayer) => {
    loggerRef.current.clearLayerLogs(layer);
  }, []);

  const exportLogs = useCallback((layer?: LogLayer): string => {
    return loggerRef.current.exportLogs(layer);
  }, []);

  const subscribe = useCallback((listener: LogListener<HierarchicalLogEntry>): () => void => {
    listenersRef.current.add(listener);
    const unsubscribe = loggerRef.current.addGlobalListener(listener);
    return () => {
      listenersRef.current.delete(listener);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const interval = setInterval(() => {
      listenersRef.current.forEach(listener => {
        try {
          const latestLogs = loggerRef.current.getAllLogs({ limit: 1 });
          if (latestLogs.length > 0) {
            listener(latestLogs[0]);
          }
        } catch (e) {
          logger.error('Error in auto-refresh listener:', e);
        }
      });
    }, refreshInterval);
    refreshIntervalRef.current = interval;

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      listenersRef.current.forEach(listener => {
        loggerRef.current.removeGlobalListener(listener);
      });
      listenersRef.current.clear();
    };
  }, []);

  return {
    logs: {
      all: getAllLogs,
      component: getComponentLogs,
      module: getModuleLogs,
      system: getSystemLogs,
      filter: filterLogs,
    },
    stats: getStatistics,
    actions: {
      clearAll: clearAllLogs,
      clearLayer: clearLayerLogs,
      export: exportLogs,
      subscribe,
    },
    user: DEFAULT_USER,
  };
}
