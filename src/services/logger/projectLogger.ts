import type { HierarchicalLogEntry, LogFilter, LogListener, LogLevel, LogLayer } from './types';
import { getLogger } from './core';

export type ProjectChangeType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STAGE_CHANGE'
  | 'VERSION_CHANGE'
  | 'CONFIG_CHANGE'
  | 'STATUS_CHANGE';

export interface ProjectLogEntry {
  id: string;
  timestamp: string;
  layer: 'PROJECT';
  level: LogLevel;
  user: { id: string | null; username: string };
  projectId: string;
  projectName: string;
  changeType: ProjectChangeType;
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

const PROJECT_STORAGE_KEY = 'hierarchical_log_project';

class ProjectLogStore {
  private entries: ProjectLogEntry[] = [];
  private readonly maxEntries: number;
  private readonly storageKey: string;
  private listeners: Set<LogListener<ProjectLogEntry>> = new Set();

  constructor(maxEntries: number, storageKey: string) {
    this.maxEntries = maxEntries;
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.entries = parsed.slice(0, this.maxEntries);
        }
      }
    } catch (e) {
      console.error('Failed to load project logs from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch (e) {
      console.error('Failed to save project logs to storage:', e);
    }
  }

  add(entry: ProjectLogEntry): void {
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
    this.saveToStorage();
    this.notifyListeners(entry);
  }

  getAll(): ProjectLogEntry[] {
    return [...this.entries];
  }

  getFiltered(filter: LogFilter): ProjectLogEntry[] {
    let result = [...this.entries];

    if (filter.startDate) {
      result = result.filter(e => e.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      result = result.filter(e => e.timestamp <= filter.endDate!);
    }
    if (filter.level && filter.level !== 'ALL') {
      result = result.filter(e => e.level === filter.level);
    }
    if (filter.userId) {
      result = result.filter(e => e.user.id === filter.userId);
    }
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      result = result.filter(e => JSON.stringify(e).toLowerCase().includes(term));
    }
    if (filter.offset) {
      result = result.slice(filter.offset);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  clear(): void {
    this.entries = [];
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error('Failed to clear project log storage:', e);
    }
  }

  get count(): number {
    return this.entries.length;
  }

  addListener(listener: LogListener<ProjectLogEntry>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(entry: ProjectLogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (e) {
        console.error('Error in project log listener:', e);
      }
    });
  }
}

class ProjectLoggerService {
  private store: ProjectLogStore;
  private globalLogger = getLogger();
  private static instance: ProjectLoggerService | null = null;

  private constructor() {
    this.store = new ProjectLogStore(2000, PROJECT_STORAGE_KEY);
  }

  static getInstance(): ProjectLoggerService {
    if (!ProjectLoggerService.instance) {
      ProjectLoggerService.instance = new ProjectLoggerService();
    }
    return ProjectLoggerService.instance;
  }

  private outputToConsole(entry: ProjectLogEntry): void {
    const styleMap: Record<LogLevel, string> = {
      INFO: 'color: #4CAF50; font-weight: bold;',
      WARN: 'color: #FF9800; font-weight: bold;',
      ERROR: 'color: #F44336; font-weight: bold;',
      CRITICAL: 'color: #9C27B0; font-weight: bold; background: #FFF3E0;',
    };

    const prefix = `%c[📋PROJECT] [${entry.level}]`;
    console.log(prefix, styleMap[entry.level], entry);
  }

  logProjectChange(
    projectId: string,
    projectName: string,
    user: { id: string | null; username: string },
    changeType: ProjectChangeType,
    reason?: string,
    previousState?: Record<string, unknown>,
    currentState?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): ProjectLogEntry {
    const changedProperties = currentState && previousState
      ? Object.keys(currentState).reduce<Array<{
          key: string;
          previousValue: unknown;
          newValue: unknown;
        }>>((acc, key) => {
          if (JSON.stringify(previousState[key]) !== JSON.stringify(currentState[key])) {
            acc.push({
              key,
              previousValue: previousState[key],
              newValue: currentState[key],
            });
          }
          return acc;
        }, [])
      : [];

    const level: LogLevel = changedProperties.length > 5 ? 'WARN' : 'INFO';

    const entry: ProjectLogEntry = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      layer: 'PROJECT',
      level,
      user: { ...user },
      projectId,
      projectName,
      changeType,
      reason,
      previousState,
      currentState,
      changedProperties,
      metadata,
    };

    this.outputToConsole(entry);
    this.store.add(entry);
    this.globalLogger.addSystemLog({
      ...entry,
      eventType: 'CONFIG_CHANGE',
      eventDescription: `[项目变更] ${projectName}: ${changeType}`,
      impactScope: {
        affectedModules: [],
        affectedComponents: [],
        severity: 'MEDIUM',
        description: `项目 ${projectName} 发生 ${changeType} 变更`,
      },
    } as any);

