import { generateId } from '../utils/auth';

const DATA_VERSION_KEY = 'data_version';
const MIGRATION_HISTORY_KEY = 'migration_history';
const ROLLBACK_SNAPSHOT_KEY = 'rollback_snapshot';
const CURRENT_DATA_VERSION = '2.19.1';

export interface MigrationRecord {
  id: string;
  fromVersion: string;
  toVersion: string;
  timestamp: string;
  checksum: string;
  status: 'success' | 'failed' | 'rolled_back';
  description?: string;
}

export interface DataSnapshot {
  version: string;
  timestamp: string;
  data: {
    projects?: string;
    users?: string;
    tasks?: string;
    borrowRecords?: string;
    auditLogs?: string;
    backupRecords?: string;
    searchHistory?: string;
  };
  checksum: string;
  metadata: {
    projectCount?: number;
    userCount?: number;
    documentCount?: number;
  };
}

export interface MigrationResult {
  success: boolean;
  message: string;
  checksum?: string;
  error?: string;
}

async function calculateDataChecksum(data: object): Promise<string> {
  const jsonStr = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getDataVersion(): string {
  return localStorage.getItem(DATA_VERSION_KEY) || '1.0.0';
}

export function setDataVersion(version: string): void {
  localStorage.setItem(DATA_VERSION_KEY, version);
}

export async function createPreUpdateSnapshot(): Promise<DataSnapshot> {
  const data: DataSnapshot['data'] = {
    projects: localStorage.getItem('projects') ?? undefined,
    users: localStorage.getItem('users') ?? undefined,
    tasks: localStorage.getItem('tasks') ?? undefined,
    borrowRecords: localStorage.getItem('borrow_records') ?? undefined,
    auditLogs: localStorage.getItem('audit_logs') ?? undefined,
    backupRecords: localStorage.getItem('backup_records') ?? undefined,
    searchHistory: localStorage.getItem('search_history') ?? undefined,
  };

  let projectCount = 0;
  let documentCount = 0;
  let userCount = 0;

  try {
    const projects = data.projects ? JSON.parse(data.projects) : [];
    projectCount = projects.length || 0;
    documentCount = projects.reduce((sum: number, p: any) => sum + (p.documents?.length || 0), 0);
  } catch {
    // Ignore parse errors
  }

  try {
    const users = data.users ? JSON.parse(data.users) : [];
    userCount = users.length || 0;
  } catch {
    // Ignore parse errors
  }

  const checksum = await calculateDataChecksum(data);

  const snapshot: DataSnapshot = {
    version: CURRENT_DATA_VERSION,
    timestamp: new Date().toISOString(),
    data,
    checksum,
    metadata: {
      projectCount,
      userCount,
      documentCount,
    },
  };

  localStorage.setItem(ROLLBACK_SNAPSHOT_KEY, JSON.stringify(snapshot));

  return snapshot;
}

export async function performDataMigration(toVersion: string): Promise<MigrationResult> {
  try {
    const snapshot = await createPreUpdateSnapshot();

    const migrationRecord: MigrationRecord = {
      id: generateId(),
      fromVersion: getDataVersion(),
      toVersion: toVersion,
      timestamp: new Date().toISOString(),
      checksum: snapshot.checksum,
      status: 'success',
      description: `迁移到版本 ${toVersion}`,
    };

    const history = getMigrationHistory();
    history.unshift(migrationRecord);
    localStorage.setItem(MIGRATION_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));

    setDataVersion(toVersion);

    return {
      success: true,
      message: `数据迁移成功，已从 v${migrationRecord.fromVersion} 迁移到 v${toVersion}`,
      checksum: snapshot.checksum,
    };
  } catch (error) {
    return {
      success: false,
      message: '数据迁移失败',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

export function getMigrationHistory(): MigrationRecord[] {
  try {
    const history = localStorage.getItem(MIGRATION_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

export function getRollbackSnapshot(): DataSnapshot | null {
  try {
    const snapshot = localStorage.getItem(ROLLBACK_SNAPSHOT_KEY);
    return snapshot ? JSON.parse(snapshot) : null;
  } catch {
    return null;
  }
}

export async function verifyDataIntegrity(snapshot: DataSnapshot): Promise<boolean> {
  const currentData = {
    projects: localStorage.getItem('projects'),
    users: localStorage.getItem('users'),
    tasks: localStorage.getItem('tasks'),
    borrowRecords: localStorage.getItem('borrow_records'),
    auditLogs: localStorage.getItem('audit_logs'),
    backupRecords: localStorage.getItem('backup_records'),
    searchHistory: localStorage.getItem('search_history'),
  };

  const currentChecksum = await calculateDataChecksum(currentData);
  return currentChecksum === snapshot.checksum;
}

export function rollbackData(): MigrationResult {
  try {
    const snapshot = getRollbackSnapshot();
    if (!snapshot) {
      return {
        success: false,
        message: '没有可用的回滚快照',
      };
    }

    Object.entries(snapshot.data).forEach(([key, value]) => {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    });

    if (snapshot.version) {
      setDataVersion(snapshot.version);
    }

    const migrationRecord: MigrationRecord = {
      id: generateId(),
      fromVersion: getDataVersion(),
      toVersion: 'rolled_back',
      timestamp: new Date().toISOString(),
      checksum: snapshot.checksum,
      status: 'rolled_back',
      description: '数据回滚',
    };

    const history = getMigrationHistory();
    history.unshift(migrationRecord);
    localStorage.setItem(MIGRATION_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));

    localStorage.removeItem(ROLLBACK_SNAPSHOT_KEY);

    return {
      success: true,
      message: `数据已回滚到更新前状态（v${snapshot.version}）`,
    };
  } catch (error) {
    return {
      success: false,
      message: '回滚失败',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

export async function validateImportData(jsonStr: string): Promise<{ valid: boolean; error?: string; data?: any }> {
  try {
    const data = JSON.parse(jsonStr);

    if (!data.projects && !data.users) {
      return { valid: false, error: '无效的数据格式：缺少必要的字段' };
    }

    if (data.projects) {
      try {
        const projects = typeof data.projects === 'string' ? JSON.parse(data.projects) : data.projects;
        if (!Array.isArray(projects)) {
          return { valid: false, error: '项目数据格式无效' };
        }
      } catch {
        return { valid: false, error: '项目数据解析失败' };
      }
    }

    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: 'JSON解析失败' };
  }
}

export function clearRollbackSnapshot(): void {
  localStorage.removeItem(ROLLBACK_SNAPSHOT_KEY);
}

export function getDataStats(): { projectCount: number; userCount: number; documentCount: number; backupCount: number } {
  let projectCount = 0;
  let documentCount = 0;
  let userCount = 0;
  let backupCount = 0;

  try {
    const projects = localStorage.getItem('projects');
    if (projects) {
      const parsed = JSON.parse(projects);
      projectCount = parsed.length || 0;
      documentCount = parsed.reduce((sum: number, p: any) => sum + (p.documents?.length || 0), 0);
    }
  } catch {
    // Ignore parse errors
  }

  try {
    const users = localStorage.getItem('users');
    if (users) {
      const parsed = JSON.parse(users);
      userCount = parsed.length || 0;
    }
  } catch {
    // Ignore parse errors
  }

  try {
    const backups = localStorage.getItem('backup_records');
    if (backups) {
      const parsed = JSON.parse(backups);
      backupCount = parsed.length || 0;
    }
  } catch {
    // Ignore parse errors
  }

  return { projectCount, userCount, documentCount, backupCount };
}
