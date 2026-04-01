import { useEffect, useState, useCallback, useRef } from 'react';
import {
  shouldRemindBackup,
  recordBackupReminder,
  getTimeSinceLastBackup,
  performBackup,
} from '../services/backupService';

interface UseBackupReminderOptions {
  checkInterval?: number;
  onRemind?: () => void;
  enabled?: boolean;
}

export interface BackupReminderState {
  shouldRemind: boolean;
  timeSinceLastBackup: string;
  isChecking: boolean;
  lastCheckTime: Date | null;
}

export function useBackupReminder(options: UseBackupReminderOptions = {}) {
  const {
    checkInterval = 60000,
    onRemind,
    enabled = true,
  } = options;

  const [state, setState] = useState<BackupReminderState>({
    shouldRemind: false,
    timeSinceLastBackup: '从未备份',
    isChecking: false,
    lastCheckTime: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRemindedRef = useRef(false);

  const checkBackupReminder = useCallback(() => {
    if (!enabled) return;

    setState((prev) => ({ ...prev, isChecking: true }));

    const shouldRemind = shouldRemindBackup();
    const timeSinceLastBackup = getTimeSinceLastBackup();

    setState({
      shouldRemind,
      timeSinceLastBackup,
      isChecking: false,
      lastCheckTime: new Date(),
    });

    if (shouldRemind && !hasRemindedRef.current) {
      hasRemindedRef.current = true;
      onRemind?.();
    }
  }, [enabled, onRemind]);

  const dismissReminder = useCallback(() => {
    recordBackupReminder();
    hasRemindedRef.current = true;
    setState((prev) => ({
      ...prev,
      shouldRemind: false,
    }));
  }, []);

  const triggerBackup = useCallback(async () => {
    try {
      await performBackup();
      hasRemindedRef.current = true;
      setState((prev) => ({
        ...prev,
        shouldRemind: false,
        timeSinceLastBackup: '刚刚',
      }));
      return true;
    } catch (error) {
      console.error('Backup failed:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    checkBackupReminder();

    intervalRef.current = setInterval(checkBackupReminder, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkInterval, checkBackupReminder]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        checkBackupReminder();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, checkBackupReminder]);

  return {
    ...state,
    checkBackupReminder,
    dismissReminder,
    triggerBackup,
  };
}

export default useBackupReminder;