import type { StateChangeLog, StateChangePriority, StateChangeContext, StateChangeValidationResult, StateChangeLogFilter, AuditLevel, AuditResourceType } from '../types/audit';
import { generateId } from '../utils/auth';
import { safeSetObject, safeGetObject } from './storageManager';

const STATE_CHANGE_LOGS_KEY = 'state_change_logs';
const STATE_CHANGE_LISTENERS_KEY = 'state_change_listeners';
const MAX_STATE_CHANGE_LOGS = 1000;
const LOG_BUFFER_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;
const MIN_REASON_LENGTH = 2;
const MAX_REASON_LENGTH = 500;

const CRITICAL_STATES = ['故障', '维修中', '三防中', '测试中', '仿真中', '投产中', '借用中'];
const NORMAL_STATES = ['正常', '未投产'];

let logBuffer: StateChangeLog[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isUnloading = false;

function getStateChangeLogsFromStorage(): StateChangeLog[] {
  try {
    return safeGetObject<StateChangeLog[]>(STATE_CHANGE_LOGS_KEY) || [];
  } catch (error) {
    console.error('Failed to get state change logs:', error);
    return [];
  }
}

function saveStateChangeLogsToStorage(logs: StateChangeLog[]): void {
  try {
    safeSetObject(STATE_CHANGE_LOGS_KEY, logs);
  } catch (error) {
    console.error('Failed to save state change logs:', error);
  }
}

export function getStateChangeLogs(): StateChangeLog[] {
  return getStateChangeLogsFromStorage();
}

export function saveStateChangeLogs(logs: StateChangeLog[]): void {
  saveStateChangeLogsToStorage(logs);
}

function flushLogs(): void {
  if (logBuffer.length === 0) return;

  try {
    const logs = getStateChangeLogsFromStorage();
    const newLogs = [...logBuffer, ...logs].slice(0, MAX_STATE_CHANGE_LOGS);
    saveStateChangeLogsToStorage(newLogs);
    logBuffer = [];
  } finally {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
}

function scheduleFlush(): void {
  if (flushTimer || isUnloading) return;

  flushTimer = setTimeout(() => {
    flushLogs();
  }, FLUSH_INTERVAL_MS);
}

function handleBeforeUnload(): void {
  isUnloading = true;
  if (logBuffer.length > 0) {
    flushLogs();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', handleBeforeUnload);
}

export function flushStateChangeLogs(): void {
  flushLogs();
}

export function validateReason(reason: string | undefined | null): StateChangeValidationResult {
  const errors: string[] = [];

  if (!reason || typeof reason !== 'string') {
    errors.push('原因不能为空');
    return { isValid: false, errors };
  }

  const trimmedReason = reason.trim();

  if (trimmedReason.length < MIN_REASON_LENGTH) {
    errors.push(`原因描述太短，至少需要 ${MIN_REASON_LENGTH} 个字符`);
  }

  if (trimmedReason.length > MAX_REASON_LENGTH) {
    errors.push(`原因描述太长，最多 ${MAX_REASON_LENGTH} 个字符`);
  }

  if (!trimmedReason.match(/\S+/)) {
    errors.push('原因不能只有空白字符');
  }

  const genericPhrases = ['无', '无原因', '无描述', 'null', 'undefined', 'N/A', 'n/a', '暂无', '暂无描述'];
  if (genericPhrases.includes(trimmedReason.toLowerCase())) {
    errors.push('请提供具体的变更原因，不要使用通用占位符');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function isReasonMandatory(
  resourceType: AuditResourceType,
  previousState: string,
  newState: string
): boolean {
  if (CRITICAL_STATES.includes(newState)) {
    return true;
  }

  if (previousState !== newState) {
    return true;
  }

  if (resourceType === 'COMPONENT' && previousState !== newState) {
    return true;
  }

  return false;
}

export function determinePriority(
  resourceType: AuditResourceType,
  previousState: string,
  newState: string,
  reason?: string
): StateChangePriority {
  if (previousState === '故障' || newState === '故障') {
    return 'CRITICAL';
  }

  if (previousState === '维修中' || newState === '维修中') {
    return 'HIGH';
  }

  if (['三防中', '测试中', '仿真中', '投产中'].includes(newState)) {
    return 'HIGH';
  }

  if (previousState === '正常' && newState === '借用中') {
    return 'NORMAL';
  }

  if (newState === '正常' && ['借用中', '维修中', '故障'].includes(previousState)) {
    return 'HIGH';
  }

  return 'NORMAL';
}

export function determineLevel(priority: StateChangePriority): AuditLevel {
  switch (priority) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
      return 'WARNING';
    case 'NORMAL':
    case 'LOW':
    default:
      return 'INFO';
  }
}

export function addStateChangeLog(
  userId: string | null,
  username: string,
  resourceType: AuditResourceType,
  resourceId: string,
  resourceName: string,
  previousState: string,
  newState: string,
  reason: string,
  context?: Partial<StateChangeContext>
): StateChangeLog {
  const validation = validateReason(reason);
  if (!validation.isValid) {
    throw new Error(`无效的变更原因: ${validation.errors.join(', ')}`);
  }

  const priority = determinePriority(resourceType, previousState, newState, reason);
  const level = determineLevel(priority);

  const fullContext: StateChangeContext = {
    previousValue: previousState,
    newValue: newState,
    metadata: context?.metadata,
    ipAddress: context?.ipAddress,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    sessionId: context?.sessionId,
  };

  const log: StateChangeLog = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId,
    username,
    resourceType,
    resourceId,
    resourceName,
    previousState,
    newState,
    reason: reason.trim(),
    priority,
    context: fullContext,
    level,
  };

  logBuffer.push(log);

  if (logBuffer.length >= LOG_BUFFER_SIZE) {
    flushLogs();
  } else {
    scheduleFlush();
  }

  notifyListeners(log);

  return log;
}

type ListenerCallback = (log: StateChangeLog) => void;
const listeners: Set<ListenerCallback> = new Set();

export function addStateChangeListener(callback: ListenerCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners(log: StateChangeLog): void {
  listeners.forEach(callback => {
    try {
      callback(log);
    } catch (error) {
      console.error('Error in state change listener:', error);
    }
  });
}

export function getFilteredStateChangeLogs(filter: StateChangeLogFilter): StateChangeLog[] {
  let logs = getStateChangeLogsFromStorage();

  if (filter.resourceType) {
    logs = logs.filter(log => log.resourceType === filter.resourceType);
  }

  if (filter.resourceId) {
    logs = logs.filter(log => log.resourceId === filter.resourceId);
  }

  if (filter.userId) {
    logs = logs.filter(log => log.userId === filter.userId);
  }

  if (filter.startDate) {
    logs = logs.filter(log => log.timestamp >= filter.startDate!);
  }

  if (filter.endDate) {
    logs = logs.filter(log => log.timestamp <= filter.endDate!);
  }

  if (filter.priority) {
    logs = logs.filter(log => log.priority === filter.priority);
  }

  if (filter.minLevel) {
    const levelOrder: AuditLevel[] = ['INFO', 'WARNING', 'CRITICAL'];
    const minLevelIndex = levelOrder.indexOf(filter.minLevel);
    logs = logs.filter(log => {
      const logLevelIndex = levelOrder.indexOf(log.level);
      return logLevelIndex >= minLevelIndex;
    });
  }

  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    logs = logs.filter(log =>
      log.reason.toLowerCase().includes(term) ||
      log.resourceName.toLowerCase().includes(term) ||
      log.username.toLowerCase().includes(term) ||
      log.previousState.toLowerCase().includes(term) ||
      log.newState.toLowerCase().includes(term)
    );
  }

  return logs;
}

export function clearStateChangeLogs(): void {
  flushLogs();
  try {
    localStorage.removeItem(STATE_CHANGE_LOGS_KEY);
  } catch (error) {
    console.error('Failed to clear state change logs:', error);
  }
}

export function exportStateChangeLogs(): string {
  flushLogs();
  const logs = getStateChangeLogsFromStorage();
  return JSON.stringify(logs, null, 2);
}

export function getStateChangeStats(): {
  total: number;
  byPriority: Record<StateChangePriority, number>;
  byLevel: Record<AuditLevel, number>;
  recentCount: number;
} {
  flushLogs();
  const logs = getStateChangeLogsFromStorage();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const byPriority: Record<StateChangePriority, number> = {
    LOW: 0,
    NORMAL: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  const byLevel: Record<AuditLevel, number> = {
    INFO: 0,
    WARNING: 0,
    CRITICAL: 0,
  };

  logs.forEach(log => {
    byPriority[log.priority]++;
    byLevel[log.level]++;
  });

  return {
    total: logs.length,
    byPriority,
    byLevel,
    recentCount: logs.filter(log => log.timestamp >= oneDayAgo).length,
  };
}

export function getStateChangeLogsByResource(resourceType: AuditResourceType, resourceId?: string): StateChangeLog[] {
  const logs = getStateChangeLogsFromStorage();
  return logs.filter(log =>
    log.resourceType === resourceType &&
    (!resourceId || log.resourceId === resourceId)
  );
}

export function getStateChangeLogsByUser(userId: string): StateChangeLog[] {
  const logs = getStateChangeLogsFromStorage();
  return logs.filter(log => log.userId === userId);
}

export function getStateChangeLogsByTimeRange(startTime: string, endTime: string): StateChangeLog[] {
  const logs = getStateChangeLogsFromStorage();
  return logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
}

export function searchStateChangeLogs(keyword: string): StateChangeLog[] {
  const logs = getStateChangeLogsFromStorage();
  const lowerKeyword = keyword.toLowerCase();
  return logs.filter(log =>
    log.reason.toLowerCase().includes(lowerKeyword) ||
    log.resourceName.toLowerCase().includes(lowerKeyword) ||
    log.username.toLowerCase().includes(lowerKeyword)
  );
}