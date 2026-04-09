export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getAll(): V[] {
    return Array.from(this.cache.values());
  }

  getKeys(): K[] {
    return Array.from(this.cache.keys());
  }
}

export type MemoryStatus = 'normal' | 'warning' | 'critical';

export function checkMemoryThreshold(used: number, limit: number): MemoryStatus {
  const ratio = used / limit;
  if (ratio >= 0.9) return 'critical';
  if (ratio >= 0.8) return 'warning';
  return 'normal';
}

export function is32BitProcess(): boolean {
  try {
    const testBuffer = new ArrayBuffer(1);
    return !(testBuffer instanceof SharedArrayBuffer);
  } catch {
    return false;
  }
}

export function getOptimalCacheSize(baseSize: number): number {
  if (is32BitProcess()) {
    return Math.floor(baseSize * 0.3);
  }
  return baseSize;
}

export class SimpleDebouncer {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  debounce(fn: () => void, delay: number): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      fn();
    }, delay);
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  destroy(): void {
    this.flush();
  }
}
