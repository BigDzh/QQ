import type { AuditLog, AuditAction, AuditLevel } from '../types/audit';
import { generateId } from '../utils/auth';
import { safeSetObject, safeGetObject } from './storageManager';

const AUDIT_LOGS_KEY = 'audit_logs';
const MAX_AUDIT_LOGS = 500;
const LOG_BUFFER_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;

let logBuffer: AuditLog[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function getAuditLogs(): AuditLog[] {
  return safeGetObject<AuditLog[]>(AUDIT_LOGS_KEY) || [];
}

export function saveAuditLogs(logs: AuditLog[]): void {
  safeSetObject(AUDIT_LOGS_KEY, logs);
}

function flushLogs(): void {
  if (logBuffer.length === 0) return;

  const logs = getAuditLogs();
  const newLogs = [...logBuffer, ...logs].slice(0, MAX_AUDIT_LOGS);
  saveAuditLogs(newLogs);
  logBuffer = [];

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;

  flushTimer = setTimeout(() => {
    flushLogs();
  }, FLUSH_INTERVAL_MS);
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

export function exportAuditLogs(): string {
  flushLogs();
  const logs = getAuditLogs();
  return JSON.stringify(logs, null, 2);
}
