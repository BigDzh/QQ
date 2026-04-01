import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '../components/Toast';

export interface AlertThreshold {
  cpu: number;
  memory: number;
  disk: number;
  fps: number;
}

export interface AlertConfig {
  enabled: boolean;
  thresholds: AlertThreshold;
  cooldown: number;
  autoLowPerformance: boolean;
}

const DEFAULT_THRESHOLDS: AlertThreshold = {
  cpu: 85,
  memory: 85,
  disk: 90,
  fps: 30,
};

const DEFAULT_CONFIG: AlertConfig = {
  enabled: true,
  thresholds: DEFAULT_THRESHOLDS,
  cooldown: 30000,
  autoLowPerformance: false,
};

const STORAGE_KEY = 'performance_alert_config';

export function getAlertConfig(): AlertConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    console.warn('Failed to load alert config');
  }
  return DEFAULT_CONFIG;
}

export function saveAlertConfig(config: AlertConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    console.warn('Failed to save alert config');
  }
}

export function usePerformanceAlert(
  resources: { cpu: number; memory: number; disk: number; fps: number },
  isHighPerformance: boolean
) {
  const { showToast, addNotification } = useToast();
  const lastAlertTime = useRef<Record<string, number>>({});
  const configRef = useRef(getAlertConfig());

  const checkThreshold = useCallback(
    (value: number, threshold: number): boolean => {
      return value >= threshold;
    },
    []
  );

  const triggerAlert = useCallback(
    (type: keyof AlertThreshold, value: number, threshold: number) => {
      const config = configRef.current;
      if (!config.enabled) return;

      const now = Date.now();
      const lastAlert = lastAlertTime.current[type] || 0;

      if (now - lastAlert < config.cooldown) return;

      lastAlertTime.current[type] = now;

      const messages: Record<keyof AlertThreshold, string> = {
        cpu: `CPU使用率过高: ${value}% (阈值: ${threshold}%)`,
        memory: `内存使用率过高: ${value}% (阈值: ${threshold}%)`,
        disk: `磁盘使用率过高: ${value}% (阈值: ${threshold}%)`,
        fps: `帧率过低: ${value} FPS (阈值: ${threshold})`,
      };

      showToast(messages[type], 'warning');
      addNotification({
        type: 'warning',
        title: '性能告警',
        message: messages[type],
      });

      if (config.autoLowPerformance && isHighPerformance) {
        if (type === 'cpu' || type === 'memory' || type === 'fps') {
          showToast('已自动切换至低性能模式', 'info');
        }
      }
    },
    [showToast, addNotification, isHighPerformance]
  );

  useEffect(() => {
    const config = configRef.current;
    if (!config.enabled) return;

    const { cpu, memory, disk, fps } = resources;
    const { cpu: cpuTh, memory: memTh, disk: diskTh, fps: fpsTh } = config.thresholds;

    if (checkThreshold(cpu, cpuTh)) {
      triggerAlert('cpu', cpu, cpuTh);
    }

    if (checkThreshold(memory, memTh)) {
      triggerAlert('memory', memory, memTh);
    }

    if (checkThreshold(disk, diskTh)) {
      triggerAlert('disk', disk, diskTh);
    }

    if (checkThreshold(fpsTh, fps)) {
      triggerAlert('fps', fps, fpsTh);
    }
  }, [resources, checkThreshold, triggerAlert]);

  const updateConfig = useCallback((newConfig: Partial<AlertConfig>) => {
    const updated = { ...configRef.current, ...newConfig };
    configRef.current = updated;
    saveAlertConfig(updated);
  }, []);

  const resetConfig = useCallback(() => {
    configRef.current = DEFAULT_CONFIG;
    saveAlertConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config: configRef.current,
    updateConfig,
    resetConfig,
  };
}
