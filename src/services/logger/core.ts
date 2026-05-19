import type {
  HierarchicalLogEntry,
  LogFilter,
  LogListener,
  LoggerConfig,
  LogStatistics,
  LogLayer,
  LogLevel,
} from './types';
import { safeSetObject, safeGetObject } from '../storageManager';

const DEFAULT_CONFIG: LoggerConfig = {
  maxLogsPerLayer: 500,
  enableConsoleOutput: true,
  enablePersistence: true,
  flushIntervalMs: 10000,
  bufferSize: 30,
};

const STORAGE_KEYS = {
  COMPONENT: 'hierarchical_log_component',
  MODULE: 'hierarchical_log_module',
  SYSTEM: 'hierarchical_log_system',
} as const;

class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(entry: T): boolean {
    if (this.count === this.capacity) {
      this.buffer[this.tail] = entry;
      this.tail = (this.tail + 1) % this.capacity;
      this.head = (this.head + 1) % this.capacity;
      return true;
    } else {
      this.buffer[this.head] = entry;
      this.head = (this.head + 1) % this.capacity;
      this.count++;
      return this.count >= this.capacity;
    }
  }

  getAll(): T[] {
    const result: T[] = [];
    let current = this.tail;
    for (let i = 0; i < this.count; i++) {
      if (this.buffer[current] !== undefined) {
        result.push(this.buffer[current] as T);
      }
      current = (current + 1) % this.capacity;
    }
    return result.reverse();
  }

  get size(): number {
    return this.count;
  }

  get isFull(): boolean {
    return this.count === this.capacity;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
}

class LogBuffer<T extends HierarchicalLogEntry> {
  private buffer: RingBuffer<T>;
  private flushed = false;

  constructor(maxSize: number) {
    this.buffer = new RingBuffer(maxSize);
  }

  push(entry: T): boolean {
    return this.buffer.push(entry);
  }

  flush(): T[] {
    const entries = this.buffer.getAll();
    this.buffer.clear();
    this.flushed = true;
    return entries;
  }

  get size(): number {
    return this.buffer.size;
  }

  get isFlushed(): boolean {
    return this.flushed;
  }
}

class LogStore<T extends HierarchicalLogEntry> {
  private ringBuffer: RingBuffer<T>;
  private readonly maxEntries: number;
  private readonly storageKey: string;
  private listeners: Set<LogListener<T>> = new Set();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private isDirty = false;
  private readonly SAVE_DELAY_MS = 2000;
  private memoryUsageBytes: number = 0;

  constructor(maxEntries: number, storageKey: string) {
    this.maxEntries = maxEntries;
    this.storageKey = storageKey;
    this.ringBuffer = new RingBuffer(maxEntries);
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = safeGetObject<T[]>(this.storageKey);
      if (stored && Array.isArray(stored)) {
        for (const entry of stored.slice(0, this.maxEntries)) {
          this.ringBuffer.push(entry);
        }
        this.updateMemoryUsage();
      }
    } catch (e) {
      console.error('Failed to load logs from storage:', e);
    }
  }

  private updateMemoryUsage(): void {
    try {
      const entries = this.ringBuffer.getAll();
      this.memoryUsageBytes = new TextEncoder().encode(JSON.stringify(entries)).length;
    } catch {
      this.memoryUsageBytes = 0;
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.isDirty = true;
    this.saveTimer = setTimeout(() => {
      this.saveToStorage();
      this.saveTimer = null;
    }, this.SAVE_DELAY_MS);
  }

  private saveToStorage(): void {
    if (!this.isDirty) return;
    try {
      const entries = this.ringBuffer.getAll();
      safeSetObject(this.storageKey, entries);
      this.isDirty = false;
    } catch (e) {
      console.error('Failed to save logs to storage:', e);
    }
  }

  add(entry: T): void {
    this.ringBuffer.push(entry);
    this.scheduleSave();
    this.notifyListeners(entry);
    this.updateMemoryUsage();
  }

  addBatch(entries: T[]): void {
    for (const entry of entries) {
      this.ringBuffer.push(entry);
    }
    this.scheduleSave();
    entries.forEach(entry => this.notifyListeners(entry));
    this.updateMemoryUsage();
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveToStorage();
  }

  getAll(): T[] {
    return this.ringBuffer.getAll();
  }

  getFiltered(filter: LogFilter): T[] {
    let result = this.ringBuffer.getAll();

    if (filter.startDate) {
      result = result.filter(e => e.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      result = result.filter(e => e.timestamp <= filter.endDate!);
    }
    if (filter.level && filter.level !== 'ALL') {
      result = result.filter(e => e.level === filter.level);
    }
    if (filter.userId) {
      result = result.filter(e => e.user.id === filter.userId);
    }
    if (filter.reason) {
      const term = filter.reason.toLowerCase();
      result = result.filter(e => {
        const entry = e as { reason?: string };
        return entry.reason?.toLowerCase().includes(term);
      });
    }
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      result = result.filter(e => JSON.stringify(e).toLowerCase().includes(term));
    }

    if (filter.offset) {
      result = result.slice(filter.offset);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  clear(): void {
    this.ringBuffer.clear();
    this.listeners.clear();
    this.memoryUsageBytes = 0;
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.error('Failed to clear log storage:', e);
    }
  }

  get count(): number {
    return this.ringBuffer.size;
  }

  get memoryUsage(): number {
    return this.memoryUsageBytes;
  }

  addListener(listener: LogListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(entry: T): void {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (e) {
        console.error('Error in log listener:', e);
      }
    });
  }
}

