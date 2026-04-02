import type {
  SystemLogEntry,
  SystemEventType,
  ImpactScope,
  LogLevel,
  LogFilter,
  LogListener,
} from './types';
import { getLogger } from './core';

function buildSystemImpactScope(
  eventType: SystemEventType,
  eventDescription: string,
  affectedModules?: string[],
  affectedComponents?: string[]
): ImpactScope {
  const criticalEvents: SystemEventType[] = [
    'SECURITY_EVENT',
    'PERFORMANCE_ANOMALY',
    'SYSTEM_SHUTDOWN',
  ];

  const highImpactEvents: SystemEventType[] = [
    'SERVICE_STOP',
    'CROSS_MODULE_CHANGE',
    'CONFIG_CHANGE',
  ];

  let severity: ImpactScope['severity'] = 'LOW';
  if (criticalEvents.includes(eventType)) {
    severity = 'CRITICAL';
  } else if (highImpactEvents.includes(eventType)) {
    severity = 'HIGH';
  } else {
    severity = 'MEDIUM';
  }

  const descriptions: Record<SystemEventType, string> = {
    CONFIG_CHANGE: `系统配置变更：${eventDescription}`,
    SERVICE_START: `核心服务启动：${eventDescription}`,
    SERVICE_STOP: `核心服务停止：${eventDescription}`,
    PERFORMANCE_ANOMALY: `性能指标异常：${eventDescription}`,
    SECURITY_EVENT: `安全事件告警：${eventDescription}`,
    CROSS_MODULE_CHANGE: `跨模块重大变更：${eventDescription}`,
    SYSTEM_INIT: `系统初始化：${eventDescription}`,
    SYSTEM_SHUTDOWN: `系统关闭：${eventDescription}`,
  };

  return {
    affectedModules: affectedModules || ['*'],
    affectedComponents: affectedComponents || ['*'],
    severity,
    description: descriptions[eventType] || eventDescription,
  };
}

