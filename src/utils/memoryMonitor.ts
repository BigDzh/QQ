interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  componentCount: number;
  logCount: number;
  cacheSize: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface AlertRule {
  id: string;
  metricName: string;
  condition: 'gt' | 'lt' | 'eq';
  value: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  cooldown: number;
  lastTriggered?: number;
  enabled: boolean;
}

interface PerformanceAlert {
  id: string;
  ruleId: string;
  timestamp: number;
  metricName: string;
  value: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  acknowledged: boolean;
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots: number = 60;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number = 5000;
  private isMonitoring: boolean = false;
  private alertRules: Map<string, AlertRule> = new Map();
  private alerts: PerformanceAlert[] = [];
  private maxAlerts: number = 100;
  private alertCallbacks: Set<(alert: PerformanceAlert) => void> = new Set();
  private static instance: MemoryMonitor | null = null;

  private constructor() {
    this.setupDefaultAlerts();
  }

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  static destroyInstance(): void {
    if (MemoryMonitor.instance) {
      MemoryMonitor.instance.stopMonitoring();
      MemoryMonitor.instance = null;
    }
  }

  private setupDefaultAlerts(): void {
    this.addAlertRule({
      id: 'memory_high',
      metricName: 'usedJSHeapSize',
      condition: 'gt',
      value: 100 * 1024 * 1024,
      severity: 'warning',
      message: '内存使用超过100MB',
      cooldown: 60000,
      enabled: true,
    });

    this.addAlertRule({
      id: 'memory_critical',
      metricName: 'usedJSHeapSize',
      condition: 'gt',
      value: 150 * 1024 * 1024,
      severity: 'error',
      message: '内存使用超过150MB，可能存在内存泄漏',
      cooldown: 120000,
      enabled: true,
    });

    this.addAlertRule({
      id: 'memory_leak_detected',
      metricName: 'memoryGrowthRate',
      condition: 'gt',
      value: 5 * 1024 * 1024,
      severity: 'warning',
      message: '检测到内存增长过快（5秒内增长超过5MB）',
      cooldown: 30000,
      enabled: true,
    });
  }

