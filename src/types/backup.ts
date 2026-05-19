export interface BackupRecord {
  id: string;
  name: string;
  timestamp: string;
  size: number;
  fileUrl?: string;
  description?: string;
}

export interface BackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastBackupTime?: string;
}
