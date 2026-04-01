export type PerformanceMode = 'high' | 'low';

export type ResourceType = 'memory' | 'cpu' | 'battery' | 'network' | 'storage';

export type ResourceStatus = 'normal' | 'warning' | 'critical';

export interface ResourceThreshold {
  warning: number;
  critical: number;
}

export interface ResourceMetrics {
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  battery: BatteryMetrics;
  network: NetworkMetrics;
  storage: StorageMetrics;
  overallStatus: ResourceStatus;
  lastUpdated: number;
}

export interface MemoryMetrics {
  usedHeap: number;
  totalHeap: number;
  heapLimit: number;
  usagePercent: number;
  status: ResourceStatus;
}

export interface CpuMetrics {
  usagePercent: number;
  status: ResourceStatus;
  cores: number;
}

export interface BatteryMetrics {
  level: number;
  charging: boolean;
  status: ResourceStatus;
  estimatedTimeRemaining: number | null;
}

export interface NetworkMetrics {
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  status: ResourceStatus;
}

export interface StorageMetrics {
  used: number;
  quota: number;
  usagePercent: number;
  status: ResourceStatus;
}

export interface ResourceAlert {
  id: string;
  type: ResourceType;
  status: ResourceStatus;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface LowPerformanceModeConfig {
  memoryThreshold: ResourceThreshold;
  cpuThreshold: ResourceThreshold;
  batteryThreshold: ResourceThreshold;
  storageThreshold: ResourceThreshold;
  autoSwitchEnabled: boolean;
  autoSwitchDelay: number;
  checkInterval: number;
  allowManualOverride: boolean;
  hysteresisEnabled: boolean;
  minDurationInMode: number;
}

export interface FeatureToggle {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'enhanced' | 'optional';
  enabledInHighMode: boolean;
  enabledInLowMode: boolean;
  resourceCost: 'none' | 'low' | 'medium' | 'high';
  dependencies?: string[];
}

export type SwitchTrigger = 'manual' | 'auto-memory' | 'auto-cpu' | 'auto-battery' | 'auto-network' | 'auto-storage';

export interface ModeSwitchEvent {
  fromMode: PerformanceMode;
  toMode: PerformanceMode;
  trigger: SwitchTrigger;
  timestamp: number;
  metrics: ResourceMetrics;
}

export interface PerformanceBenchmarks {
  targetFps: number;
  maxMemoryUsageMB: number;
  maxCpuPercent: number;
  targetLoadTime: number;
}

export const PERFORMANCE_BENCHMARKS: PerformanceBenchmarks = {
  targetFps: 60,
  maxMemoryUsageMB: 512,
  maxCpuPercent: 80,
  targetLoadTime: 2000,
};

export const RESOURCE_OPTIMIZATION_TARGETS = {
  memory: {
    highMode: { maxPercent: 0.7, alertPercent: 0.6 },
    lowMode: { maxPercent: 0.5, alertPercent: 0.4 },
  },
  cpu: {
    highMode: { maxPercent: 0.6, alertPercent: 0.5 },
    lowMode: { maxPercent: 0.4, alertPercent: 0.3 },
  },
  battery: {
    highMode: { minLevel: 0.2, criticalLevel: 0.1 },
    lowMode: { minLevel: 0.3, criticalLevel: 0.2 },
  },
} as const;

export const DEFAULT_RESOURCE_THRESHOLDS: Record<ResourceType, ResourceThreshold> = {
  memory: { warning: 0.7, critical: 0.85 },
  cpu: { warning: 0.6, critical: 0.8 },
  battery: { warning: 0.2, critical: 0.1 },
  network: { warning: 0.5, critical: 0.3 },
  storage: { warning: 0.8, critical: 0.95 },
};

export const DEFAULT_LOW_PERFORMANCE_CONFIG: LowPerformanceModeConfig = {
  memoryThreshold: { warning: 0.6, critical: 0.8 },
  cpuThreshold: { warning: 0.5, critical: 0.7 },
  batteryThreshold: { warning: 0.3, critical: 0.15 },
  storageThreshold: { warning: 0.75, critical: 0.9 },
  autoSwitchEnabled: true,
  autoSwitchDelay: 5000,
  checkInterval: 10000,
  allowManualOverride: true,
  hysteresisEnabled: true,
  minDurationInMode: 30000,
};

export const CORE_FEATURES: FeatureToggle[] = [
  {
    id: 'project-view',
    name: '项目查看',
    description: '查看项目列表和详情',
    category: 'core',
    enabledInHighMode: true,
    enabledInLowMode: true,
    resourceCost: 'none',
  },
  {
    id: 'module-view',
    name: '模块查看',
    description: '查看模块列表和详情',
    category: 'core',
    enabledInHighMode: true,
    enabledInLowMode: true,
    resourceCost: 'none',
  },
  {
    id: 'component-view',
    name: '组件查看',
    description: '查看组件列表和详情',
    category: 'core',
    enabledInHighMode: true,
    enabledInLowMode: true,
    resourceCost: 'none',
  },
  {
    id: 'task-view',
    name: '任务查看',
    description: '查看和管理任务',
    category: 'core',
    enabledInHighMode: true,
    enabledInLowMode: true,
    resourceCost: 'low',
  },
  {
    id: 'task-auto-create',
    name: '自动任务创建',
    description: '根据系统状态自动创建任务',
    category: 'core',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'medium',
  },
];

export const ENHANCED_FEATURES: FeatureToggle[] = [
  {
    id: 'global-search',
    name: '全局搜索',
    description: '实时全局搜索功能',
    category: 'enhanced',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'medium',
  },
  {
    id: 'real-time-sync',
    name: '实时同步',
    description: '数据实时同步',
    category: 'enhanced',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'high',
  },
  {
    id: 'auto-refresh',
    name: '自动刷新',
    description: '页面数据自动刷新',
    category: 'enhanced',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'low',
  },
  {
    id: 'animation',
    name: '界面动画',
    description: '界面过渡动画效果',
    category: 'enhanced',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'low',
  },
  {
    id: 'notification',
    name: '后台通知',
    description: '后台任务通知推送',
    category: 'enhanced',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'medium',
  },
];

export const OPTIONAL_FEATURES: FeatureToggle[] = [
  {
    id: 'performance-monitor',
    name: '性能监控面板',
    description: '显示性能监控数据',
    category: 'optional',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'low',
  },
  {
    id: 'audit-log',
    name: '审计日志',
    description: '详细操作审计日志',
    category: 'optional',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'medium',
  },
  {
    id: 'backup',
    name: '自动备份',
    description: '数据自动备份功能',
    category: 'optional',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'high',
  },
  {
    id: 'web-worker',
    name: 'Web Worker计算',
    description: '使用Web Worker进行后台计算',
    category: 'optional',
    enabledInHighMode: true,
    enabledInLowMode: false,
    resourceCost: 'medium',
  },
];

export const ALL_FEATURES = [...CORE_FEATURES, ...ENHANCED_FEATURES, ...OPTIONAL_FEATURES];

export function isFeatureEnabled(
  featureId: string,
  mode: PerformanceMode
): boolean {
  const feature = ALL_FEATURES.find(f => f.id === featureId);
  if (!feature) return false;

  return mode === 'high' ? feature.enabledInHighMode : feature.enabledInLowMode;
}

export function getFeaturesByMode(mode: PerformanceMode): FeatureToggle[] {
  return ALL_FEATURES.filter(f =>
    mode === 'high' ? f.enabledInHighMode : f.enabledInLowMode
  );
}

export function getCoreFeatures(mode: PerformanceMode): FeatureToggle[] {
  return CORE_FEATURES.filter(f =>
    mode === 'high' ? f.enabledInHighMode : f.enabledInLowMode
  );
}

export function getResourceStatus(
  value: number,
  thresholds: ResourceThreshold,
  invertThreshold: boolean = false
): ResourceStatus {
  if (invertThreshold) {
    if (value <= thresholds.critical) return 'critical';
    if (value <= thresholds.warning) return 'warning';
    return 'normal';
  }

  if (value >= thresholds.critical) return 'critical';
  if (value >= thresholds.warning) return 'warning';
  return 'normal';
}

export function formatResourceValue(type: ResourceType, value: number): string {
  switch (type) {
    case 'memory':
    case 'storage':
      return `${(value * 100).toFixed(1)}%`;
    case 'battery':
      return `${(value * 100).toFixed(0)}%`;
    case 'cpu':
      return `${(value * 100).toFixed(1)}%`;
    case 'network':
      return `${value.toFixed(1)} Mbps`;
    default:
      return `${value}`;
  }
}

export function getOverallResourceStatus(statuses: ResourceStatus[]): ResourceStatus {
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning')) return 'warning';
  return 'normal';
}

export function shouldSwitchToLowMode(
  metrics: ResourceMetrics,
  config: LowPerformanceModeConfig
): { shouldSwitch: boolean; reason: string; trigger: SwitchTrigger } {
  if (metrics.memory.status === 'critical') {
    return { shouldSwitch: true, reason: '内存使用严重超标', trigger: 'auto-memory' };
  }
  if (metrics.cpu.status === 'critical') {
    return { shouldSwitch: true, reason: 'CPU使用率严重超标', trigger: 'auto-cpu' };
  }
  if (metrics.battery.status === 'critical') {
    return { shouldSwitch: true, reason: '电池电量严重不足', trigger: 'auto-battery' };
  }
  if (metrics.storage.status === 'critical') {
    return { shouldSwitch: true, reason: '存储空间严重不足', trigger: 'auto-storage' };
  }
  if (metrics.network.status === 'critical') {
    return { shouldSwitch: true, reason: '网络连接质量极差', trigger: 'auto-network' };
  }

  if (metrics.memory.status === 'warning') {
    return { shouldSwitch: true, reason: '内存使用较高', trigger: 'auto-memory' };
  }
  if (metrics.cpu.status === 'warning') {
    return { shouldSwitch: true, reason: 'CPU使用率较高', trigger: 'auto-cpu' };
  }
  if (metrics.battery.status === 'warning') {
    return { shouldSwitch: true, reason: '电池电量较低', trigger: 'auto-battery' };
  }

  return { shouldSwitch: false, reason: '', trigger: 'manual' };
}

export function shouldSwitchToHighMode(
  metrics: ResourceMetrics,
  config: LowPerformanceModeConfig
): { shouldSwitch: boolean; reason: string; trigger: SwitchTrigger } {
  const memoryOk = metrics.memory.status === 'normal';
  const cpuOk = metrics.cpu.status === 'normal';
  const batteryOk = metrics.battery.status === 'normal' || metrics.battery.charging;
  const storageOk = metrics.storage.status !== 'critical';
  const networkOk = metrics.network.status !== 'critical';

  if (memoryOk && cpuOk && batteryOk && storageOk && networkOk) {
    return { shouldSwitch: true, reason: '资源状态恢复正常', trigger: 'manual' };
  }

  return { shouldSwitch: false, reason: '', trigger: 'manual' };
}

export function calculateResourceScore(metrics: ResourceMetrics): number {
  let score = 100;

  if (metrics.memory.status === 'warning') score -= 20;
  if (metrics.memory.status === 'critical') score -= 40;

  if (metrics.cpu.status === 'warning') score -= 15;
  if (metrics.cpu.status === 'critical') score -= 30;

  if (metrics.battery.status === 'warning') score -= 10;
  if (metrics.battery.status === 'critical') score -= 25;

  if (metrics.storage.status === 'warning') score -= 5;
  if (metrics.storage.status === 'critical') score -= 15;

  if (metrics.network.status === 'warning') score -= 5;
  if (metrics.network.status === 'critical') score -= 10;

  return Math.max(0, score);
}

export function getResourceScoreLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 25) return 'poor';
  return 'critical';
}

