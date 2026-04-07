import { useCallback, useRef } from 'react';
import {
  logProjectCreate,
  logProjectUpdate,
  logProjectStageChange,
  logProjectDelete,
  logProjectChange,
  getProjectLogs,
  addProjectLogListener,
  projectLogger,
  type ProjectLogEntry,
} from '../services/logger/projectLogger';
import type { LogFilter } from '../services/logger/types';

interface UseProjectLoggerOptions {
  projectId: string;
  projectName: string;
  userId?: string | null;
  username?: string;
}

export function useProjectLogger(options: UseProjectLoggerOptions) {
  const {
    projectId,
    projectName,
    userId = null,
    username = '系统',
  } = options;

  const user = { id: userId, username };
  const prevStateRef = useRef<Record<string, unknown>>({});

  const logCreate = useCallback(
    (initialState: Record<string, unknown>) => {
      return logProjectCreate(projectId, projectName, user, initialState);
    },
    [projectId, projectName, user]
  );

  const logUpdate = useCallback(
    (
      previousState: Record<string, unknown>,
      newState: Record<string, unknown>,
      reason?: string
    ) => {
      return logProjectUpdate(projectId, projectName, user, previousState, newState, reason);
    },
    [projectId, projectName, user]
  );

  const logStageChange = useCallback(
    (previousStage: string, newStage: string) => {
      return logProjectStageChange(projectId, projectName, user, previousStage, newStage);
    },
    [projectId, projectName, user]
  );

  const logDelete = useCallback(
    (finalState: Record<string, unknown>) => {
      return logProjectDelete(projectId, projectName, user, finalState);
    },
    [projectId, projectName, user]
  );

  const logChange = useCallback(
    (
      changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'STAGE_CHANGE' | 'VERSION_CHANGE' | 'CONFIG_CHANGE' | 'STATUS_CHANGE',
      reason?: string,
      previousState?: Record<string, unknown>,
      currentState?: Record<string, unknown>,
      metadata?: Record<string, unknown>
    ) => {
      return logProjectChange(
        projectId,
        projectName,
        user,
        changeType,
        reason,
        previousState,
        currentState,
        metadata
      );
    },
    [projectId, projectName, user]
  );

  const trackState = useCallback(
    (state: Record<string, unknown>, reason?: string) => {
      const prev = prevStateRef.current;
      if (Object.keys(prev).length > 0) {
        const hasChanges = Object.keys(state).some(
          key => JSON.stringify(prev[key]) !== JSON.stringify(state[key])
        );
        if (hasChanges) {
          logProjectUpdate(projectId, projectName, user, prev, state, reason || '状态跟踪变更');
        }
      }
      prevStateRef.current = { ...state };
    },
    [projectId, projectName, user]
  );

  const getLogs = useCallback((filter?: LogFilter): ProjectLogEntry[] => {
    return getProjectLogs(filter);
  }, []);

  const getFilteredLogs = useCallback(
    (filter: LogFilter) => {
      return projectLogger.getProjectLogs(filter);
    },
    []
  );

  const getStatistics = useCallback(() => {
    return projectLogger.getStatistics();
  }, []);

  const subscribe = useCallback((listener: (entry: ProjectLogEntry) => void) => {
    return addProjectLogListener(listener as any);
  }, []);

  return {
    logCreate,
    logUpdate,
    logStageChange,
    logDelete,
    logChange,
    trackState,
    getLogs,
    getFilteredLogs,
    getStatistics,
    subscribe,
    user,
  };
}
