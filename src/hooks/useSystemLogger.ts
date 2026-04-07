import { useCallback } from 'react';
import {
  logSystemConfigChange,
  logSystemServiceStart,
  logSystemServiceStop,
  logPerformanceAnomaly,
  logSecurityEvent,
  logCrossModuleChange,
  logSystemInit,
  logSystemShutdown,
  getSystemLogs,
  addSystemLogListener,
  type SystemLogEntry,
} from '../services/logger/systemLogger';
import type { LogFilter, SystemEventType } from '../services/logger/types';

interface UseSystemLoggerOptions {
  userId?: string | null;
  username?: string;
}

export function useSystemLogger(options: UseSystemLoggerOptions = {}) {
  const {
    userId = null,
    username = '系统',
  } = options;

  const user = { id: userId, username };

  const logConfigChange = useCallback(
    (
      eventDescription: string,
      previousConfig: Record<string, unknown>,
      newConfig: Record<string, unknown>,
      reason?: string,
      affectedModules?: string[]
    ) => {
      return logSystemConfigChange(
        user,
        eventDescription,
        reason,
        previousConfig,
        newConfig,
        affectedModules
      );
    },
    [user]
  );

  const logServiceStart = useCallback(
    (serviceName: string, reason?: string, serviceDetails?: Record<string, unknown>) => {
      return logSystemServiceStart(user, serviceName, reason, serviceDetails);
    },
    [user]
  );

  const logServiceStop = useCallback(
    (serviceName: string, reason?: string, serviceDetails?: Record<string, unknown>) => {
      return logSystemServiceStop(user, serviceName, reason, serviceDetails);
    },
    [user]
  );

  const logPerformance = useCallback(
    (
      metricName: string,
      threshold: number,
      actualValue: number,
      reason?: string,
      unit?: string,
      additionalMetrics?: Record<string, number>
    ) => {
      return logPerformanceAnomaly(
        user,
        metricName,
        threshold,
        actualValue,
        reason,
        unit,
        additionalMetrics
      );
    },
    [user]
  );

  const logSecurity = useCallback(
    (
      eventType: string,
      description: string,
      reason?: string,
      sourceIp?: string,
      targetResource?: string,
      details?: Record<string, unknown>
    ) => {
      return logSecurityEvent(
        user,
        eventType,
        description,
        reason,
        sourceIp,
        targetResource,
        details
      );
    },
    [user]
  );

  const logCrossModuleChangeEvent = useCallback(
    (
      description: string,
      reason?: string,
      affectedModules: string[] = [],
      affectedComponents?: string[],
      changeDetails?: Record<string, unknown>
    ) => {
      return logCrossModuleChange(
        user,
        description,
        reason,
        affectedModules,
        affectedComponents,
        changeDetails
      );
    },
    [user]
  );

  const logSystemStartup = useCallback(
    (reason?: string, systemInfo?: Record<string, unknown>) => {
      return logSystemInit(user, reason, systemInfo);
    },
    [user]
  );

  const logSystemShutdownEvent = useCallback(
    (reason?: string, shutdownDetails?: Record<string, unknown>) => {
      return logSystemShutdown(user, reason, shutdownDetails);
    },
    [user]
  );

  const logSystemEvent = useCallback(
    (
      eventType: SystemEventType,
      eventDescription: string,
      reason?: string,
      metadata?: Record<string, unknown>
    ) => {
      switch (eventType) {
        case 'CONFIG_CHANGE':
          return logSystemConfigChange(
            user,
            eventDescription,
            reason,
            (metadata?.previousConfig || {}) as Record<string, unknown>,
            (metadata?.newConfig || {}) as Record<string, unknown>,
            (metadata?.affectedModules as string[]) || []
          );
        case 'SERVICE_START':
          return logSystemServiceStart(
            user,
            metadata?.serviceName as string || 'Unknown',
            reason,
            metadata?.serviceDetails as Record<string, unknown>
          );
        case 'SERVICE_STOP':
          return logSystemServiceStop(
            user,
            metadata?.serviceName as string || 'Unknown',
            reason,
            metadata?.serviceDetails as Record<string, unknown>
          );
        case 'PERFORMANCE_ANOMALY':
          return logPerformanceAnomaly(
            user,
            metadata?.metricName as string || 'Unknown',
            (metadata?.threshold as number) || 0,
            (metadata?.actualValue as number) || 0,
            reason,
            (metadata?.unit as string) || 'ms',
            metadata?.additionalMetrics as Record<string, number>
          );
        case 'SECURITY_EVENT':
          return logSecurityEvent(
            user,
            metadata?.eventType as string || 'Unknown',
            eventDescription,
            reason,
            metadata?.sourceIp as string,
            metadata?.targetResource as string,
            metadata?.details as Record<string, unknown>
          );
        case 'CROSS_MODULE_CHANGE':
          return logCrossModuleChange(
            user,
            eventDescription,
            reason,
            (metadata?.affectedModules as string[]) || [],
            (metadata?.affectedComponents as string[]) || [],
            metadata?.changeDetails as Record<string, unknown>
          );
        case 'SYSTEM_INIT':
          return logSystemInit(user, reason, metadata?.systemInfo as Record<string, unknown>);
        case 'SYSTEM_SHUTDOWN':
          return logSystemShutdown(user, reason, metadata?.shutdownDetails as Record<string, unknown>);
        default:
          return logSystemConfigChange(
            user,
            eventDescription,
            reason,
            {},
            metadata || {},
            []
          );
      }
    },
    [user]
  );

  const getLogs = useCallback((filter?: LogFilter): SystemLogEntry[] => {
    return getSystemLogs(filter);
  }, []);

  const subscribe = useCallback((listener: (entry: SystemLogEntry) => void) => {
    return addSystemLogListener(listener);
  }, []);

  return {
    logConfigChange,
    logServiceStart,
    logServiceStop,
    logPerformance,
    logSecurity,
    logCrossModuleChange: logCrossModuleChangeEvent,
    logSystemStartup,
    logSystemShutdown: logSystemShutdownEvent,
    logSystemEvent,
    getLogs,
    subscribe,
    user,
  };
}
