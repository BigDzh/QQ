const IS_DEV = import.meta.env.DEV;

import { formatMemorySize } from './formatters';

export const devLogger = {
  log: (...args: unknown[]) => {
    if (IS_DEV) {
      console.log('[DEV]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (IS_DEV) {
      console.info('[DEV]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (IS_DEV) {
      console.warn('[DEV]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (IS_DEV) {
      console.error('[DEV]', ...args);
    }
  },
  group: (label: string) => {
    if (IS_DEV) {
      console.group(label);
    }
  },
  groupEnd: () => {
    if (IS_DEV) {
      console.groupEnd();
    }
  },
  time: (label: string) => {
    if (IS_DEV) {
      console.time(label);
    }
  },
  timeEnd: (label: string) => {
    if (IS_DEV) {
      console.timeEnd(label);
    }
  },
  table: (data: unknown) => {
    if (IS_DEV) {
      console.table(data);
    }
  },
};

export { formatMemorySize };

export function logMemoryUsage(label: string): void {
  if (!IS_DEV) return;

  const perf = window.performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  };

  if (perf.memory) {
    devLogger.log(
      `[Memory] ${label}: ${formatMemorySize(perf.memory.usedJSHeapSize)} / ${formatMemorySize(perf.memory.jsHeapSizeLimit)}`
    );
  }
}

export function createMemoTracker<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const duration = performance.now() - start;

    if (duration > 16) {
      devLogger.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }) as T;
}
