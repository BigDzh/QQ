import type { AuditLog, AuditAction, AuditLevel } from '../types/audit';
import { generateId } from '../utils/auth';
import { safeSetObject, safeGetObject } from './storageManager';

const AUDIT_LOGS_KEY = 'audit_logs';
const MAX_AUDIT_LOGS = 500;

export function getAuditLogs(): AuditLog[] {
  return safeGetObject<AuditLog[]>(AUDIT_LOGS_KEY) || [];
}

export function saveAuditLogs(logs: AuditLog[]): void {
  safeSetObject(AUDIT_LOGS_KEY, logs);
}

export function addAuditLog(
  userId: string,
  username: string,
  action: AuditAction,
  level: AuditLevel,
  resourceType: string,
  resourceId?: string,
  resourceName?: string,
  details?: string
): AuditLog {
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
    details,
  };

  const logs = getAuditLogs();
  logs.unshift(log);
  if (logs.length > MAX_AUDIT_LOGS) {
    logs.pop();
  }
  saveAuditLogs(logs);
  return log;
}

export function clearAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOGS_KEY);
}

export function exportAuditLogs(): string {
  const logs = getAuditLogs();
  return JSON.stringify(logs, null, 2);
}
