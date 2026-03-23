import type { BackupRecord, BackupSettings } from '../types/backup';
import { generateId } from '../utils/auth';
import { safeSetObject, safeGetObject } from './storageManager';

const BACKUP_RECORDS_KEY = 'backup_records';
const BACKUP_SETTINGS_KEY = 'backup_settings';
const MAX_BACKUP_RECORDS = 50;

export function getBackupRecords(): BackupRecord[] {
  return safeGetObject<BackupRecord[]>(BACKUP_RECORDS_KEY) || [];
}

export function saveBackupRecords(records: BackupRecord[]): void {
  const trimmed = records.slice(0, MAX_BACKUP_RECORDS);
  safeSetObject(BACKUP_RECORDS_KEY, trimmed);
}

export function createBackup(name: string, data: object): BackupRecord {
  const jsonStr = JSON.stringify(data);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const record: BackupRecord = {
    id: generateId(),
    name,
    timestamp: new Date().toISOString(),
    size: blob.size,
    fileUrl: url,
  };

  const records = getBackupRecords();
  records.unshift(record);
  saveBackupRecords(records);
  return record;
}

export function deleteBackup(id: string): void {
  const records = getBackupRecords();
  const filtered = records.filter((r) => r.id !== id);
  saveBackupRecords(filtered);
}

export function getBackupSettings(): BackupSettings {
  return safeGetObject<BackupSettings>(BACKUP_SETTINGS_KEY) || { enabled: false, frequency: 'weekly' };
}

export function saveBackupSettings(settings: BackupSettings): void {
  safeSetObject(BACKUP_SETTINGS_KEY, settings);
}

export function exportData(): string {
  const data = {
    projects: JSON.parse(localStorage.getItem('projects') || 'null'),
    users: JSON.parse(localStorage.getItem('users') || 'null'),
    tasks: JSON.parse(localStorage.getItem('tasks') || 'null'),
    borrowRecords: JSON.parse(localStorage.getItem('borrow_records') || 'null'),
    auditLogs: JSON.parse(localStorage.getItem('audit_logs') || 'null'),
    backupRecords: JSON.parse(localStorage.getItem('backup_records') || 'null'),
    exportTime: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.projects) {
      const parsed = typeof data.projects === 'string' ? JSON.parse(data.projects) : data.projects;
      safeSetObject('projects', parsed);
    }
    if (data.users) {
      const parsed = typeof data.users === 'string' ? JSON.parse(data.users) : data.users;
      safeSetObject('users', parsed);
    }
    if (data.tasks) {
      const parsed = typeof data.tasks === 'string' ? JSON.parse(data.tasks) : data.tasks;
      safeSetObject('tasks', parsed);
    }
    if (data.borrowRecords) {
      const parsed = typeof data.borrowRecords === 'string' ? JSON.parse(data.borrowRecords) : data.borrowRecords;
      safeSetObject('borrow_records', parsed);
    }
    if (data.auditLogs) {
      const parsed = typeof data.auditLogs === 'string' ? JSON.parse(data.auditLogs) : data.auditLogs;
      safeSetObject('audit_logs', parsed);
    }
    if (data.backupRecords) {
      const parsed = typeof data.backupRecords === 'string' ? JSON.parse(data.backupRecords) : data.backupRecords;
      safeSetObject('backup_records', parsed);
    }
    return true;
  } catch {
    return false;
  }
}
