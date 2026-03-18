export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'IMPORT'
  | 'BACKUP'
  | 'RESTORE';

export type AuditLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: AuditAction;
  level: AuditLevel;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  details?: string;
  ipAddress?: string;
}
