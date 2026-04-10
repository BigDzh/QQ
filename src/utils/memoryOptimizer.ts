import { LRUCache, SimpleDebouncer } from './memoryUtils';

export interface MemoryOptimizationConfig {
  maxCacheSize: number;
  debounceDelay: number;
  cleanupThreshold: number;
}

const DEFAULT_CONFIG: MemoryOptimizationConfig = {
  maxCacheSize: 100,
  debounceDelay: 300,
  cleanupThreshold: 0.8,
};

export class MemoryOptimizer {
  private caches: Map<string, LRUCache<any, any>> = new Map();
  private debouncers: Map<string, SimpleDebouncer> = new Map();
  private config: MemoryOptimizationConfig;
  private cleanupCallbacks: Set<() => void> = new Set();
  private isLowMemoryMode: boolean = false;

  constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getOrCreateCache<T, V>(name: string, maxSize?: number): LRUCache<T, V> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new LRUCache(maxSize || this.config.maxCacheSize));
    }
    return this.caches.get(name) as LRUCache<T, V>;
  }

  getOrCreateDebouncer(name: string): SimpleDebouncer {
    if (!this.debouncers.has(name)) {
      this.debouncers.set(name, new SimpleDebouncer());
    }
    return this.debouncers.get(name)!;
  }

  registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  unregisterCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.delete(callback);
  }

  performCleanup(): void {
    logger.log('[MemoryOptimizer] Performing cleanup...');
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error('[MemoryOptimizer] Cleanup callback error:', error);
      }
    });
    this.caches.forEach(cache => cache.clear());
    logger.log('[MemoryOptimizer] Cleanup completed');
  }

  clearAllCaches(): void {
    this.caches.forEach(cache => cache.clear());
    logger.log('[MemoryOptimizer] All caches cleared');
  }

  getCacheStats(): { name: string; size: number }[] {
    return Array.from(this.caches.entries()).map(([name, cache]) => ({
      name,
      size: cache.size,
    }));
  }

  setLowMemoryMode(enabled: boolean): void {
    this.isLowMemoryMode = enabled;
    if (enabled) {
      logger.log('[MemoryOptimizer] Low memory mode enabled, reducing cache sizes...');
      this.caches.forEach((cache, name) => {
        const newCache = new LRUCache(Math.floor(this.config.maxCacheSize * 0.3));
        const items = cache.getAll();
        items.slice(0, Math.floor(items.length * 0.3)).forEach(item => {
          const keys = cache.getKeys();
          if (keys.length > 0) {
            const key = keys[0];
            newCache.set(key as any, item);
          }
        });
        this.caches.set(name, newCache);
      });
    } else {
      logger.log('[MemoryOptimizer] Low memory mode disabled, restoring cache sizes...');
    }
  }

  get isLowMemory(): boolean {
    return this.isLowMemoryMode;
  }
}

export const memoryOptimizer = new MemoryOptimizer();

export function checkMemoryPressure(): { level: 'normal' | 'warning' | 'critical'; usedPercent: number } {
  const perf = window.performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };

  if (!perf?.memory) {
    return { level: 'normal', usedPercent: 0 };
  }

  const usedPercent = perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit;

  if (usedPercent >= 0.9) {
    return { level: 'critical', usedPercent };
  }
  if (usedPercent >= 0.8) {
    return { level: 'warning', usedPercent };
  }
  return { level: 'normal', usedPercent };
}

export function forceGarbageCollection(): void {
  if (window.gc) {
    window.gc();
    logger.log('[MemoryOptimizer] GC forced');
  } else {
    logger.warn('[MemoryOptimizer] GC not available (requires --expose-gc flag)');
  }
}

export function getMemoryInfo(): { used: number; total: number; limit: number; percent: number } | null {
  const perf = window.performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  };

  if (!perf?.memory) {
    return null;
  }

  return {
    used: perf.memory.usedJSHeapSize,
    total: perf.memory.totalJSHeapSize,
    limit: perf.memory.jsHeapSizeLimit,
    percent: perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit,
  };
}

export function formatMemorySize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
