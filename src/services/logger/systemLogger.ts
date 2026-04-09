import type {
  SystemLogEntry,
  SystemEventType,
  ImpactScope,
  LogLevel,
  LogFilter,
  LogListener,
} from './types';
import { getLogger } from './core';

const CRITICAL_EVENTS: SystemEventType[] = [
  'SECURITY_EVENT',
  'PERFORMANCE_ANOMALY',
  'SYSTEM_SHUTDOWN',
];

const HIGH_IMPACT_EVENTS: SystemEventType[] = [
  'SERVICE_STOP',
  'CROSS_MODULE_CHANGE',
  'CONFIG_CHANGE',
];

const EVENT_DESCRIPTIONS: Record<SystemEventType, string> = {
  CONFIG_CHANGE: '系统配置变更',
  SERVICE_START: '核心服务启动',
  SERVICE_STOP: '核心服务停止',
  PERFORMANCE_ANOMALY: '性能指标异常',
  SECURITY_EVENT: '安全事件告警',
  CROSS_MODULE_CHANGE: '跨模块重大变更',
  SYSTEM_INIT: '系统初始化',
  SYSTEM_SHUTDOWN: '系统关闭',
};

function calculateSeverity(eventType: SystemEventType): ImpactScope['severity'] {
  if (CRITICAL_EVENTS.includes(eventType)) return 'CRITICAL';
  if (HIGH_IMPACT_EVENTS.includes(eventType)) return 'HIGH';
  return 'MEDIUM';
}

function buildSystemImpactScope(
  eventType: SystemEventType,
  eventDescription: string,
  affectedModules?: string[],
  affectedComponents?: string[]
): ImpactScope {
  const severity = calculateSeverity(eventType);
  const baseDescription = EVENT_DESCRIPTIONS[eventType] || eventType;

  return {
    affectedModules: affectedModules || ['*'],
    affectedComponents: affectedComponents || ['*'],
    severity,
    description: `${baseDescription}：${eventDescription}`,
  };
}

function createSystemLogEntry(
  eventType: SystemEventType,
  eventDescription: string,
  user: { id: string | null; username: string },
  reason: string,
  level: LogLevel,
  impactScope: ImpactScope,
  metadata?: Record<string, unknown>
): SystemLogEntry {
  const entry: SystemLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'SYSTEM',
    level,
    user: { ...user },
    eventType,
    eventDescription,
    reason,
    impactScope,
    metadata,
  };

  const logger = getLogger();
  logger.addSystemLog(entry as Parameters<typeof logger.addSystemLog>[0]);
  return entry;
}

function mapSeverityToLevel(severity: ImpactScope['severity']): LogLevel {
  switch (severity) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH': return 'WARN';
    default: return 'INFO';
  }
}

export function logSystemConfigChange(
  user: { id: string | null; username: string },
  eventDescription: string,
  reason: string,
  previousConfig: Record<string, unknown>,
  newConfig: Record<string, unknown>,
  affectedModules?: string[]
): SystemLogEntry {
  const impactScope = buildSystemImpactScope('CONFIG_CHANGE', eventDescription, affectedModules);
  const level = mapSeverityToLevel(impactScope.severity);

  return createSystemLogEntry(
    'CONFIG_CHANGE',
    eventDescription,
    user,
    reason,
    level,
    impactScope,
    {
      previousConfig,
      newConfig,
      changedKeys: Object.keys(newConfig).filter(
        key => JSON.stringify(previousConfig[key]) !== JSON.stringify(newConfig[key])
      ),
    }
  );
}

export function logSystemServiceStart(
  user: { id: string | null; username: string },
  serviceName: string,
  reason: string,
  serviceDetails?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope('SERVICE_START', `服务 ${serviceName} 已启动`);
  const eventDescription = `核心服务 ${serviceName} 启动成功`;

  return createSystemLogEntry(
    'SERVICE_START',
    eventDescription,
    user,
    reason,
    'INFO',
    impactScope,
    {
      serviceName,
      serviceDetails,
      startTime: new Date().toISOString(),
    }
  );
}

