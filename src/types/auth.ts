export type UserRole = 'admin' | 'manager' | 'engineer' | 'viewer';

export type Permission =
  | 'project:read' | 'project:write' | 'project:delete'
  | 'module:read' | 'module:write' | 'module:delete'
  | 'component:read' | 'component:write' | 'component:delete'
  | 'user:read' | 'user:write' | 'user:delete'
  | 'designFile:read' | 'designFile:write'
  | 'document:read' | 'document:write'
  | 'software:read' | 'software:write'
  | 'task:read' | 'task:write';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'project:read', 'project:write', 'project:delete',
    'module:read', 'module:write', 'module:delete',
    'component:read', 'component:write', 'component:delete',
    'user:read', 'user:write', 'user:delete',
    'designFile:read', 'designFile:write',
    'document:read', 'document:write',
    'software:read', 'software:write',
    'task:read', 'task:write',
  ],
  manager: [
    'project:read', 'project:write', 'project:delete',
    'module:read', 'module:write', 'module:delete',
    'component:read', 'component:write', 'component:delete',
    'designFile:read', 'designFile:write',
    'document:read', 'document:write',
    'software:read', 'software:write',
    'task:read', 'task:write',
  ],
  engineer: [
    'project:read',
    'module:read', 'module:write',
    'component:read', 'component:write',
    'document:read', 'document:write',
    'software:read', 'software:write',
    'task:read', 'task:write',
  ],
  viewer: [
    'project:read',
    'module:read',
    'component:read',
    'designFile:read',
    'document:read',
    'software:read',
    'task:read',
  ],
};

export const ROLE_NAMES: Record<UserRole, string> = {
  admin: '管理员',
  manager: '项目经理',
  engineer: '工程师',
  viewer: '查看者',
};
