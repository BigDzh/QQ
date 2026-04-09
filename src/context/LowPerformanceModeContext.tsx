import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useResourceMonitor } from '../hooks/useResourceMonitor';
import { usePerformanceMode } from './PerformanceModeContext';
import { useToast } from '../components/Toast';
import { memoryOptimizer, checkMemoryPressure } from '../utils/memoryOptimizer';
import {
  type PerformanceMode,
  type ResourceMetrics,
  type ResourceAlert,
  type ResourceStatus,
  type LowPerformanceModeConfig,
  type FeatureToggle,
  type SwitchTrigger,
  type ModeSwitchEvent,
  DEFAULT_LOW_PERFORMANCE_CONFIG,
  CORE_FEATURES,
  ENHANCED_FEATURES,
  OPTIONAL_FEATURES,
  ALL_FEATURES,
  isFeatureEnabled,
  getCoreFeatures,
  getFeaturesByMode,
  shouldSwitchToLowMode,
  shouldSwitchToHighMode,
  calculateResourceScore,
} from '../types/lowPerformanceMode';

interface LowPerformanceModeContextType {
  mode: PerformanceMode;
  setMode: (mode: PerformanceMode) => void;
  toggleMode: () => void;
  isAutoMode: boolean;
  setAutoMode: (enabled: boolean) => void;
  isLowResource: boolean;
  resourceMetrics: ResourceMetrics | null;
  alerts: ResourceAlert[];
  features: FeatureToggle[];
  enabledFeatures: FeatureToggle[];
  disabledFeatures: FeatureToggle[];
  isFeatureEnabled: (featureId: string) => boolean;
  featureOverrides: Record<string, boolean>;
  setFeatureOverride: (featureId: string, enabled: boolean) => void;
  clearFeatureOverride: (featureId: string) => void;
  clearAllFeatureOverrides: () => void;
  getEffectiveFeatureState: (feature: FeatureToggle) => boolean;
  dismissAlert: (alertId: string) => void;
  clearAlerts: () => void;
  config: LowPerformanceModeConfig;
  updateConfig: (config: Partial<LowPerformanceModeConfig>) => void;
  resourceStatus: ResourceStatus;
  checkResources: () => void;
  modeChangeReason: string | null;
  lastSwitchEvent: ModeSwitchEvent | null;
  resourceScore: number;
  switchHistory: ModeSwitchEvent[];
  forceSwitch: (mode: PerformanceMode, reason: string) => void;
}

const LowPerformanceModeContext = createContext<LowPerformanceModeContextType | undefined>(undefined);

const LOW_PERFORMANCE_MODE_KEY = 'low_performance_mode';
const AUTO_MODE_KEY = 'auto_mode_enabled';
const CONFIG_KEY = 'low_performance_config';
const SWITCH_HISTORY_KEY = 'mode_switch_history';
const FEATURE_OVERRIDES_KEY = 'feature_overrides';
const MAX_SWITCH_HISTORY = 10;

interface LowPerformanceModeProviderProps {
  children: ReactNode;
  config?: Partial<LowPerformanceModeConfig>;
  onModeChange?: (mode: PerformanceMode, reason: string) => void;
}

