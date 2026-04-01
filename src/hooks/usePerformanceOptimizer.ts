import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useLowPerformanceMode, useFeature } from '../context/LowPerformanceModeContext';
import {
  type PerformanceMode,
  type ResourceMetrics,
  type ResourceStatus,
  type FeatureToggle,
  shouldSwitchToLowMode,
  shouldSwitchToHighMode,
  calculateResourceScore,
  getResourceScoreLevel,
} from '../types/lowPerformanceMode';

export interface UsePerformanceOptimizerOptions {
  enableAutoRecovery?: boolean;
  onModeSwitch?: (from: PerformanceMode, to: PerformanceMode) => void;
}

export interface UsePerformanceOptimizerReturn {
  mode: PerformanceMode;
  setMode: (mode: PerformanceMode) => void;
  toggleMode: () => void;
  isHighPerformance: boolean;
  isLowPerformance: boolean;

  resourceMetrics: ResourceMetrics | null;
  resourceStatus: ResourceStatus;
  resourceScore: number;
  resourceScoreLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

  isFeatureEnabled: (featureId: string) => boolean;
  enabledFeatures: FeatureToggle[];
  disabledFeatures: FeatureToggle[];

  checkResources: () => void;

  memoryStatus: ResourceStatus;
  cpuStatus: ResourceStatus;
  batteryStatus: ResourceStatus;
  storageStatus: ResourceStatus;
  networkStatus: ResourceStatus;

  memoryUsagePercent: number;
  cpuUsagePercent: number;
  batteryLevel: number;
}

export function usePerformanceOptimizer(
  options: UsePerformanceOptimizerOptions = {}
): UsePerformanceOptimizerReturn {
  const {
    enableAutoRecovery = true,
    onModeSwitch,
  } = options;

  const {
    mode,
    setMode,
    toggleMode,
    resourceMetrics,
    resourceStatus,
    checkResources,
    enabledFeatures,
    disabledFeatures,
    isFeatureEnabled: isFeatureEnabledFn,
  } = useLowPerformanceMode();

  const previousModeRef = useRef<PerformanceMode>(mode);
  const lastSwitchTimeRef = useRef<number>(0);

  const isHighPerformance = mode === 'high';
  const isLowPerformance = mode === 'low';

  const resourceScore = useMemo(() => {
    if (!resourceMetrics) return 100;
    return calculateResourceScore(resourceMetrics);
  }, [resourceMetrics]);

  const resourceScoreLevel = useMemo(() => {
    return getResourceScoreLevel(resourceScore);
  }, [resourceScore]);

  const memoryStatus = resourceMetrics?.memory.status || 'normal';
  const cpuStatus = resourceMetrics?.cpu.status || 'normal';
  const batteryStatus = resourceMetrics?.battery.status || 'normal';
  const storageStatus = resourceMetrics?.storage.status || 'normal';
  const networkStatus = resourceMetrics?.network.status || 'normal';

  const memoryUsagePercent = resourceMetrics?.memory.usagePercent || 0;
  const cpuUsagePercent = resourceMetrics?.cpu.usagePercent || 0;
  const batteryLevel = resourceMetrics?.battery.level || 1;

  useEffect(() => {
    if (previousModeRef.current !== mode) {
      const now = Date.now();
      if (now - lastSwitchTimeRef.current > 5000) {
        lastSwitchTimeRef.current = now;
        previousModeRef.current = mode;
        onModeSwitch?.(previousModeRef.current, mode);
      }
    }
  }, [mode, onModeSwitch]);

  const handleSetMode = useCallback((newMode: PerformanceMode) => {
    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 1000) {
      return;
    }
    lastSwitchTimeRef.current = now;
    setMode(newMode);
  }, [setMode]);

  return {
    mode,
    setMode: handleSetMode,
    toggleMode,
    isHighPerformance,
    isLowPerformance,

    resourceMetrics,
    resourceStatus,
    resourceScore,
    resourceScoreLevel,

    isFeatureEnabled: isFeatureEnabledFn,
    enabledFeatures,
    disabledFeatures,

    checkResources,

    memoryStatus,
    cpuStatus,
    batteryStatus,
    storageStatus,
    networkStatus,

    memoryUsagePercent,
    cpuUsagePercent,
    batteryLevel,
  };
}

export function useLowMemoryMode(): boolean {
  const { memoryStatus, memoryUsagePercent } = usePerformanceOptimizer();
  return memoryStatus !== 'normal' || memoryUsagePercent > 0.7;
}

export function useLowBatteryMode(): boolean {
  const { batteryStatus, batteryLevel } = usePerformanceOptimizer();
  return batteryStatus !== 'normal' || batteryLevel < 0.2;
}

export function useCriticalResourceMode(): boolean {
  const { resourceStatus } = usePerformanceOptimizer();
  return resourceStatus === 'critical';
}

export function useResourceEfficiency(): {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  isOptimized: boolean;
} {
  const { resourceScore, resourceScoreLevel, isLowPerformance } = usePerformanceOptimizer();

  return {
    score: resourceScore,
    level: resourceScoreLevel,
    isOptimized: isLowPerformance || resourceScoreLevel === 'excellent' || resourceScoreLevel === 'good',
  };
}

export function useFeatureResourceCost(featureId: string): {
  cost: 'none' | 'low' | 'medium' | 'high';
  isEnabled: boolean;
  shouldEnable: boolean;
} {
  const { isFeatureEnabled, isLowPerformance } = usePerformanceOptimizer();

  const featureMap: Record<string, { cost: 'none' | 'low' | 'medium' | 'high'; highModeOnly?: boolean }> = {
    'global-search': { cost: 'medium' },
    'real-time-sync': { cost: 'high' },
    'auto-refresh': { cost: 'low' },
    'animation': { cost: 'low' },
    'notification': { cost: 'medium' },
    'performance-monitor': { cost: 'low' },
    'audit-log': { cost: 'medium' },
    'backup': { cost: 'high' },
    'web-worker': { cost: 'medium' },
    'task-auto-create': { cost: 'medium' },
  };

  const config = featureMap[featureId] || { cost: 'none' as const };
  const isEnabled = isFeatureEnabled(featureId);
  const shouldEnable = !isLowPerformance && config.cost !== 'high';

  return {
    cost: config.cost,
    isEnabled,
    shouldEnable,
  };
}

export default usePerformanceOptimizer;
