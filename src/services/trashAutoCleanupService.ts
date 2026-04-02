import type { TrashTask } from '../types/duplicateTask';

export interface AutoCleanupConfig {
  enabled: boolean;
  intervalHours: number;
  retentionHours: number;
  batchSize: number;
  notifyBeforeDeletion: boolean;
  notifyHoursBefore: number;
  enableAuditLog: boolean;
  maxAuditEntries: number;
}

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  errors: string[];
  auditEntries: CleanupAuditEntry[];
}

export interface CleanupAuditEntry {
  id: string;
  timestamp: string;
  taskId: string;
  taskTitle: string;
  deletedAt: string;
  retentionHours: number;
  reason: string;
}

export interface PendingDeletionNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  scheduledDeletionTime: string;
  retentionHours: number;
}

const DEFAULT_CONFIG: AutoCleanupConfig = {
  enabled: true,
  intervalHours: 24,
  retentionHours: 168,
  batchSize: 50,
  notifyBeforeDeletion: true,
  notifyHoursBefore: 24,
  enableAuditLog: true,
  maxAuditEntries: 1000,
};

const CLEANUP_STATE_KEY = 'trash-auto-cleanup-state';
const PENDING_NOTIFICATIONS_KEY = 'trash-pending-notifications';
const CLEANUP_AUDIT_KEY = 'trash-cleanup-audit';

interface CleanupState {
  lastCleanupTime: string | null;
  nextCleanupTime: string | null;
  isRunning: boolean;
  consecutiveFailures: number;
}

export class TrashAutoCleanupService {
  private config: AutoCleanupConfig;
  private listeners: Set<() => void> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isProcessingRef = { value: false };
  private cleanupState: CleanupState = {
    lastCleanupTime: null,
    nextCleanupTime: null,
    isRunning: false,
    consecutiveFailures: 0,
  };
  private callbacks: {
    getTrashItems?: () => TrashTask[];
    onPermanentlyDelete?: (taskId: string) => boolean;
    onUpdateHistory?: (taskId: string, status: string, recoveryAvailable: boolean) => void;
  } = {};

