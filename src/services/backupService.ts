import { getBackupSettings, saveBackupSettings, createBackup, exportData } from './backup';

const LAST_BACKUP_REMINDER_KEY = 'last_backup_reminder';

export function shouldRemindBackup(): boolean {
  const settings = getBackupSettings();
  if (!settings.enabled) return false;

  const lastReminder = localStorage.getItem(LAST_BACKUP_REMINDER_KEY);
  if (!lastReminder) return true;

  const lastDate = new Date(lastReminder);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  switch (settings.frequency) {
    case 'daily':
      return diffDays >= 1;
    case 'weekly':
      return diffDays >= 7;
    case 'monthly':
      return diffDays >= 30;
    default:
      return false;
  }
}

export function recordBackupReminder(): void {
  localStorage.setItem(LAST_BACKUP_REMINDER_KEY, new Date().toISOString());
}

export function getTimeSinceLastBackup(): string {
  const settings = getBackupSettings();
  if (!settings.lastBackupTime) return '从未备份';

  const lastDate = new Date(settings.lastBackupTime);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays}天`;
  if (diffHours > 0) return `${diffHours}小时`;
  if (diffMinutes > 0) return `${diffMinutes}分钟`;
  return '刚刚';
}

export async function performBackup(name?: string): Promise<void> {
  const data = exportData();
  const parsed = JSON.parse(data);
  const backupName = name || `备份_${new Date().toLocaleDateString()}`;
  createBackup(backupName, parsed);

  const settings = getBackupSettings();
  settings.lastBackupTime = new Date().toISOString();
  saveBackupSettings(settings);

  recordBackupReminder();
}
