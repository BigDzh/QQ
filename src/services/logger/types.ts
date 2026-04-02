export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export type LogLayer = 'COMPONENT' | 'MODULE' | 'SYSTEM';

export type ComponentChangeType =
  | 'CREATE'
  | 'UPDATE'
  | 'DESTROY'
  | 'STATE_CHANGE'
  | 'PROPERTY_CHANGE'
  | 'MOUNT'
  | 'UNMOUNT'
  | 'RENDER'
  | 'EVENT_TRIGGER';

export type ModuleChangeType =
  | 'INTERFACE_CHANGE'
  | 'CONFIG_MODIFY'
  | 'DEPENDENCY_ADJUST'
  | 'CORE_FUNCTION_CHANGE'
  | 'ENABLE'
  | 'DISABLE'
  | 'INIT'
  | 'DESTROY';

export type SystemEventType =
  | 'CONFIG_CHANGE'
  | 'SERVICE_START'
  | 'SERVICE_STOP'
  | 'PERFORMANCE_ANOMALY'
  | 'SECURITY_EVENT'
  | 'CROSS_MODULE_CHANGE'
  | 'SYSTEM_INIT'
  | 'SYSTEM_SHUTDOWN';

export interface LogUser {
  id: string | null;
  username: string;
}

export interface BaseLogEntry {
  id: string;
  timestamp: string;
  layer: LogLayer;
  level: LogLevel;
  user: LogUser;
}

export interface ComponentLogEntry extends BaseLogEntry {
  layer: 'COMPONENT';
  componentId: string;
  componentName: string;
  changeType: ComponentChangeType;
  reason?: string;
  previousState?: Record<string, unknown>;
  currentState?: Record<string, unknown>;
  changedProperties?: Array<{
    key: string;
    previousValue: unknown;
    newValue: unknown;
  }>;
  metadata?: Record<string, unknown>;
}

export interface ModuleLogEntry extends BaseLogEntry {
  layer: 'MODULE';
  moduleName: string;
  moduleId: string;
  changeType: ModuleChangeType;
  reason?: string;
  impactScope: ImpactScope;
  changeDetails: string;
  previousConfig?: Record<string, unknown>;
  newConfig?: Record<string, unknown>;
  affectedDependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface SystemLogEntry extends BaseLogEntry {
  layer: 'SYSTEM';
  eventType: SystemEventType;
  eventDescription: string;
  reason?: string;
  impactScope: ImpactScope;
  stackTrace?: string;
  performanceMetrics?: {
    memoryUsage?: number;
    cpuUsage?: number;
    responseTime?: number;
  };
  securityDetails?: {
    eventType: string;
    sourceIp?: string;
    targetResource?: string;
  };
  metadata?: Record<string, unknown>;
}

export type HierarchicalLogEntry = ComponentLogEntry | ModuleLogEntry | SystemLogEntry;

export interface ImpactScope {
  affectedModules: string[];
  affectedComponents: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface LogFilter {
  layer?: LogLayer | 'ALL';
  level?: LogLevel | 'ALL';
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  componentId?: string;
  moduleName?: string;
  userId?: string;
  changeType?: ComponentChangeType | ModuleChangeType | SystemEventType;
  reason?: string;
  limit?: number;
  offset?: number;
}

export interface LogStatistics {
  totalLogs: number;
  byLayer: Record<LogLayer, number>;
  byLevel: Record<LogLevel, number>;
  byComponentChangeType: Record<ComponentChangeType, number>;
  byModuleChangeType: Record<ModuleChangeType, number>;
  bySystemEventType: Record<SystemEventType, number>;
  recentCount: number;
  errorCount: number;
  criticalCount: number;
}

export type LogListener<T extends HierarchicalLogEntry = HierarchicalLogEntry> = (entry: T) => void;

export interface LoggerConfig {
  maxLogsPerLayer: number;
  enableConsoleOutput: boolean;
  enablePersistence: boolean;
  flushIntervalMs: number;
  bufferSize: number;
}