export function logSystemServiceStop(
  user: { id: string | null; username: string },
  serviceName: string,
  reason: string,
  serviceDetails?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope('SERVICE_STOP', `服务 ${serviceName} 已停止`);
  const eventDescription = reason
    ? `核心服务 ${serviceName} 停止：${reason}`
    : `核心服务 ${serviceName} 已停止`;

  return createSystemLogEntry(
    'SERVICE_STOP',
    eventDescription,
    user,
    reason,
    'WARN',
    impactScope,
    {
      serviceName,
      serviceDetails,
      stopTime: new Date().toISOString(),
    }
  );
}

export function logPerformanceAnomaly(
  user: { id: string | null; username: string },
  metricName: string,
  threshold: number,
  actualValue: number,
  reason: string,
  unit: string = 'ms',
  additionalMetrics?: Record<string, number>
): SystemLogEntry {
  const eventDescription = `性能指标 ${metricName} 超过阈值：当前值 ${actualValue}${unit}（阈值 ${threshold}${unit}）`;
  const impactScope = buildSystemImpactScope('PERFORMANCE_ANOMALY', eventDescription);
  const level: LogLevel = actualValue > threshold * 2 ? 'CRITICAL' : 'ERROR';

  return createSystemLogEntry(
    'PERFORMANCE_ANOMALY',
    eventDescription,
    user,
    reason,
    level,
    impactScope,
    {
      metricName,
      threshold,
      actualValue,
      unit,
    }
  );
}

export function logSecurityEvent(
  user: { id: string | null; username: string },
  eventType: string,
  description: string,
  reason: string,
  sourceIp?: string,
  targetResource?: string,
  details?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope('SECURITY_EVENT', description);
  const eventDescription = `[安全事件] ${description}`;

  return createSystemLogEntry(
    'SECURITY_EVENT',
    eventDescription,
    user,
    reason,
    'CRITICAL',
    impactScope,
    {
      eventType,
      sourceIp,
      targetResource,
      stackTrace: new Error().stack?.split('\n').slice(2, 8).join('\n'),
      ...details,
    }
  );
}

export function logCrossModuleChange(
  user: { id: string | null; username: string },
  description: string,
  reason: string,
  affectedModules: string[],
  affectedComponents?: string[],
  changeDetails?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope('CROSS_MODULE_CHANGE', description, affectedModules, affectedComponents);
  const eventDescription = `[跨模块变更] ${description}`;

  return createSystemLogEntry(
    'CROSS_MODULE_CHANGE',
    eventDescription,
    user,
    reason,
    'WARN',
    impactScope,
    {
      affectedModules,
      affectedComponents,
      changeDetails,
    }
  );
}

export function logSystemInit(
  user: { id: string | null; username: string },
  reason: string,
  systemInfo?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope('SYSTEM_INIT', '系统初始化完成');
  const eventDescription = '系统初始化完成，所有核心服务已就绪';

  return createSystemLogEntry(
    'SYSTEM_INIT',
    eventDescription,
    user,
    reason,
    'INFO',
    impactScope,
    {
      systemInfo,
      initTime: new Date().toISOString(),
      version: systemInfo?.version || 'unknown',
    }
  );
}

export function logSystemShutdown(
  user: { id: string | null; username: string },
  reason: string,
  shutdownDetails?: Record<string, unknown>
): SystemLogEntry {
  const impactScope = buildSystemImpactScope('SYSTEM_SHUTDOWN', reason || '系统正常关闭');
  const eventDescription = reason ? `系统关闭：${reason}` : '系统正常关闭';

  return createSystemLogEntry(
    'SYSTEM_SHUTDOWN',
    eventDescription,
    user,
    reason,
    'WARN',
    impactScope,
    {
      shutdownTime: new Date().toISOString(),
      ...shutdownDetails,
    }
  );
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