import type { BackupRecord, BackupSettings } from '../types/backup';
import { generateId } from '../utils/auth';

const BACKUP_RECORDS_KEY = 'backup_records';
const BACKUP_SETTINGS_KEY = 'backup_settings';

export function getBackupRecords(): BackupRecord[] {
  const data = localStorage.getItem(BACKUP_RECORDS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveBackupRecords(records: BackupRecord[]): void {
  localStorage.setItem(BACKUP_RECORDS_KEY, JSON.stringify(records));
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
  const data = localStorage.getItem(BACKUP_SETTINGS_KEY);
  return data ? JSON.parse(data) : { enabled: false, frequency: 'weekly' };
}

export function saveBackupSettings(settings: BackupSettings): void {
  localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
}

export function exportData(): string {
  const data = {
    projects: localStorage.getItem('projects'),
    users: localStorage.getItem('users'),
    tasks: localStorage.getItem('tasks'),
    borrowRecords: localStorage.getItem('borrow_records'),
    auditLogs: localStorage.getItem('audit_logs'),
    backupRecords: localStorage.getItem('backup_records'),
    exportTime: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.projects) localStorage.setItem('projects', data.projects);
    if (data.users) localStorage.setItem('users', data.users);
    if (data.tasks) localStorage.setItem('tasks', data.tasks);
    if (data.borrowRecords) localStorage.setItem('borrow_records', data.borrowRecords);
    if (data.auditLogs) localStorage.setItem('audit_logs', data.auditLogs);
    if (data.backupRecords) localStorage.setItem('backup_records', data.backupRecords);
    return true;
  } catch {
    return false;
  }
}