export const RESOURCE_THRESHOLD_DOCS = {
  memory: {
    name: '内存使用',
    unit: '百分比',
    highMode: {
      warning: '70%',
      critical: '85%',
      description: '堆内存使用占限制的比例'
    },
    lowMode: {
      warning: '60%',
      critical: '80%',
      description: '低性能模式使用更严格的阈值'
    }
  },
  cpu: {
    name: 'CPU使用率',
    unit: '百分比',
    highMode: {
      warning: '60%',
      critical: '80%',
      description: '基于硬件并发数估算'
    },
    lowMode: {
      warning: '50%',
      critical: '70%',
      description: '降低阈值以保护电池'
    }
  },
  battery: {
    name: '电池电量',
    unit: '百分比',
    highMode: {
      warning: '20%',
      critical: '10%',
      description: '低于警告值时建议切换'
    },
    lowMode: {
      warning: '30%',
      critical: '20%',
      description: '充电时视为正常'
    }
  },
  storage: {
    name: '存储空间',
    unit: '百分比',
    highMode: {
      warning: '80%',
      critical: '95%',
      description: 'IndexedDB/LocalStorage使用量'
    },
    lowMode: {
      warning: '75%',
      critical: '90%',
      description: '保留更多可用空间'
    }
  }
} as const;
