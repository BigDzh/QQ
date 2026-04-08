import type {
  ModuleLogEntry,
  ModuleChangeType,
  ImpactScope,
  LogLevel,
  LogFilter,
  LogListener,
} from './types';
import { getLogger } from './core';

function assessImpactScope(
  moduleName: string,
  changeType: ModuleChangeType,
  affectedComponents?: string[],
  affectedDependencies?: string[]
): ImpactScope {
  const highImpactTypes: ModuleChangeType[] = [
    'INTERFACE_CHANGE',
    'CORE_FUNCTION_CHANGE',
    'DESTROY',
  ];

  const mediumImpactTypes: ModuleChangeType[] = [
    'CONFIG_MODIFY',
    'DEPENDENCY_ADJUST',
  ];

  let severity: ImpactScope['severity'] = 'LOW';
  if (highImpactTypes.includes(changeType)) {
    severity = 'HIGH';
  } else if (mediumImpactTypes.includes(changeType)) {
    severity = 'MEDIUM';
  }

  if (
    (affectedComponents && affectedComponents.length > 10) ||
    (affectedDependencies && affectedDependencies.length > 5)
  ) {
    severity = severity === 'LOW' ? 'MEDIUM' : 'CRITICAL';
  }

  const severityDescriptions: Record<ImpactScope['severity'], string> = {
    LOW: `${moduleName}发生${changeType}变更，影响范围有限`,
    MEDIUM: `${moduleName}发生${changeType}变更，可能影响相关组件功能`,
    HIGH: `${moduleName}发生重大${changeType}变更，将影响多个组件和依赖模块`,
    CRITICAL: `${moduleName}发生关键${changeType}变更，系统级影响`,
  };

  return {
    affectedModules: [moduleName],
    affectedComponents: affectedComponents || [],
    severity,
    description: severityDescriptions[severity],
  };
}

export function logModuleInterfaceChange(
  moduleId: string,
  moduleName: string,
  user: { id: string | null; username: string },
  changeDetails: string,
  reason: string,
  previousInterface?: Record<string, unknown>,
  newInterface?: Record<string, unknown>,
  affectedComponents?: string[]
): ModuleLogEntry {
  const impactScope = assessImpactScope(
    moduleName,
    'INTERFACE_CHANGE',
    affectedComponents
  );

  const entry: ModuleLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'MODULE',
    level: impactScope.severity === 'CRITICAL' ? 'CRITICAL' : impactScope.severity === 'HIGH' ? 'WARN' : 'INFO',
    user: { ...user },
    moduleName,
    moduleId,
    changeType: 'INTERFACE_CHANGE',
    reason,
    impactScope,
    changeDetails,
    previousConfig: previousInterface,
    newConfig: newInterface,
    affectedDependencies: undefined,
  };

  const logger = getLogger();
  logger.addModuleLog(entry as Parameters<typeof logger.addModuleLog>[0]);
  return entry;
}

export function logModuleConfigModify(
  moduleId: string,
  moduleName: string,
  user: { id: string | null; username: string },
  changeDetails: string,
  reason: string,
  previousConfig: Record<string, unknown>,
  newConfig: Record<string, unknown>,
  affectedDependencies?: string[]
): ModuleLogEntry {
  const impactScope = assessImpactScope(
    moduleName,
    'CONFIG_MODIFY',
    undefined,
    affectedDependencies
  );

  const hasCriticalConfigChange = Object.keys(newConfig).some(key => {
    const prevVal = JSON.stringify(previousConfig[key]);
    const newVal = JSON.stringify(newConfig[key]);
    return prevVal !== newVal;
  });

  const level: LogLevel =
    impactScope.severity === 'HIGH' || impactScope.severity === 'CRITICAL'
      ? 'WARN'
      : hasCriticalConfigChange
      ? 'WARN'
      : 'INFO';

  const entry: ModuleLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'MODULE',
    level,
    user: { ...user },
    moduleName,
    moduleId,
    changeType: 'CONFIG_MODIFY',
    reason,
    impactScope,
    changeDetails,
    previousConfig,
    newConfig,
    affectedDependencies,
  };

  const logger = getLogger();
  logger.addModuleLog(entry as Parameters<typeof logger.addModuleLog>[0]);
  return entry;
}

