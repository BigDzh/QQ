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
  const logs = getAuditLogs();
  return JSON.stringify(logs, null, 2);
}