  constructor() {
    this.config = this.loadConfig();
    this.loadState();
    this.loadPendingNotifications();
    this.loadAuditLog();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadConfig(): AutoCleanupConfig {
    try {
      const stored = localStorage.getItem('trash-auto-cleanup-config');
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[TrashAutoCleanup] Failed to load config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('trash-auto-cleanup-config', JSON.stringify(this.config));
    } catch (e) {
      console.warn('[TrashAutoCleanup] Failed to save config:', e);
    }
  }

  private loadState(): void {
    try {
      const stored = localStorage.getItem(CLEANUP_STATE_KEY);
      if (stored) {
        this.cleanupState = { ...this.cleanupState, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[TrashAutoCleanup] Failed to load state:', e);
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(CLEANUP_STATE_KEY, JSON.stringify(this.cleanupState));
    } catch (e) {
      console.warn('[TrashAutoCleanup] Failed to save state:', e);
    }
  }

  private pendingNotifications: PendingDeletionNotification[] = [];
  private auditLog: CleanupAuditEntry[] = [];

  private loadPendingNotifications(): void {
    try {
      const stored = localStorage.getItem(PENDING_NOTIFICATIONS_KEY);
      if (stored) {
        this.pendingNotifications = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[TrashAutoCleanup] Failed to load pending notifications:', e);
    }
  }

  private savePendingNotifications(): void {
    try {
      localStorage.setItem(PENDING_NOTIFICATIONS_KEY, JSON.stringify(this.pendingNotifications));
    } catch (e) {
      console.warn('[TrashAutoCleanup] Failed to save pending notifications:', e);
    }
  }

  private loadAuditLog(): void {
    try {
      const stored = localStorage.getItem(CLEANUP_AUDIT_KEY);
      if (stored) {
        this.auditLog = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[TrashAutoCleanup] Failed to load audit log:', e);
    }
  }

  private saveAuditLog(): void {
    try {
      if (this.auditLog.length > this.config.maxAuditEntries) {
        this.auditLog = this.auditLog.slice(-this.config.maxAuditEntries);
      }
      localStorage.setItem(CLEANUP_AUDIT_KEY, JSON.stringify(this.auditLog));
    } catch (e) {
      console.warn('[TrashAutoCleanup] Failed to save audit log:', e);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  getConfig(): AutoCleanupConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AutoCleanupConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    if (updates.intervalHours !== undefined) {
      this.scheduleNextCleanup();
    }
    this.notify();
  }

  getCleanupState(): CleanupState {
    return { ...this.cleanupState };
  }

  getPendingNotifications(): PendingDeletionNotification[] {
    return [...this.pendingNotifications];
  }

  getAuditLog(): CleanupAuditEntry[] {
    return [...this.auditLog];
  }

  private calculateNextCleanupTime(): Date {
    const now = new Date();
    if (this.cleanupState.lastCleanupTime) {
      const next = new Date(this.cleanupState.lastCleanupTime);
      next.setHours(next.getHours() + this.config.intervalHours);
      if (next > now) {
        return next;
      }
    }
    return new Date(now.getTime() + this.config.intervalHours * 60 * 60 * 1000);
  }

  private scheduleNextCleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (!this.config.enabled) {
      this.cleanupState.nextCleanupTime = null;
      this.saveState();
      return;
    }

    const nextTime = this.calculateNextCleanupTime();
    this.cleanupState.nextCleanupTime = nextTime.toISOString();
    this.saveState();

    const delay = nextTime.getTime() - Date.now();
    const minDelay = 60000;

    if (delay > minDelay) {
      this.intervalId = setTimeout(() => {
        this.executeAutoCleanup();
      }, delay);
    } else {
      setTimeout(() => {
        this.executeAutoCleanup();
      }, minDelay);
    }
  }

  start(): void {
    if (this.intervalId) return;
    console.log('[TrashAutoCleanup] Service started');
    this.scheduleNextCleanup();
    this.notify();
  }

  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    console.log('[TrashAutoCleanup] Service stopped');
    this.notify();
  }

  setRetentionHours(hours: number): void {
    this.config.retentionHours = hours;
    this.saveConfig();
    this.notify();
  }

  getRetentionHours(): number {
    return this.config.retentionHours;
  }

  registerCallbacks(
    getTrashItems: () => TrashTask[],
    onPermanentlyDelete: (taskId: string) => boolean,
    onUpdateHistory: (taskId: string, status: string, recoveryAvailable: boolean) => void
  ): void {
    this.callbacks = { getTrashItems, onPermanentlyDelete, onUpdateHistory };
  }

  async executeAutoCleanup(): Promise<CleanupResult> {
    if (!this.callbacks.getTrashItems || !this.callbacks.onPermanentlyDelete || !this.callbacks.onUpdateHistory) {
      console.error('[TrashAutoCleanup] Callbacks not registered');
      return {
        success: false,
        deletedCount: 0,
        failedCount: 0,
        errors: ['Callbacks not registered'],
        auditEntries: [],
      };
    }
    if (this.isProcessingRef.value) {
      console.log('[TrashAutoCleanup] Cleanup already in progress, skipping');
      return {
        success: false,
        deletedCount: 0,
        failedCount: 0,
        errors: ['Cleanup already in progress'],
        auditEntries: [],
      };
    }

    this.isProcessingRef.value = true;
    this.cleanupState.isRunning = true;
    this.cleanupState.consecutiveFailures = 0;
    this.saveState();
    this.notify();

    const result: CleanupResult = {
      success: true,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
      auditEntries: [],
    };

    const now = new Date();
    const retentionDeadline = new Date(now.getTime() - this.config.retentionHours * 60 * 60 * 1000);

    try {
      const trashItems = this.callbacks.getTrashItems!();
      const expiredItems = trashItems.filter(
        item => new Date(item.deletedAt) < retentionDeadline
      );

      if (expiredItems.length === 0) {
        console.log('[TrashAutoCleanup] No expired items found');
        this.cleanupState.lastCleanupTime = now.toISOString();
        this.scheduleNextCleanup();
        this.isProcessingRef.value = false;
        this.cleanupState.isRunning = false;
        this.saveState();
        this.notify();
        return result;
      }

      console.log(`[TrashAutoCleanup] Found ${expiredItems.length} expired items`);

      for (const item of expiredItems) {
        try {
          const success = this.callbacks.onPermanentlyDelete!(item.id);

          if (success) {
            result.deletedCount++;

            const auditEntry: CleanupAuditEntry = {
              id: this.generateId(),
              timestamp: now.toISOString(),
              taskId: item.originalTask.id,
              taskTitle: item.originalTask.title,
              deletedAt: item.deletedAt,
              retentionHours: this.config.retentionHours,
              reason: `Auto-cleanup: retained for ${this.config.retentionHours} hours`,
            };
            result.auditEntries.push(auditEntry);
            this.auditLog.push(auditEntry);

            if (this.config.enableAuditLog) {
              this.callbacks.onUpdateHistory!(item.originalTask.id, 'auto_deleted', false);
            }
          } else {
            result.failedCount++;
            result.errors.push(`Failed to delete task ${item.id}: ${item.originalTask.title}`);
          }
        } catch (e) {
          result.failedCount++;
          result.errors.push(`Error deleting task ${item.id}: ${e}`);
        }
      }

      this.cleanupState.lastCleanupTime = now.toISOString();
      this.cleanupState.consecutiveFailures = 0;
      this.saveState();
      this.saveAuditLog();
      this.notify();

      if (this.config.notifyBeforeDeletion && this.pendingNotifications.length > 0) {
        this.pendingNotifications = [];
        this.savePendingNotifications();
      }

    } catch (e) {
      result.success = false;
      result.errors.push(`Cleanup execution error: ${e}`);
      this.cleanupState.consecutiveFailures++;
      console.error('[TrashAutoCleanup] Cleanup failed:', e);
    } finally {
      this.isProcessingRef.value = false;
      this.cleanupState.isRunning = false;
      this.saveState();
      this.scheduleNextCleanup();
      this.notify();
    }

    return result;
  }

  generatePendingNotifications(): PendingDeletionNotification[] {
    if (!this.config.notifyBeforeDeletion) {
      return [];
    }

    const notifications: PendingDeletionNotification[] = [];
    const now = new Date();
    const notifyBeforeMs = this.config.notifyHoursBefore * 60 * 60 * 1000;
    const retentionMs = this.config.retentionHours * 60 * 60 * 1000;
    const thresholdTime = new Date(now.getTime() + notifyBeforeMs);

    const trashItems = this.callbacks.getTrashItems ? this.callbacks.getTrashItems() : [];

    for (const item of trashItems) {
      const deletedAt = new Date(item.deletedAt);
      const scheduledDeletionTime = new Date(deletedAt.getTime() + retentionMs);

      if (scheduledDeletionTime <= thresholdTime) {
        notifications.push({
          id: this.generateId(),
          taskId: item.originalTask.id,
          taskTitle: item.originalTask.title,
          scheduledDeletionTime: scheduledDeletionTime.toISOString(),
          retentionHours: this.config.retentionHours,
        });
      }
    }

    this.pendingNotifications = notifications;
    this.savePendingNotifications();
    this.notify();

    return notifications;
  }

  clearAuditLog(): void {
    this.auditLog = [];
    this.saveAuditLog();
    this.notify();
  }

  getStats(): {
    enabled: boolean;
    retentionHours: number;
    intervalHours: number;
    lastCleanupTime: string | null;
    nextCleanupTime: string | null;
    isRunning: boolean;
    pendingNotificationsCount: number;
    auditLogCount: number;
  } {
    return {
      enabled: this.config.enabled,
      retentionHours: this.config.retentionHours,
      intervalHours: this.config.intervalHours,
      lastCleanupTime: this.cleanupState.lastCleanupTime,
      nextCleanupTime: this.cleanupState.nextCleanupTime,
      isRunning: this.cleanupState.isRunning,
      pendingNotificationsCount: this.pendingNotifications.length,
      auditLogCount: this.auditLog.length,
    };
  }
}

export const trashAutoCleanupService = new TrashAutoCleanupService();
