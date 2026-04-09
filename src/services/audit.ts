import type { AuditLog, AuditAction, AuditLevel } from '../types/audit';
import { generateId } from '../utils/auth';
import { safeSetObject, safeGetObject } from './storageManager';

const AUDIT_LOGS_KEY = 'audit_logs';
const MAX_AUDIT_LOGS = 500;
const LOG_BUFFER_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;

let logBuffer: AuditLog[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isUnloading = false;

function getAuditLogsFromStorage(): AuditLog[] {
  try {
    return safeGetObject<AuditLog[]>(AUDIT_LOGS_KEY) || [];
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return [];
  }
}

export function getAuditLogs(): AuditLog[] {
  return getAuditLogsFromStorage();
}

function saveAuditLogs(logs: AuditLog[]): void {
  try {
    safeSetObject(AUDIT_LOGS_KEY, logs);
  } catch (error) {
    console.error('Failed to save audit logs:', error);
  }
}

function flushLogs(): void {
  if (logBuffer.length === 0) return;

  try {
    const logs = getAuditLogsFromStorage();
    const newLogs = [...logBuffer, ...logs].slice(0, MAX_AUDIT_LOGS);
    saveAuditLogs(newLogs);
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

export function addAuditLog(
  userId: string,
  username: string,
  action: AuditAction,
  level: AuditLevel,
  resourceType: string,
  resourceId?: string,
  resourceName?: string,
  details?: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>,
  reason?: string,
  additionalInfo?: string
): AuditLog {
  const fullDetails = [
    details,
    beforeState ? `Before: ${JSON.stringify(beforeState)}` : '',
    afterState ? `After: ${JSON.stringify(afterState)}` : '',
    reason ? `Reason: ${reason}` : '',
    additionalInfo || '',
  ].filter(Boolean).join(' | ');

  const log: AuditLog = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId,
    username,
    action,
    level,
    resourceType,
    resourceId,
    resourceName,
    details: fullDetails || details,
    beforeState,
    afterState,
    reason,
  };

  logBuffer.push(log);

  if (logBuffer.length >= LOG_BUFFER_SIZE) {
    flushLogs();
  } else {
    scheduleFlush();
  }

  return log;
}

export function flushAuditLogs(): void {
  flushLogs();
}

export function clearAuditLogs(): void {
  flushLogs();
  localStorage.removeItem(AUDIT_LOGS_KEY);
}

export function addModuleAuditLog(
  userId: string,
  username: string,
  action: AuditAction,
  moduleId: string,
  moduleName: string,
  details?: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>,
  reason?: string,
  additionalInfo?: string
): AuditLog {
  return addAuditLog(userId, username, action, 'INFO', 'Module', moduleId, moduleName, details, beforeState, afterState, reason, additionalInfo);
}

export function addComponentAuditLog(
  userId: string,
  username: string,
  action: AuditAction,
  componentId: string,
  componentName: string,
  details?: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>,
  reason?: string,
  additionalInfo?: string
): AuditLog {
  return addAuditLog(userId, username, action, 'INFO', 'Component', componentId, componentName, details, beforeState, afterState, reason, additionalInfo);
}

export function addProjectAuditLog(
  userId: string,
  username: string,
  action: AuditAction,
  projectId: string,
  projectName: string,
  details?: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>,
  reason?: string,
  additionalInfo?: string
): AuditLog {
  return addAuditLog(userId, username, action, 'INFO', 'Project', projectId, projectName, details, beforeState, afterState, reason, additionalInfo);
}

export function addSoftwareAuditLog(
  userId: string,
  username: string,
  action: AuditAction,
  softwareId: string,
  softwareName: string,
  details?: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>,
  reason?: string,
  additionalInfo?: string
): AuditLog {
  return addAuditLog(userId, username, action, 'INFO', 'Software', softwareId, softwareName, details, beforeState, afterState, reason, additionalInfo);
}

export function addDocumentAuditLog(
  userId: string,
  username: string,
  action: AuditAction,
  documentId: string,
  documentName: string,
  details?: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>,
  reason?: string,
  additionalInfo?: string
): AuditLog {
  return addAuditLog(userId, username, action, 'INFO', 'Document', documentId, documentName, details, beforeState, afterState, reason, additionalInfo);
}

export function exportAuditLogs(): string {
  flushLogs();
  const logs = getAuditLogsFromStorage();
  return JSON.stringify(logs, null, 2);
}

export function getAuditLogsByUser(userId: string): AuditLog[] {
  const logs = getAuditLogsFromStorage();
  return logs.filter(log => log.userId === userId);
}

export function getAuditLogsByResource(resourceType: string, resourceId?: string): AuditLog[] {
  const logs = getAuditLogsFromStorage();
  return logs.filter(log =>
    log.resourceType === resourceType &&
    (!resourceId || log.resourceId === resourceId)
  );
}

export function getAuditLogsByTimeRange(startTime: string, endTime: string): AuditLog[] {
  const logs = getAuditLogsFromStorage();
  return logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
}

export function searchAuditLogs(keyword: string): AuditLog[] {
  const logs = getAuditLogsFromStorage();
  const lowerKeyword = keyword.toLowerCase();
  return logs.filter(log =>
    log.details?.toLowerCase().includes(lowerKeyword) ||
    log.resourceName?.toLowerCase().includes(lowerKeyword) ||
    log.username.toLowerCase().includes(lowerKeyword)
  );
}