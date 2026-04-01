import { useState, useCallback, useEffect } from 'react';
import { trashAutoCleanupService, type AutoCleanupConfig, type CleanupResult, type PendingDeletionNotification, type CleanupAuditEntry } from '../services/trashAutoCleanupService';
import { duplicateTaskService } from '../services/duplicateTaskService';
import type { TrashTask } from '../types/duplicateTask';

interface UseTrashAutoCleanupReturn {
  config: AutoCleanupConfig;
  isEnabled: boolean;
  retentionHours: number;
  intervalHours: number;
  lastCleanupTime: string | null;
  nextCleanupTime: string | null;
  isRunning: boolean;
  pendingNotifications: PendingDeletionNotification[];
  auditLog: CleanupAuditEntry[];
  pendingNotificationsCount: number;
  enableCleanup: () => void;
  disableCleanup: () => void;
  updateRetentionHours: (hours: number) => void;
  updateIntervalHours: (hours: number) => void;
  updateConfig: (updates: Partial<AutoCleanupConfig>) => void;
  triggerCleanup: () => Promise<CleanupResult>;
  generateNotifications: () => void;
  clearAuditLog: () => void;
}

export function useTrashAutoCleanup(): UseTrashAutoCleanupReturn {
  const [config, setConfig] = useState<AutoCleanupConfig>(trashAutoCleanupService.getConfig());
  const [lastCleanupTime, setLastCleanupTime] = useState<string | null>(null);
  const [nextCleanupTime, setNextCleanupTime] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<PendingDeletionNotification[]>([]);
  const [auditLog, setAuditLog] = useState<CleanupAuditEntry[]>([]);

  useEffect(() => {
    const unsubscribe = trashAutoCleanupService.subscribe(() => {
      setConfig(trashAutoCleanupService.getConfig());
      const state = trashAutoCleanupService.getCleanupState();
      setLastCleanupTime(state.lastCleanupTime);
      setNextCleanupTime(state.nextCleanupTime);
      setIsRunning(state.isRunning);
      setPendingNotifications(trashAutoCleanupService.getPendingNotifications());
      setAuditLog(trashAutoCleanupService.getAuditLog());
    });

    trashAutoCleanupService.registerCallbacks(
      () => duplicateTaskService.getTrash(),
      (taskId: string) => duplicateTaskService.permanentlyDeleteFromTrash(taskId),
      (taskId: string, status: string) => {
        const trashItem = duplicateTaskService.getTrash().find(t => t.originalTask.id === taskId);
        if (trashItem) {
          duplicateTaskService.permanentlyDeleteByOriginalTaskId(taskId, status);
        }
      }
    );

    const state = trashAutoCleanupService.getCleanupState();
    setLastCleanupTime(state.lastCleanupTime);
    setNextCleanupTime(state.nextCleanupTime);
    setIsRunning(state.isRunning);
    setPendingNotifications(trashAutoCleanupService.getPendingNotifications());
    setAuditLog(trashAutoCleanupService.getAuditLog());

    trashAutoCleanupService.start();

    return unsubscribe;
  }, []);

  const enableCleanup = useCallback(() => {
    trashAutoCleanupService.updateConfig({ enabled: true });
  }, []);

  const disableCleanup = useCallback(() => {
    trashAutoCleanupService.updateConfig({ enabled: false });
  }, []);

  const updateRetentionHours = useCallback((hours: number) => {
    trashAutoCleanupService.updateConfig({ retentionHours: hours });
  }, []);

  const updateIntervalHours = useCallback((hours: number) => {
    trashAutoCleanupService.updateConfig({ intervalHours: hours });
  }, []);

  const updateConfig = useCallback((updates: Partial<AutoCleanupConfig>) => {
    trashAutoCleanupService.updateConfig(updates);
  }, []);

  const triggerCleanup = useCallback(async (): Promise<CleanupResult> => {
    return trashAutoCleanupService.executeAutoCleanup();
  }, []);

  const generateNotifications = useCallback(() => {
    const notifications = trashAutoCleanupService.generatePendingNotifications();
    return notifications;
  }, []);

  const clearAuditLog = useCallback(() => {
    trashAutoCleanupService.clearAuditLog();
  }, []);

  return {
    config,
    isEnabled: config.enabled,
    retentionHours: config.retentionHours,
    intervalHours: config.intervalHours,
    lastCleanupTime,
    nextCleanupTime,
    isRunning,
    pendingNotifications,
    auditLog,
    pendingNotificationsCount: pendingNotifications.length,
    enableCleanup,
    disableCleanup,
    updateRetentionHours,
    updateIntervalHours,
    updateConfig,
    triggerCleanup,
    generateNotifications,
    clearAuditLog,
  };
}
