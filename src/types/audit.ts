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
  | 'RESTORE'
  | 'ENABLE'
  | 'DISABLE'
  | 'STATUS_CHANGE'
  | 'CONFIG_CHANGE'
  | 'LAYOUT_CHANGE';

export type AuditLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export type AuditResourceType = 'SYSTEM' | 'MODULE' | 'COMPONENT' | 'PROJECT' | 'USER' | 'DOCUMENT' | 'TASK' | 'FILE' | 'LOAN' | string;

export type AuditLogType = 'USER' | 'PROJECT' | 'MODULE' | 'SYSTEM' | 'COMPONENT' | 'DOCUMENT' | 'TASK' | 'FILE' | 'LOAN' | 'SOFTWARE';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: AuditAction;
  level: AuditLevel;
  resourceType: AuditResourceType;
  resourceId?: string;
  resourceName?: string;
  details?: string;
  ipAddress?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  reason?: string;
  operatorProcess?: string;
}

export interface SystemAuditLog extends AuditLog {
  resourceType: 'SYSTEM';
  systemId: string;
  systemName: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LAYOUT' | 'CONFIG';
}

export interface ModuleAuditLog extends AuditLog {
  resourceType: 'MODULE';
  moduleId: string;
  moduleName: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'ENABLE' | 'DISABLE' | 'CONFIG';
}

export interface ComponentAuditLog extends AuditLog {
  resourceType: 'COMPONENT';
  componentId: string;
  componentName: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'PROPERTY_CHANGE' | 'STYLE_CHANGE';
}
