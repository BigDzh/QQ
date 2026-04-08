import { useCallback } from 'react';
import {
  logModuleInterfaceChange,
  logModuleConfigModify,
  logModuleDependencyAdjust,
  logModuleCoreFunctionChange,
  logModuleLifecycle,
  getModuleLogs,
  addModuleLogListener,
  type ModuleLogEntry,
} from '../services/logger/moduleLogger';
import type { LogFilter, ModuleChangeType } from '../services/logger/types';

interface UseModuleLoggerOptions {
  moduleId: string;
  moduleName: string;
  userId?: string | null;
  username?: string;
}

export function useModuleLogger(options: UseModuleLoggerOptions) {
  const {
    moduleId,
    moduleName,
    userId = null,
    username = '系统',
  } = options;

  const user = { id: userId, username };

  const logInterfaceChange = useCallback(
    (
      changeDetails: string,
      reason: string,
      previousInterface?: Record<string, unknown>,
      newInterface?: Record<string, unknown>,
      affectedComponents?: string[]
    ) => {
      return logModuleInterfaceChange(
        moduleId,
        moduleName,
        user,
        changeDetails,
        reason,
        previousInterface,
        newInterface,
        affectedComponents
      );
    },
    [moduleId, moduleName, user]
  );

  const logConfigModify = useCallback(
    (
      changeDetails: string,
      previousConfig: Record<string, unknown>,
      newConfig: Record<string, unknown>,
      reason: string,
      affectedDependencies?: string[]
    ) => {
      return logModuleConfigModify(
        moduleId,
        moduleName,
        user,
        changeDetails,
        reason,
        previousConfig,
        newConfig,
        affectedDependencies
      );
    },
    [moduleId, moduleName, user]
  );

  const logDependencyAdjust = useCallback(
    (
      changeDetails: string,
      reason: string,
      addedDependencies?: string[],
      removedDependencies?: string[]
    ) => {
      return logModuleDependencyAdjust(
        moduleId,
        moduleName,
        user,
        changeDetails,
        reason,
        addedDependencies,
        removedDependencies
      );
    },
    [moduleId, moduleName, user]
  );

  const logCoreFunctionChange = useCallback(
    (
      changeDetails: string,
      reason: string,
      affectedComponents?: string[],
      previousImplementation?: string,
      newImplementation?: string
    ) => {
      return logModuleCoreFunctionChange(
        moduleId,
        moduleName,
        user,
        changeDetails,
        reason,
        affectedComponents,
        previousImplementation,
        newImplementation
      );
    },
    [moduleId, moduleName, user]
  );

  const logInit = useCallback(
    (reason: string, config?: Record<string, unknown>) => {
      return logModuleLifecycle(moduleId, moduleName, user, 'INIT', reason, undefined, config);
    },
    [moduleId, moduleName, user]
  );

  const logDestroy = useCallback(
    (reason: string, details?: string, config?: Record<string, unknown>) => {
      return logModuleLifecycle(moduleId, moduleName, user, 'DESTROY', reason, details, config);
    },
    [moduleId, moduleName, user]
  );

  const logEnable = useCallback(
    (reason: string, details?: string, config?: Record<string, unknown>) => {
      return logModuleLifecycle(moduleId, moduleName, user, 'ENABLE', reason, details, config);
    },
    [moduleId, moduleName, user]
  );

  const logDisable = useCallback(
    (reason: string, details?: string, config?: Record<string, unknown>) => {
      return logModuleLifecycle(moduleId, moduleName, user, 'DISABLE', reason, details, config);
    },
    [moduleId, moduleName, user]
  );

  const logLifecycle = useCallback(
    (
      changeType: 'INIT' | 'DESTROY' | 'ENABLE' | 'DISABLE',
      reason: string,
      details?: string,
      config?: Record<string, unknown>
    ) => {
      return logModuleLifecycle(moduleId, moduleName, user, changeType, reason, details, config);
    },
    [moduleId, moduleName, user]
  );

  const logModuleChange = useCallback(
    (
      changeType: ModuleChangeType,
      changeDetails: string,
      reason: string,
      previousConfig?: Record<string, unknown>,
      newConfig?: Record<string, unknown>,
      affectedDependencies?: string[]
    ) => {
      switch (changeType) {
        case 'INTERFACE_CHANGE':
          return logModuleInterfaceChange(
            moduleId,
            moduleName,
            user,
            changeDetails,
            reason,
            previousConfig,
            newConfig,
            affectedDependencies
          );
        case 'CONFIG_MODIFY':
          return logModuleConfigModify(
            moduleId,
            moduleName,
            user,
            changeDetails,
            reason,
            previousConfig || {},
            newConfig || {},
            affectedDependencies
          );
        case 'DEPENDENCY_ADJUST':
          return logModuleDependencyAdjust(
            moduleId,
            moduleName,
            user,
            changeDetails,
            reason,
            (affectedDependencies || []) as string[],
            []
          );
        case 'CORE_FUNCTION_CHANGE':
          return logModuleCoreFunctionChange(
            moduleId,
            moduleName,
            user,
            changeDetails,
            reason,
            affectedDependencies
          );
        case 'INIT':
        case 'DESTROY':
        case 'ENABLE':
        case 'DISABLE':
          return logModuleLifecycle(moduleId, moduleName, user, changeType, reason, changeDetails);
        default:
          return logModuleConfigModify(
            moduleId,
            moduleName,
            user,
            changeDetails,
            reason,
            previousConfig || {},
            newConfig || {},
            affectedDependencies
          );
      }
    },
    [moduleId, moduleName, user]
  );

  const getLogs = useCallback((filter?: LogFilter): ModuleLogEntry[] => {
    return getModuleLogs(filter);
  }, []);

  // eslint-disable-next-line no-unused-vars
  const subscribe = useCallback((listener: (entry: ModuleLogEntry) => void) => {
    return addModuleLogListener(listener);
  }, []);

  return {
    logInterfaceChange,
    logConfigModify,
    logDependencyAdjust,
    logCoreFunctionChange,
    logInit,
    logDestroy,
    logEnable,
    logDisable,
    logLifecycle,
    logModuleChange,
    getLogs,
    subscribe,
    user,
  };
}
