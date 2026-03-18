import type { AuditLog, AuditAction, AuditLevel } from '../types/audit';
import { generateId } from '../utils/auth';

const AUDIT_LOGS_KEY = 'audit_logs';

export function getAuditLogs(): AuditLog[] {
  const data = localStorage.getItem(AUDIT_LOGS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveAuditLogs(logs: AuditLog[]): void {
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
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
  if (logs.length > 1000) {
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