export function LowPerformanceModeProvider({
  children,
  config = {},
  onModeChange,
}: LowPerformanceModeProviderProps) {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_LOW_PERFORMANCE_CONFIG, ...config }),
    [config]
  );

  const { showToast } = useToast();
  const {
    metrics: resourceMetrics,
    alerts,
    isLowResource,
    dismissAlert,
    clearAlerts,
    checkResources,
  } = useResourceMonitor({
    config: mergedConfig,
    enabled: mergedConfig.autoSwitchEnabled,
  });

  const [mode, setModeState] = useState<PerformanceMode>('high');
  const [isAutoMode, setIsAutoModeState] = useState(mergedConfig.autoSwitchEnabled);
  const [modeChangeReason, setModeChangeReason] = useState<string | null>(null);
  const [lastSwitchEvent, setLastSwitchEvent] = useState<ModeSwitchEvent | null>(null);
  const [switchHistory, setSwitchHistory] = useState<ModeSwitchEvent[]>([]);
  const [featureOverrides, setFeatureOverridesState] = useState<Record<string, boolean>>({});

  const previousModeRef = useRef<PerformanceMode>('high');
  const modeChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastModeChangeTimeRef = useRef<number>(0);
  const consecutiveLowModeRef = useRef<number>(0);
  const pendingSwitchRef = useRef<{ targetMode: PerformanceMode; reason: string } | null>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem(LOW_PERFORMANCE_MODE_KEY);
    if (savedMode === 'high' || savedMode === 'low') {
      setModeState(savedMode);
    }

    const savedAutoMode = localStorage.getItem(AUTO_MODE_KEY);
    if (savedAutoMode !== null) {
      setIsAutoModeState(savedAutoMode === 'true');
    }

    try {
      const savedHistory = localStorage.getItem(SWITCH_HISTORY_KEY);
      if (savedHistory) {
        setSwitchHistory(JSON.parse(savedHistory));
      }
    } catch {
      // Ignore history parse errors
    }

    try {
      const savedOverrides = localStorage.getItem(FEATURE_OVERRIDES_KEY);
      if (savedOverrides) {
        setFeatureOverridesState(JSON.parse(savedOverrides));
      }
    } catch {
      // Ignore feature overrides parse errors
    }
  }, []);

  const addToSwitchHistory = useCallback((event: ModeSwitchEvent) => {
    setSwitchHistory(prev => {
      const updated = [...prev, event].slice(-MAX_SWITCH_HISTORY);
      try {
        localStorage.setItem(SWITCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  const notifyModeChange = useCallback(
    (newMode: PerformanceMode, reason: string, trigger: SwitchTrigger = 'manual') => {
      if (previousModeRef.current === newMode) return;

      const now = Date.now();
      if (mergedConfig.minDurationInMode > 0) {
        const timeSinceLastSwitch = now - lastModeChangeTimeRef.current;
        if (timeSinceLastSwitch < mergedConfig.minDurationInMode && previousModeRef.current !== undefined) {
          return;
        }
      }

      setModeChangeReason(reason);
      lastModeChangeTimeRef.current = now;

      if (modeChangeTimeoutRef.current) {
        clearTimeout(modeChangeTimeoutRef.current);
      }

      modeChangeTimeoutRef.current = setTimeout(() => {
        setModeChangeReason(null);
      }, 5000);

      const switchEvent: ModeSwitchEvent = {
        fromMode: previousModeRef.current,
        toMode: newMode,
        trigger,
        timestamp: now,
        metrics: resourceMetrics || {} as ResourceMetrics,
      };

      setLastSwitchEvent(switchEvent);
      addToSwitchHistory(switchEvent);

      showToast(
        newMode === 'low'
          ? `⚠️ 已切换至低性能模式 - ${reason}`
          : `✅ 已切换至高性能模式 - 已启用全部功能`,
        newMode === 'low' ? 'warning' : 'success'
      );

      onModeChange?.(newMode, reason);
      previousModeRef.current = newMode;
    },
    [showToast, onModeChange, mergedConfig.minDurationInMode, resourceMetrics, addToSwitchHistory]
  );

  const forceSwitch = useCallback((targetMode: PerformanceMode, reason: string) => {
    pendingSwitchRef.current = { targetMode, reason };
    setModeState(targetMode);
    localStorage.setItem(LOW_PERFORMANCE_MODE_KEY, targetMode);
    notifyModeChange(targetMode, reason, 'manual');
  }, [notifyModeChange]);

  const setMode = useCallback(
    (newMode: PerformanceMode) => {
      if (newMode === previousModeRef.current) return;

      const now = Date.now();
      if (mergedConfig.minDurationInMode > 0) {
        const timeSinceLastSwitch = now - lastModeChangeTimeRef.current;
        if (timeSinceLastSwitch < mergedConfig.minDurationInMode) {
          return;
        }
      }

      previousModeRef.current = newMode;
      setModeState(newMode);
      localStorage.setItem(LOW_PERFORMANCE_MODE_KEY, newMode);

      if (!isAutoMode) {
        notifyModeChange(newMode, '手动切换', 'manual');
      }
    },
    [isAutoMode, notifyModeChange, mergedConfig.minDurationInMode]
  );

  const toggleMode = useCallback(() => {
    const newMode = mode === 'high' ? 'low' : 'high';
    setMode(newMode);
  }, [mode, setMode]);

  const setAutoMode = useCallback(
    (enabled: boolean) => {
      setIsAutoModeState(enabled);
      localStorage.setItem(AUTO_MODE_KEY, String(enabled));

      if (enabled && resourceMetrics) {
        const { shouldSwitch } = shouldSwitchToLowMode(resourceMetrics, mergedConfig);
        if (shouldSwitch) {
          setMode('low');
          notifyModeChange('low', '资源不足 - 自动切换', 'auto-memory');
        }
      }
    },
    [resourceMetrics, mergedConfig, notifyModeChange, setMode]
  );

  const updateConfig = useCallback(
    (newConfig: Partial<LowPerformanceModeConfig>) => {
      const updated = { ...mergedConfig, ...newConfig };
      localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    },
    [mergedConfig]
  );

  const features = useMemo(() => ALL_FEATURES, []);

  const enabledFeatures = useMemo(
    () => getFeaturesByMode(mode),
    [mode]
  );

  const disabledFeatures = useMemo(
    () => features.filter((f) => !isFeatureEnabled(f.id, mode)),
    [features, mode]
  );

  const isFeatureEnabledFn = useCallback(
    (featureId: string) => isFeatureEnabled(featureId, mode),
    [mode]
  );

  const getEffectiveFeatureState = useCallback(
    (feature: FeatureToggle): boolean => {
      if (featureOverrides[feature.id] !== undefined) {
        return featureOverrides[feature.id];
      }
      return isFeatureEnabled(feature.id, mode);
    },
    [featureOverrides, mode]
  );

  const setFeatureOverride = useCallback((featureId: string, enabled: boolean) => {
    setFeatureOverridesState(prev => {
      const updated = { ...prev, [featureId]: enabled };
      try {
        localStorage.setItem(FEATURE_OVERRIDES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  const clearFeatureOverride = useCallback((featureId: string) => {
    setFeatureOverridesState(prev => {
      const updated = { ...prev };
      delete updated[featureId];
      try {
        localStorage.setItem(FEATURE_OVERRIDES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  const clearAllFeatureOverrides = useCallback(() => {
    setFeatureOverridesState({});
    try {
      localStorage.removeItem(FEATURE_OVERRIDES_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const resourceStatus = resourceMetrics?.overallStatus || 'normal';

  const resourceScore = useMemo(() => {
    if (!resourceMetrics) return 100;
    return calculateResourceScore(resourceMetrics);
  }, [resourceMetrics]);

  useEffect(() => {
    if (mode === 'low') {
      memoryOptimizer.setLowMemoryMode(true);
    } else {
      memoryOptimizer.setLowMemoryMode(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!isAutoMode || !mergedConfig.autoSwitchEnabled) return;
    if (!resourceMetrics) return;

    const now = Date.now();
    const timeSinceLastSwitch = now - lastModeChangeTimeRef.current;
    if (timeSinceLastSwitch < mergedConfig.minDurationInMode) {
      return;
    }

    const { level: memoryLevel } = checkMemoryPressure();
    if (memoryLevel === 'critical' && mode !== 'low') {
      console.log('[LowPerformanceMode] Critical memory pressure detected, switching to low mode');
      setMode('low');
      notifyModeChange('low', '内存严重不足', 'auto-memory');
      memoryOptimizer.setLowMemoryMode(true);
      return;
    }

    if (mode === 'high') {
      const { shouldSwitch, reason, trigger } = shouldSwitchToLowMode(resourceMetrics, mergedConfig);
      if (shouldSwitch) {
        if (mergedConfig.autoSwitchDelay > 0) {
          if (modeChangeTimeoutRef.current) {
            clearTimeout(modeChangeTimeoutRef.current);
          }
          modeChangeTimeoutRef.current = setTimeout(() => {
            const currentMetrics = resourceMetrics;
            const recheck = shouldSwitchToLowMode(currentMetrics, mergedConfig);
            if (recheck.shouldSwitch) {
              setMode('low');
              notifyModeChange('low', reason, trigger);
            }
          }, mergedConfig.autoSwitchDelay);
        } else {
          setMode('low');
          notifyModeChange('low', reason, trigger);
        }
      }
    } else if (mode === 'low' && mergedConfig.allowManualOverride) {
      if (mergedConfig.hysteresisEnabled) {
        consecutiveLowModeRef.current += 1;
        if (consecutiveLowModeRef.current < 2) {
          return;
        }
      }

      const { shouldSwitch, reason, trigger } = shouldSwitchToHighMode(resourceMetrics, mergedConfig);
      if (shouldSwitch) {
        setMode('high');
        notifyModeChange('high', reason, trigger);
        consecutiveLowModeRef.current = 0;
      }
    }
  }, [
    isAutoMode,
    mergedConfig,
    resourceMetrics,
    mode,
    setMode,
    notifyModeChange,
  ]);

  useEffect(() => {
    return () => {
      if (modeChangeTimeoutRef.current) {
        clearTimeout(modeChangeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <LowPerformanceModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isAutoMode,
        setAutoMode,
        isLowResource,
        resourceMetrics,
        alerts,
        features,
        enabledFeatures,
        disabledFeatures,
        isFeatureEnabled: isFeatureEnabledFn,
        featureOverrides,
        setFeatureOverride,
        clearFeatureOverride,
        clearAllFeatureOverrides,
        getEffectiveFeatureState,
        dismissAlert,
        clearAlerts,
        config: mergedConfig,
        updateConfig,
        resourceStatus,
        checkResources,
        modeChangeReason,
        lastSwitchEvent,
        resourceScore,
        switchHistory,
        forceSwitch,
      }}
    >
      {children}
    </LowPerformanceModeContext.Provider>
  );
}

export function useLowPerformanceMode() {
  const context = useContext(LowPerformanceModeContext);
  if (!context) {
    throw new Error(
      'useLowPerformanceMode must be used within a LowPerformanceModeProvider'
    );
  }
  return context;
}

export function useFeature(featureId: string): boolean {
  const { isFeatureEnabled } = useLowPerformanceMode();
  return isFeatureEnabled(featureId);
}

export function useCoreFeatures(): FeatureToggle[] {
  const { mode } = useLowPerformanceMode();
  return getCoreFeatures(mode);
}

export function useLowResourceStatus(): {
  isLowResource: boolean;
  metrics: ResourceMetrics | null;
  status: ResourceStatus;
} {
  const { isLowResource, resourceMetrics, resourceStatus } = useLowPerformanceMode();
  return { isLowResource, metrics: resourceMetrics, status: resourceStatus };
}

export default LowPerformanceModeProvider;