export class HierarchicalLogger {
  private config: LoggerConfig;
  private componentStore: LogStore<HierarchicalLogEntry & { layer: 'COMPONENT' }>;
  private moduleStore: LogStore<HierarchicalLogEntry & { layer: 'MODULE' }>;
  private systemStore: LogStore<HierarchicalLogEntry & { layer: 'SYSTEM' }>;
  private componentBuffer: LogBuffer<HierarchicalLogEntry & { layer: 'COMPONENT' }>;
  private moduleBuffer: LogBuffer<HierarchicalLogEntry & { layer: 'MODULE' }>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private globalListeners: Set<LogListener<HierarchicalLogEntry>> = new Set();
  private static instance: HierarchicalLogger | null = null;
  private memoryMonitorInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MEMORY_CHECK_INTERVAL = 30000;
  private readonly MAX_MEMORY_MB = 10;

  private constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.componentStore = new LogStore(
      this.config.maxLogsPerLayer,
      STORAGE_KEYS.COMPONENT
    );
    this.moduleStore = new LogStore(
      this.config.maxLogsPerLayer,
      STORAGE_KEYS.MODULE
    );
    this.systemStore = new LogStore(
      this.config.maxLogsPerLayer,
      STORAGE_KEYS.SYSTEM
    );

    this.componentBuffer = new LogBuffer(this.config.bufferSize);
    this.moduleBuffer = new LogBuffer(this.config.bufferSize);