    return entry;
  }

  logProjectCreate(
    projectId: string,
    projectName: string,
    user: { id: string | null; username: string },
    initialState: Record<string, unknown>
  ): ProjectLogEntry {
    return this.logProjectChange(
      projectId,
      projectName,
      user,
      'CREATE',
      '新建项目',
      undefined,
      initialState,
      { action: 'CREATE', timestamp: new Date().toISOString() }
    );
  }

  logProjectUpdate(
    projectId: string,
    projectName: string,
    user: { id: string | null; username: string },
    previousState: Record<string, unknown>,
    newState: Record<string, unknown>,
    reason?: string
  ): ProjectLogEntry {
    return this.logProjectChange(
      projectId,
      projectName,
      user,
      'UPDATE',
      reason || '更新项目信息',
      previousState,
      newState
    );
  }

  logProjectStageChange(
    projectId: string,
    projectName: string,
    user: { id: string | null; username: string },
    previousStage: string,
    newStage: string
  ): ProjectLogEntry {
    return this.logProjectChange(
      projectId,
      projectName,
      user,
      'STAGE_CHANGE',
      `阶段变更: ${previousStage} → ${newStage}`,
      { stage: previousStage },
      { stage: newStage },
      { previousStage, newStage }
    );
  }

  logProjectDelete(
    projectId: string,
    projectName: string,
    user: { id: string | null; username: string },
    finalState: Record<string, unknown>
  ): ProjectLogEntry {
    return this.logProjectChange(
      projectId,
      projectName,
      user,
      'DELETE',
      '删除项目',
      finalState,
      undefined,
      { action: 'DELETE', timestamp: new Date().toISOString() }
    );
  }

  getProjectLogs(filter?: LogFilter): ProjectLogEntry[] {
    if (filter) return this.store.getFiltered(filter);
    return this.store.getAll();
  }

  addListener(listener: LogListener<ProjectLogEntry>): () => void {
    return this.store.addListener(listener);
  }

  clearProjectLogs(): void {
    this.store.clear();
  }

  getStatistics(): {
    totalLogs: number;
    byChangeType: Record<ProjectChangeType, number>;
    byLevel: Record<LogLevel, number>;
    recentCount: number;
  } {
    const logs = this.store.getAll();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const byChangeType: Record<ProjectChangeType, number> = {
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      STAGE_CHANGE: 0,
      VERSION_CHANGE: 0,
      CONFIG_CHANGE: 0,
      STATUS_CHANGE: 0,
    };

    const byLevel: Record<LogLevel, number> = {
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      CRITICAL: 0,
    };

    logs.forEach(log => {
      byChangeType[log.changeType]++;
      byLevel[log.level]++;
    });

    return {
      totalLogs: logs.length,
      byChangeType,
      byLevel,
      recentCount: logs.filter(l => l.timestamp >= oneDayAgo).length,
    };
  }
}

export const projectLogger = ProjectLoggerService.getInstance();

export function logProjectChange(
  projectId: string,
  projectName: string,
  user: { id: string | null; username: string },
  changeType: ProjectChangeType,
  reason?: string,
  previousState?: Record<string, unknown>,
  currentState?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): ProjectLogEntry {
  return projectLogger.logProjectChange(
    projectId, projectName, user, changeType, reason, previousState, currentState, metadata
  );
}

export function logProjectCreate(
  projectId: string,
  projectName: string,
  user: { id: string | null; username: string },
  initialState: Record<string, unknown>
): ProjectLogEntry {
  return projectLogger.logProjectCreate(projectId, projectName, user, initialState);
}

export function logProjectUpdate(
  projectId: string,
  projectName: string,
  user: { id: string | null; username: string },
  previousState: Record<string, unknown>,
  newState: Record<string, unknown>,
  reason?: string
): ProjectLogEntry {
  return projectLogger.logProjectUpdate(projectId, projectName, user, previousState, newState, reason);
}

export function logProjectStageChange(
  projectId: string,
  projectName: string,
  user: { id: string | null; username: string },
  previousStage: string,
  newStage: string
): ProjectLogEntry {
  return projectLogger.logProjectStageChange(projectId, projectName, user, previousStage, newStage);
}

export function logProjectDelete(
  projectId: string,
  projectName: string,
  user: { id: string | null; username: string },
  finalState: Record<string, unknown>
): ProjectLogEntry {
  return projectLogger.logProjectDelete(projectId, projectName, user, finalState);
}

export function getProjectLogs(filter?: LogFilter): ProjectLogEntry[] {
  return projectLogger.getProjectLogs(filter);
}

export function addProjectLogListener(listener: LogListener<ProjectLogEntry>): () => void {
  return projectLogger.addListener(listener);
}
