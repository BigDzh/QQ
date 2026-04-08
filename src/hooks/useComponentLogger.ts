import { useEffect, useRef, useCallback } from 'react';
import type { ComponentChangeType, LogLevel } from '../services/logger/types';
import {
  logComponentCreate,
  logComponentUpdate,
  logComponentDestroy,
  logComponentMount,
  logComponentUnmount,
  logComponentStateChange,
  logComponentEvent,
} from '../services/logger/componentLogger';

interface UseComponentLoggerOptions {
  componentId: string;
  componentName: string;
  userId?: string | null;
  username?: string;
  enableLifecycleLogging?: boolean;
  enableStateTracking?: boolean;
  trackProperties?: string[];
}

export function useComponentLogger(options: UseComponentLoggerOptions) {
  const {
    componentId,
    componentName,
    userId = null,
    username = '系统',
    enableLifecycleLogging = true,
    enableStateTracking = false,
    trackProperties = [],
  } = options;

  const user = { id: userId, username };
  const prevStateRef = useRef<Record<string, unknown>>({});
  const isMountedRef = useRef(false);

  const logCreate = useCallback(
    (reason: string, initialState?: Record<string, unknown>, metadata?: Record<string, unknown>) => {
      logComponentCreate(componentId, componentName, user, reason, initialState, metadata);
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
      logComponentUpdate(componentId, componentName, user, previousState, newState, reason, metadata);
    },
    [componentId, componentName, user]
  );

  const logDestroy = useCallback(
    (reason: string, finalState?: Record<string, unknown>, metadata?: Record<string, unknown>) => {
      logComponentDestroy(componentId, componentName, user, reason, finalState, metadata);
    },
    [componentId, componentName, user]
  );

  const logStateChange = useCallback(
    (
      changeType: ComponentChangeType,
      previousValue: Record<string, unknown> | string,
      newValue: Record<string, unknown> | string,
      reason: string,
      level?: LogLevel,
      metadata?: Record<string, unknown>
    ) => {
      logComponentStateChange(
        componentId,
        componentName,
        user,
        changeType,
        previousValue,
        newValue,
        reason,
        level,
        metadata
      );
    },
    [componentId, componentName, user]
  );

  const logEvent = useCallback(
    (eventType: string, eventData: Record<string, unknown> | undefined, reason: string, metadata?: Record<string, unknown>) => {
      logComponentEvent(componentId, componentName, user, eventType, eventData, reason, metadata);
    },
    [componentId, componentName, user]
  );

  const trackState = useCallback(
    (state: Record<string, unknown>) => {
      if (!enableStateTracking) return;

      const prev = prevStateRef.current;
      const hasChanges = trackProperties.some(
        prop => JSON.stringify(prev[prop]) !== JSON.stringify(state[prop])
      );

      if (hasChanges || Object.keys(prev).length === 0) {
        const changedProps = trackProperties.filter(
          prop => JSON.stringify(prev[prop]) !== JSON.stringify(state[prop])
        );
        if (changedProps.length > 0) {
          logComponentUpdate(componentId, componentName, user, prev, state, `状态跟踪: 属性 ${changedProps.join(', ')} 变更`, {
            trackedProperties: changedProps,
          });
        }
      }

      prevStateRef.current = { ...state };
    },
    [componentId, componentName, user, enableStateTracking, trackProperties]
  );

  useEffect(() => {
    if (enableLifecycleLogging) {
      logComponentMount(componentId, componentName, user, '组件首次挂载', {
        options: { enableLifecycleLogging, enableStateTracking, trackProperties },
      });
      isMountedRef.current = true;
    }

    return () => {
      if (enableLifecycleLogging && isMountedRef.current) {
        logComponentUnmount(componentId, componentName, user, '组件卸载/重新挂载', {
          finalState: prevStateRef.current,
        });
      }
    };
  }, [componentId, componentName, user, enableLifecycleLogging, enableStateTracking, trackProperties]);

  return {
    logCreate,
    logUpdate,
    logDestroy,
    logStateChange,
    logEvent,
    trackState,
  };
}