  startMonitoring(intervalMs?: number): void {
    if (this.isMonitoring) return;

    this.intervalMs = intervalMs || this.intervalMs;
    
    this.takeSnapshot();

    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
      this.checkAlerts();
    }, this.intervalMs);

    this.isMonitoring = true;
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  private takeSnapshot(): void {
    const perf = performance as unknown as { memory?: MemoryInfo };
    const memory = perf?.memory;

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      totalJSHeapSize: memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
      componentCount: this.estimateComponentCount(),
      logCount: this.estimateLogCount(),
      cacheSize: this.estimateCacheSize(),
    };

    this.snapshots.push(snapshot);

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  private estimateComponentCount(): number {
    try {
      const root = document.getElementById('root');
      return root ? root.querySelectorAll('*').length : 0;
    } catch {
      return 0;
    }
  }

  private estimateLogCount(): number {
    try {
      const componentLogs = localStorage.getItem('hierarchical_log_component');
      const moduleLogs = localStorage.getItem('hierarchical_log_module');
      const systemLogs = localStorage.getItem('hierarchical_log_system');

      let count = 0;
      if (componentLogs) {
        try { count += JSON.parse(componentLogs).length || 0; } catch { /* ignore */ }
      }
      if (moduleLogs) {
        try { count += JSON.parse(moduleLogs).length || 0; } catch { /* ignore */ }
      }
      if (systemLogs) {
        try { count += JSON.parse(systemLogs).length || 0; } catch { /* ignore */ }
      }

      return count;
    } catch {
      return 0;
    }
  }

  private estimateCacheSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('hierarchical_log_')) {
        const value = localStorage.getItem(key);
        if (value) {
          size += value.length * 2; 
        }
      }
    }
    return size;
  }

  getCurrentMetrics(): PerformanceMetric[] {
    if (this.snapshots.length === 0) {
      return [];
    }

    const current = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots.length > 1 ? this.snapshots[this.snapshots.length - 2] : current;

    const metrics: PerformanceMetric[] = [
      {
        name: 'usedJSHeapSize',
        value: current.usedJSHeapSize,
        unit: 'bytes',
        threshold: 100 * 1024 * 1024,
        status: this.getStatus(current.usedJSHeapSize, 100 * 1024 * 1024, 150 * 1024 * 1024),
        trend: this.getTrend(current.usedJSHeapSize, previous.usedJSHeapSize),
      },
      {
        name: 'totalJSHeapSize',
        value: current.totalJSHeapSize,
        unit: 'bytes',
        threshold: 200 * 1024 * 1024,
        status: this.getStatus(current.totalJSHeapSize, 200 * 1024 * 1024, 300 * 1024 * 1024),
        trend: this.getTrend(current.totalJSHeapSize, previous.totalJSHeapSize),
      },
      {
        name: 'componentCount',
        value: current.componentCount,
        unit: 'count',
        threshold: 500,
        status: this.getStatus(current.componentCount, 500, 1000),
        trend: this.getTrend(current.componentCount, previous.componentCount),
      },
      {
        name: 'logCount',
        value: current.logCount,
        unit: 'count',
        threshold: 1500,
        status: this.getStatus(current.logCount, 1500, 2500),
        trend: this.getTrend(current.logCount, previous.logCount),
      },
      {
        name: 'cacheSize',
        value: current.cacheSize,
        unit: 'bytes',
        threshold: 5 * 1024 * 1024,
        status: this.getStatus(current.cacheSize, 5 * 1024 * 1024, 10 * 1024 * 1024),
        trend: this.getTrend(current.cacheSize, previous.cacheSize),
      },
    ];

    if (this.snapshots.length >= 2) {
      const timeDiff = (current.timestamp - previous.timestamp) / 1000;
      const memoryDiff = current.usedJSHeapSize - previous.usedJSHeapSize;
      
      if (timeDiff > 0) {
        metrics.push({
          name: 'memoryGrowthRate',
          value: Math.abs(memoryDiff),
          unit: 'bytes/sec',
          threshold: 1024 * 1024,
          status: this.getStatus(Math.abs(memoryDiff), 1024 * 1024, 5 * 1024 * 1024),
          trend: memoryDiff > 0 ? 'up' : 'down',
        });
      }
    }

    return metrics;
  }

  private getStatus(value: number, warningThreshold: number, criticalThreshold: number): 'normal' | 'warning' | 'critical' {
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
    return 'normal';
  }

  private getTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const diff = current - previous;
    const percentChange = previous !== 0 ? (diff / previous) * 100 : 0;

    if (Math.abs(percentChange) > 10) {
      return diff > 0 ? 'up' : 'down';
    }
    return 'stable';
  }

  getMemoryHistory(minutes: number = 5): MemorySnapshot[] {
    const cutoffTime = Date.now() - minutes * 60 * 1000;
    return this.snapshots.filter(s => s.timestamp >= cutoffTime);
  }

  getAverageMemoryUsage(minutes: number = 5): number {
    const history = this.getMemoryHistory(minutes);
    if (history.length === 0) return 0;

    const sum = history.reduce((acc, s) => acc + s.usedJSHeapSize, 0);
    return sum / history.length;
  }

  getPeakMemoryUsage(minutes: number = 5): number {
    const history = this.getMemoryHistory(minutes);
    if (history.length === 0) return 0;

    return Math.max(...history.map(s => s.usedJSHeapSize));
  }

  detectMemoryLeak(): { isLeaking: boolean; leakRate: number; confidence: number } {
    if (this.snapshots.length < 6) {
      return { isLeaking: false, leakRate: 0, confidence: 0 };
    }

    const recent = this.snapshots.slice(-6);
    const firstHalf = recent.slice(0, 3);
    const secondHalf = recent.slice(3);

    const avgFirst = firstHalf.reduce((acc, s) => acc + s.usedJSHeapSize, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((acc, s) => acc + s.usedJSHeapSize, 0) / secondHalf.length;

    const leakRate = (avgSecond - avgFirst) / ((recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000);

    if (leakRate <= 0) {
      return { isLeaking: false, leakRate: 0, confidence: 0 };
    }

    const variance = recent.reduce((acc, s, _i, arr) => {
      const mean = arr.reduce((a, b) => a + b.usedJSHeapSize, 0) / arr.length;
      return acc + Math.pow(s.usedJSHeapSize - mean, 2);
    }, 0) / recent.length;

    const stdDev = Math.sqrt(variance);
    const mean = recent.reduce((acc, s) => acc + s.usedJSHeapSize, 0) / recent.length;
    const coefficientOfVariation = stdDev / mean;

    const confidence = Math.min(1, Math.max(0, 1 - coefficientOfVariation));

    return {
      isLeaking: leakRate > 1024 * 10,
      leakRate,
      confidence: confidence * 100,
    };
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  removeAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
    }
  }

  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  private checkAlerts(): void {
    if (this.snapshots.length === 0) return;

    const metrics = this.getCurrentMetrics();

    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      const now = Date.now();
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown) continue;

      const metric = metrics.find(m => m.name === rule.metricName);
      if (!metric) continue;

      let shouldTrigger = false;
      switch (rule.condition) {
        case 'gt':
          shouldTrigger = metric.value > rule.value;
          break;
        case 'lt':
          shouldTrigger = metric.value < rule.value;
          break;
        case 'eq':
          shouldTrigger = metric.value === rule.value;
          break;
      }

      if (shouldTrigger) {
        rule.lastTriggered = now;

        const alert: PerformanceAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId,
          timestamp: now,
          metricName: rule.metricName,
          value: metric.value,
          severity: rule.severity,
          message: rule.message.replace('{value}', formatBytes(metric.value)),
          acknowledged: false,
        };

        this.alerts.push(alert);
        
        if (this.alerts.length > this.maxAlerts) {
          this.alerts.shift();
        }

        console.warn(`[Memory Monitor] ${rule.message} (${formatBytes(metric.value)})`);

        this.alertCallbacks.forEach(callback => {
          try {
            callback(alert);
          } catch (e) {
            console.error('[Memory Monitor] Error in alert callback:', e);
          }
        });
      }
    }
  }

  getRecentAlerts(count: number = 20): PerformanceAlert[] {
    return this.alerts.slice(-count).reverse();
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  generateReport(): {
    summary: {
      monitoringDuration: string;
      snapshotCount: number;
      currentMemoryMB: number;
      averageMemoryMB: number;
      peakMemoryMB: number;
      isLeaking: boolean;
      leakRate: string;
      alertCount: number;
    };
    metrics: PerformanceMetric[];
    recommendations: string[];
  } {
    const duration = this.snapshots.length > 1
      ? `${((this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp) / 1000 / 60).toFixed(1)} 分钟`
      : '< 1 分钟';

    const currentMemory = this.getCurrentMetrics().find(m => m.name === 'usedJSHeapSize')?.value || 0;
    const avgMemory = this.getAverageMemoryUsage();
    const peakMemory = this.getPeakMemoryUsage();
    const leakDetection = this.detectMemoryLeak();

    const recommendations: string[] = [];

    if (leakDetection.isLeaking) {
      recommendations.push(`⚠️ 检测到内存泄漏！泄漏速率: ${formatBytes(leakDetection.leakRate)}/s`);
      recommendations.push('建议检查事件监听器是否正确清理');
      recommendations.push('建议检查定时器/Interval是否正确清除');
    }

    if (currentMemory > 100 * 1024 * 1024) {
      recommendations.push(`⚠️ 内存使用过高: ${formatBytes(currentMemory)}，建议优化数据结构`);
    }

    const unacknowledgedAlerts = this.alerts.filter(a => !a.acknowledged).length;
    if (unacknowledgedAlerts > 0) {
      recommendations.push(`📢 有 ${unacknowledgedAlerts} 个未处理的告警`);
    }

    return {
      summary: {
        monitoringDuration: duration,
        snapshotCount: this.snapshots.length,
        currentMemoryMB: currentMemory / (1024 * 1024),
        averageMemoryMB: avgMemory / (1024 * 1024),
        peakMemoryMB: peakMemory / (1024 * 1024),
        isLeaking: leakDetection.isLeaking,
        leakRate: `${formatBytes(leakDetection.leakRate)}/s`,
        alertCount: this.alerts.length,
      },
      metrics: this.getCurrentMetrics(),
      recommendations,
    };
  }

  exportData(): string {
    return JSON.stringify({
      snapshots: this.snapshots,
      alerts: this.alerts,
      report: this.generateReport(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  destroy(): void {
    this.stopMonitoring();
    this.snapshots = [];
    this.alertRules.clear();
    this.alerts = [];
    this.alertCallbacks.clear();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const memoryMonitor = MemoryMonitor.getInstance();

export function startMemoryMonitoring(intervalMs?: number): void {
  memoryMonitor.startMonitoring(intervalMs);
}

export function stopMemoryMonitoring(): void {
  memoryMonitor.stopMonitoring();
}

export function getPerformanceReport() {
  return memoryMonitor.generateReport();
}

export function checkForMemoryLeaks() {
  return memoryMonitor.detectMemoryLeak();
}