export function logSystemConfigChange(
  user: { id: string | null; username: string },
  eventDescription: string,
  reason?: string,
  previousConfig: Record<string, unknown>,
  newConfig: Record<string, unknown>,
  affectedModules?: string[]
): SystemLogEntry {
  const impactScope = buildSystemImpactScope(
    'CONFIG_CHANGE',
    eventDescription,
    affectedModules
  );

  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level: impactScope.severity === 'CRITICAL' ? 'CRITICAL' : impactScope.severity === 'HIGH' ? 'WARN' : 'INFO',
    user: { ...user },
    eventType: 'CONFIG_CHANGE',
    eventDescription,
    reason,
    impactScope,
    metadata: {
      previousConfig,
      newConfig,
      changedKeys: Object.keys(newConfig).filter(
        key =>
          JSON.stringify(previousConfig[key]) !== JSON.stringify(newConfig[key])
      ),
    },
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

export function logSystemServiceStart(
  user: { id: string | null; username: string },
  serviceName: string,
  reason?: string,
  serviceDetails?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope(
    'SERVICE_START',
    `服务 ${serviceName} 已启动`
  );

  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level: 'INFO',
    user: { ...user },
    eventType: 'SERVICE_START',
    eventDescription: `核心服务 ${serviceName} 启动成功`,
    reason,
    impactScope,
    metadata: {
      serviceName,
      serviceDetails,
      startTime: new Date().toISOString(),
    },
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

export function logSystemServiceStop(
  user: { id: string | null; username: string },
  serviceName: string,
  reason?: string,
  serviceDetails?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope(
    'SERVICE_STOP',
    `服务 ${serviceName} 已停止`
  );

  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level: 'WARN',
    user: { ...user },
    eventType: 'SERVICE_STOP',
    eventDescription: reason
      ? `核心服务 ${serviceName} 停止：${reason}`
      : `核心服务 ${serviceName} 已停止`,
    reason,
    impactScope,
    metadata: {
      serviceName,
      serviceDetails,
      stopTime: new Date().toISOString(),
    },
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

export function logPerformanceAnomaly(
  user: { id: string | null; username: string },
  metricName: string,
  threshold: number,
  actualValue: number,
  reason?: string,
  unit: string = 'ms',
  additionalMetrics?: Record<string, number>
): SystemLogEntry {
  const eventDescription = `性能指标 ${metricName} 超过阈值：当前值 ${actualValue}${unit}（阈值 ${threshold}${unit}）`;
  const impactScope = buildSystemImpactScope(
    'PERFORMANCE_ANOMALY',
    eventDescription
  );

  const level: LogLevel = actualValue > threshold * 2 ? 'CRITICAL' : 'ERROR';

  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level,
    user: { ...user },
    eventType: 'PERFORMANCE_ANOMALY',
    eventDescription,
    reason,
    impactScope,
    performanceMetrics: {
      responseTime: metricName.includes('响应') ? actualValue : undefined,
      memoryUsage: metricName.includes('内存') ? actualValue : undefined,
      cpuUsage: metricName.includes('CPU') ? actualValue : undefined,
      ...additionalMetrics,
    },
    metadata: {
      metricName,
      threshold,
      actualValue,
      unit,
    },
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

export function logSecurityEvent(
  user: { id: string | null; username: string },
  eventType: string,
  description: string,
  reason?: string,
  sourceIp?: string,
  targetResource?: string,
  details?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope(
    'SECURITY_EVENT',
    description
  );

  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level: 'CRITICAL',
    user: { ...user },
    eventType: 'SECURITY_EVENT',
    eventDescription: `[安全事件] ${description}`,
    reason,
    impactScope,
    securityDetails: {
      eventType,
      sourceIp,
      targetResource,
    },
    stackTrace: new Error().stack?.split('\n').slice(2, 8).join('\n'),
    metadata: details,
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

export function logCrossModuleChange(
  user: { id: string | null; username: string },
  description: string,
  reason?: string,
  affectedModules: string[],
  affectedComponents?: string[],
  changeDetails?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope(
    'CROSS_MODULE_CHANGE',
    description,
    affectedModules,
    affectedComponents
  );

  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level: 'WARN',
    user: { ...user },
    eventType: 'CROSS_MODULE_CHANGE',
    eventDescription: `[跨模块变更] ${description}`,
    reason,
    impactScope,
    metadata: {
      affectedModules,
      affectedComponents,
      changeDetails,
    },
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

export function logSystemInit(
  user: { id: string | null; username: string },
  reason?: string,
  systemInfo?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope(
    'SYSTEM_INIT',
    '系统初始化完成'
  );

  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level: 'INFO',
    user: { ...user },
    eventType: 'SYSTEM_INIT',
    eventDescription: '系统初始化完成，所有核心服务已就绪',
    reason,
    impactScope,
    metadata: {
      systemInfo,
      initTime: new Date().toISOString(),
      version: systemInfo?.version || 'unknown',
    },
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

export function logSystemShutdown(
  user: { id: string | null; username: string },
  reason?: string,
  shutdownDetails?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope(
    'SYSTEM_SHUTDOWN',
    reason || '系统正常关闭'
  );

  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level: 'WARN',
    user: { ...user },
    eventType: 'SYSTEM_SHUTDOWN',
    eventDescription: reason
      ? `系统关闭：${reason}`
      : '系统正常关闭',
    reason,
    impactScope,
    metadata: {
      shutdownTime: new Date().toISOString(),
      ...shutdownDetails,
    },
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

export function getSystemLogs(filter?: LogFilter): SystemLogEntry[] {
  const logger = getLogger();
  return logger.getSystemLogs(filter) as SystemLogEntry[];
}

export function addSystemLogListener(
  listener: LogListener<SystemLogEntry>
): () => void {
  const logger = getLogger();
  return logger.addGlobalListener(listener as LogListener<import('./types').HierarchicalLogEntry>);
}