    this.startFlushInterval();
    this.startMemoryMonitor();
  }

  private logError(message: string, error?: unknown): void {
    console.error(message, error);
  }

  static getInstance(config?: Partial<LoggerConfig>): HierarchicalLogger {
    if (!HierarchicalLogger.instance) {
      HierarchicalLogger.instance = new HierarchicalLogger(config);
    }
    return HierarchicalLogger.instance;
  }

  static resetInstance(): void {
    if (HierarchicalLogger.instance) {
      HierarchicalLogger.instance.destroy();
      HierarchicalLogger.instance = null;
    }
  }

  private outputToConsole(entry: HierarchicalLogEntry): void {
    if (!this.config.enableConsoleOutput) return;

    const styleMap: Record<LogLevel, string> = {
      INFO: 'color: #2196F3; font-weight: bold;',
      WARN: 'color: #FF9800; font-weight: bold;',
      ERROR: 'color: #F44336; font-weight: bold;',
      CRITICAL: 'color: #9C27B0; font-weight: bold; background: #FFF3E0;',
    };

    const layerEmoji: Record<LogLayer, string> = {
      COMPONENT: '🧩',
      MODULE: '📦',
      SYSTEM: '🖥️',
    };

    const prefix = `%c[${layerEmoji[entry.layer]}${entry.layer}] [${entry.level}]`;
    console.log(prefix, styleMap[entry.level], entry);
  }

  private notifyGlobalListeners(entry: HierarchicalLogEntry): void {
    this.globalListeners.forEach(listener => {
      try {
        listener(entry);
      } catch (e) {
        this.logError('Error in global log listener:', e);
      }
    });
  }

  addComponentLog(entry: HierarchicalLogEntry & { layer: 'COMPONENT' }): void {
    this.outputToConsole(entry);
    this.notifyGlobalListeners(entry);

    if (this.componentBuffer.push(entry)) {
      this.flushComponentBuffer();
    }
  }

  addModuleLog(entry: HierarchicalLogEntry & { layer: 'MODULE' }): void {
    this.outputToConsole(entry);
    this.notifyGlobalListeners(entry);

    if (this.moduleBuffer.push(entry)) {
      this.flushModuleBuffer();
    }
  }

  addSystemLog(entry: HierarchicalLogEntry & { layer: 'SYSTEM' }): void {
    this.outputToConsole(entry);
    this.notifyGlobalListeners(entry);

    this.systemStore.add(entry);
  }

  private flushComponentBuffer(): void {
    const entries = this.componentBuffer.flush();
    if (entries.length > 0) {
      this.componentStore.addBatch(entries);
    }
  }

  private flushModuleBuffer(): void {
    const entries = this.moduleBuffer.flush();
    if (entries.length > 0) {
      this.moduleStore.addBatch(entries);
    }
  }

  private startFlushInterval(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.flushTimer = setInterval(() => {
      if (this.componentBuffer.size > 0) {
        this.flushComponentBuffer();
      }
      if (this.moduleBuffer.size > 0) {
        this.flushModuleBuffer();
      }
    }, this.config.flushIntervalMs);
  }

  private stopFlushInterval(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private startMemoryMonitor(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    this.memoryMonitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.MEMORY_CHECK_INTERVAL);
  }

  private stopMemoryMonitor(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
  }

  private checkMemoryUsage(): void {
    const totalMemoryMB = (
      this.componentStore.memoryUsage +
      this.moduleStore.memoryUsage +
      this.systemStore.memoryUsage
    ) / (1024 * 1024);

    if (totalMemoryMB > this.MAX_MEMORY_MB) {
      console.warn(`[Memory Monitor] Logger memory usage high: ${totalMemoryMB.toFixed(2)}MB`);
      
      if (totalMemoryMB > this.MAX_MEMORY_MB * 1.5) {
        console.warn('[Memory Monitor] Force trimming logs...');
        this.trimOldLogs(0.5);
      }
    }
  }

  trimOldLogs(ratio: number = 0.3): void {
    const currentComponentLogs = this.componentStore.getAll();
    const currentModuleLogs = this.moduleStore.getAll();
    const currentSystemLogs = this.systemStore.getAll();

    const keepCount = Math.floor(currentComponentLogs.length * (1 - ratio));

    if (keepCount < currentComponentLogs.length) {
      this.componentStore.clear();
      this.componentStore.addBatch(currentComponentLogs.slice(0, keepCount));
    }

    if (keepCount < currentModuleLogs.length) {
      this.moduleStore.clear();
      this.moduleStore.addBatch(currentModuleLogs.slice(0, keepCount));
    }

    if (keepCount < currentSystemLogs.length) {
      this.systemStore.clear();
      this.systemStore.addBatch(currentSystemLogs.slice(0, keepCount));
    }
  }

  getComponentLogs(filter?: LogFilter): HierarchicalLogEntry[] {
    if (filter) return this.componentStore.getFiltered(filter);
    return this.componentStore.getAll();
  }

  getModuleLogs(filter?: LogFilter): HierarchicalLogEntry[] {
    if (filter) return this.moduleStore.getFiltered(filter);
    return this.moduleStore.getAll();
  }

  getSystemLogs(filter?: LogFilter): HierarchicalLogEntry[] {
    if (filter) return this.systemStore.getFiltered(filter);
    return this.systemStore.getAll();
  }

  getAllLogs(filter?: LogFilter): HierarchicalLogEntry[] {
    const allLogs = [
      ...this.componentStore.getAll(),
      ...this.moduleStore.getAll(),
      ...this.systemStore.getAll(),
    ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (!filter) return allLogs;

    let result = allLogs;

    if (filter.layer && filter.layer !== 'ALL') {
      result = result.filter(e => e.layer === filter.layer);
    }
    if (filter.startDate) {
      result = result.filter(e => e.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      result = result.filter(e => e.timestamp <= filter.endDate!);
    }
    if (filter.level && filter.level !== 'ALL') {
      result = result.filter(e => e.level === filter.level);
    }
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      result = result.filter(e => JSON.stringify(e).toLowerCase().includes(term));
    }
    if (filter.userId) {
      result = result.filter(e => e.user.id === filter.userId);
    }

    if (filter.offset) {
      result = result.slice(filter.offset);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  getStatistics(): LogStatistics {
    const componentLogs = this.componentStore.getAll();
    const moduleLogs = this.moduleStore.getAll();
    const systemLogs = this.systemStore.getAll();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const byLevel: Record<LogLevel, number> = {
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      CRITICAL: 0,
    };

    const byComponentChangeType: Record<string, number> = {};
    const byModuleChangeType: Record<string, number> = {};
    const bySystemEventType: Record<string, number> = {};

    [...componentLogs, ...moduleLogs, ...systemLogs].forEach(log => {
      byLevel[log.level]++;
    });

    componentLogs.forEach(log => {
      const key = (log as { changeType?: string }).changeType || 'UNKNOWN';
      byComponentChangeType[key] = (byComponentChangeType[key] || 0) + 1;
    });

    moduleLogs.forEach(log => {
      const key = (log as { changeType?: string }).changeType || 'UNKNOWN';
      byModuleChangeType[key] = (byModuleChangeType[key] || 0) + 1;
    });

    systemLogs.forEach(log => {
      const key = (log as { eventType?: string }).eventType || 'UNKNOWN';
      bySystemEventType[key] = (bySystemEventType[key] || 0) + 1;
    });

    return {
      totalLogs: componentLogs.length + moduleLogs.length + systemLogs.length,
      byLayer: {
        COMPONENT: componentLogs.length,
        MODULE: moduleLogs.length,
        SYSTEM: systemLogs.length,
      },
      byLevel,
      byComponentChangeType: byComponentChangeType as Record<string, number>,
      byModuleChangeType: byModuleChangeType as Record<string, number>,
      bySystemEventType: bySystemEventType as Record<string, number>,
      recentCount: [...componentLogs, ...moduleLogs, ...systemLogs].filter(
        l => l.timestamp >= oneDayAgo
      ).length,
      errorCount: byLevel.ERROR + byLevel.CRITICAL,
      criticalCount: byLevel.CRITICAL,
    };
  }

  getMemoryUsage(): { totalMB: number; componentMB: number; moduleMB: number; systemMB: number } {
    const componentMB = this.componentStore.memoryUsage / (1024 * 1024);
    const moduleMB = this.moduleStore.memoryUsage / (1024 * 1024);
    const systemMB = this.systemStore.memoryUsage / (1024 * 1024);

    return {
      totalMB: componentMB + moduleMB + systemMB,
      componentMB,
      moduleMB,
      systemMB,
    };
  }

  addGlobalListener(listener: LogListener<HierarchicalLogEntry>): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  clearAllLogs(): void {
    this.componentStore.clear();
    this.moduleStore.clear();
    this.systemStore.clear();
  }

  clearLayerLogs(layer: LogLayer): void {
    switch (layer) {
      case 'COMPONENT':
        this.componentStore.clear();
        break;
      case 'MODULE':
        this.moduleStore.clear();
        break;
      case 'SYSTEM':
        this.systemStore.clear();
        break;
    }
  }

  exportLogs(layer?: LogLayer): string {
    const data = layer
      ? this.getAllLogs({ layer })
      : this.getAllLogs();
    return JSON.stringify(data, null, 2);
  }

  destroy(): void {
    this.stopFlushInterval();
    this.stopMemoryMonitor();
    this.flushComponentBuffer();
    this.flushModuleBuffer();
    this.globalListeners.clear();
    this.componentStore.flush();
    this.moduleStore.flush();
    this.systemStore.flush();
    this.componentStore.clear();
    this.moduleStore.clear();
    this.systemStore.clear();
  }
}

let loggerInstance: HierarchicalLogger | null = null;
let cleanupHandler: (() => void) | null = null;

export function getLogger(config?: Partial<LoggerConfig>): HierarchicalLogger {
  if (!loggerInstance) {
    loggerInstance = HierarchicalLogger.getInstance(config);
    
    if (typeof window !== 'undefined' && !cleanupHandler) {
      const handleBeforeUnload = () => {
        if (loggerInstance) {
          loggerInstance.destroy();
          loggerInstance = null;
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      cleanupHandler = () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }
  return loggerInstance;
}

export function resetLogger(): void {
  if (loggerInstance) {
    loggerInstance.destroy();
    loggerInstance = null;
  }
  
  if (cleanupHandler) {
    cleanupHandler();
    cleanupHandler = null;
  }
}
