import { useEffect, useRef, useCallback, useState } from 'react';
import { memoryOptimizer, checkMemoryPressure, type MemoryOptimizationConfig } from '../utils/memoryOptimizer';

interface UseMemoryOptimizerOptions {
  autoCleanup?: boolean;
  cleanupThreshold?: number;
  onMemoryWarning?: (usedPercent: number) => void;
  onMemoryCritical?: (usedPercent: number) => void;
}

export function useMemoryOptimizer(options: UseMemoryOptimizerOptions = {}) {
  const {
    autoCleanup = true,
    cleanupThreshold = 0.85,
    onMemoryWarning,
    onMemoryCritical,
  } = options;

  const [memoryLevel, setMemoryLevel] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [usedPercent, setUsedPercent] = useState(0);
  const lastCheckTimeRef = useRef<number>(0);
  const CHECK_INTERVAL = 10000;

  const checkMemory = useCallback(() => {
    const now = Date.now();
    if (now - lastCheckTimeRef.current < CHECK_INTERVAL) {
      return;
    }
    lastCheckTimeRef.current = now;

    const { level, usedPercent: percent } = checkMemoryPressure();
    setMemoryLevel(level);
    setUsedPercent(Math.round(percent * 100));

    if (level === 'critical' && onMemoryCritical) {
      onMemoryCritical(percent);
    } else if (level === 'warning' && onMemoryWarning) {
      onMemoryWarning(percent);
    }

    if (autoCleanup && percent >= cleanupThreshold) {
      logger.log(`[useMemoryOptimizer] Memory pressure detected (${Math.round(percent * 100)}%), triggering cleanup...`);
      memoryOptimizer.performCleanup();
    }
  }, [autoCleanup, cleanupThreshold, onMemoryWarning, onMemoryCritical]);

  useEffect(() => {
    checkMemory();
    const interval = setInterval(checkMemory, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkMemory]);

  const forceCleanup = useCallback(() => {
    memoryOptimizer.performCleanup();
  }, []);

  const clearCache = useCallback((cacheName?: string) => {
    if (cacheName) {
      const cache = memoryOptimizer.getOrCreateCache(cacheName);
      cache.clear();
    } else {
      memoryOptimizer.clearAllCaches();
    }
  }, []);

  return {
    memoryLevel,
    usedPercent,
    forceCleanup,
    clearCache,
    optimizer: memoryOptimizer,
  };
}

export function useLowMemoryMode(): boolean {
  const { memoryLevel } = useMemoryOptimizer();
  return memoryLevel !== 'normal';
}

export function useCriticalMemoryMode(): boolean {
  const { memoryLevel } = useMemoryOptimizer();
  return memoryLevel === 'critical';
}
