import { useCallback } from 'react';
import {
  logComponentCreate,
  logComponentUpdate,
  logComponentDestroy,
  logComponentStateChange,
  logComponentEvent,
  getComponentLogs,
  addComponentLogListener,
  type ComponentLogEntry,
} from '../services/logger/componentLogger';
import type { LogFilter, ComponentChangeType, LogLevel } from '../services/logger/types';

interface UseEntityLoggerOptions {
  componentId: string;
  componentName: string;
  userId?: string | null;
  username?: string;
}

export function useEntityLogger(options: UseEntityLoggerOptions) {
  const {
    componentId,
    componentName,
    userId = null,
    username = '系统',
  } = options;

  const user = { id: userId, username };

  const logCreate = useCallback(
    (
      reason: string,
      initialState?: Record<string, unknown>,
      metadata?: Record<string, unknown>
    ) => {
      return logComponentCreate(componentId, componentName, user, reason, initialState, metadata);
    },
    [componentId, componentName, user]
  );

  const logUpdate = useCallback(
    (
      previousState: Record<string, unknown>,
      newState: Record<string, unknown>,
      reason: string,
      metadata?: Record<string, unknown>
    ) => {
      return logComponentUpdate(componentId, componentName, user, previousState, newState, reason, metadata);
    },
    [componentId, componentName, user]
  );

  const logDestroy = useCallback(
    (
      reason: string,
      finalState?: Record<string, unknown>,
      metadata?: Record<string, unknown>
    ) => {
      return logComponentDestroy(componentId, componentName, user, reason, finalState, metadata);
    },
    [componentId, componentName, user]
  );

  const logStateChange = useCallback(
    (
      changeType: ComponentChangeType,
      previousState: Record<string, unknown> | string,
      newState: Record<string, unknown> | string,
      reason: string,
      level?: LogLevel,
      metadata?: Record<string, unknown>
    ) => {
      return logComponentStateChange(
        componentId,
        componentName,
        user,
        changeType,
        previousState,
        newState,
        reason,
        level,
        metadata
      );
    },
    [componentId, componentName, user]
  );

  const logEvent = useCallback(
    (
      eventType: string,
      eventData: Record<string, unknown> | undefined,
      reason: string,
      metadata?: Record<string, unknown>
    ) => {
      return logComponentEvent(componentId, componentName, user, eventType, eventData, reason, metadata);
    },
    [componentId, componentName, user]
  );

  const logPropertyChange = useCallback(
    (
      propertyName: string,
      previousValue: unknown,
      newValue: unknown,
      reason: string
    ) => {
      return logComponentStateChange(
        componentId,
        componentName,
        user,
        'PROPERTY_CHANGE',
        { [propertyName]: previousValue },
        { [propertyName]: newValue },
        reason,
        'INFO',
        { propertyName }
      );
    },
    [componentId, componentName, user]
  );

  const logStatusChange = useCallback(
    (
      previousStatus: string,
      newStatus: string,
      reason: string
    ) => {
      return logComponentStateChange(
        componentId,
        componentName,
        user,
        'STATE_CHANGE',
        previousStatus,
        newStatus,
        reason,
        'INFO',
        { type: 'STATUS_CHANGE' }
      );
    },
    [componentId, componentName, user]
  );

  const logVersionChange = useCallback(
    (
      previousVersion: string,
      newVersion: string,
      reason: string
    ) => {
      return logComponentStateChange(
        componentId,
        componentName,
        user,
        'PROPERTY_CHANGE',
        { version: previousVersion },
        { version: newVersion },
        reason || `版本更新: ${previousVersion} → ${newVersion}`,
        'INFO',
        { type: 'VERSION_CHANGE' }
      );
    },
    [componentId, componentName, user]
  );

  const logDependencyChange = useCallback(
    (
      addedDependencies: string[] = [],
      removedDependencies: string[] = [],
      reason: string
    ) => {
      return logComponentStateChange(
        componentId,
        componentName,
        user,
        'PROPERTY_CHANGE',
        { dependencies: removedDependencies },
        { dependencies: addedDependencies },
        reason,
        'INFO',
        { type: 'DEPENDENCY_CHANGE', addedDependencies, removedDependencies }
      );
    },
    [componentId, componentName, user]
  );

  const getLogs = useCallback((filter?: LogFilter): ComponentLogEntry[] => {
    return getComponentLogs(filter);
  }, []);

  // eslint-disable-next-line no-unused-vars
  const subscribe = useCallback((listener: (entry: ComponentLogEntry) => void) => {
    return addComponentLogListener(listener);
  }, []);

  return {
    logCreate,
    logUpdate,
    logDestroy,
    logStateChange,
    logEvent,
    logPropertyChange,
    logStatusChange,
    logVersionChange,
    logDependencyChange,
    getLogs,
    subscribe,
    user,
  };
}