export function logModuleDependencyAdjust(
  moduleId: string,
  moduleName: string,
  user: { id: string | null; username: string },
  changeDetails: string,
  reason: string,
  addedDependencies?: string[],
  removedDependencies?: string[]
): ModuleLogEntry {
  const allAffected = [...(addedDependencies || []), ...(removedDependencies || [])];
  const impactScope = assessImpactScope(
    moduleName,
    'DEPENDENCY_ADJUST',
    undefined,
    allAffected.length > 0 ? allAffected : undefined
  );

  const entry: ModuleLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'MODULE',
    level: impactScope.severity === 'HIGH' ? 'WARN' : 'INFO',
    user: { ...user },
    moduleName,
    moduleId,
    changeType: 'DEPENDENCY_ADJUST',
    reason,
    impactScope,
    changeDetails,
    affectedDependencies: allAffected,
    metadata: {
      addedDependencies,
      removedDependencies,
    },
  };

  const logger = getLogger();
  logger.addModuleLog(entry as Parameters<typeof logger.addModuleLog>[0]);
  return entry;
}

export function logModuleCoreFunctionChange(
  moduleId: string,
  moduleName: string,
  user: { id: string | null; username: string },
  changeDetails: string,
  reason: string,
  affectedComponents?: string[],
  previousImplementation?: string,
  newImplementation?: string
): ModuleLogEntry {
  const impactScope = assessImpactScope(
    moduleName,
    'CORE_FUNCTION_CHANGE',
    affectedComponents
  );

  const entry: ModuleLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'MODULE',
    level: 'WARN',
    user: { ...user },
    moduleName,
    moduleId,
    changeType: 'CORE_FUNCTION_CHANGE',
    reason,
    impactScope,
    changeDetails,
    affectedDependencies: affectedComponents,
    metadata: {
      previousImplementation,
      newImplementation,
    },
  };

  const logger = getLogger();
  logger.addModuleLog(entry as Parameters<typeof logger.addModuleLog>[0]);
  return entry;
}

export function logModuleLifecycle(
  moduleId: string,
  moduleName: string,
  user: { id: string | null; username: string },
  changeType: 'INIT' | 'DESTROY' | 'ENABLE' | 'DISABLE',
  reason: string,
  details?: string,
  config?: Record<string, unknown>
): ModuleLogEntry {
  const impactScope = assessImpactScope(moduleName, changeType);

  const levelMap: Record<string, LogLevel> = {
    INIT: 'INFO',
    DESTROY: 'WARN',
    ENABLE: 'INFO',
    DISABLE: 'WARN',
  };

  const entry: ModuleLogEntry = {
    id: '',
    timestamp: new Date().toISOString(),
    layer: 'MODULE',
    level: levelMap[changeType] || 'INFO',
    user: { ...user },
    moduleName,
    moduleId,
    changeType,
    reason,
    impactScope,
    changeDetails: details || `模块${moduleName}${changeType === 'INIT' ? '初始化' : changeType === 'DESTROY' ? '销毁' : changeType === 'ENABLE' ? '启用' : '禁用'}`,
    newConfig: config,
  };

  const logger = getLogger();
  logger.addModuleLog(entry as Parameters<typeof logger.addModuleLog>[0]);
  return entry;
}

export function getModuleLogs(filter?: LogFilter): ModuleLogEntry[] {
  const logger = getLogger();
  return logger.getModuleLogs(filter) as ModuleLogEntry[];
}

export function addModuleLogListener(
  listener: LogListener<ModuleLogEntry>
): () => void {
  const logger = getLogger();
  return logger.addGlobalListener(listener as LogListener<import('./types').HierarchicalLogEntry>);
}
