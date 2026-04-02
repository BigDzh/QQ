import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Gauge,
  Cpu,
  Battery,
  HardDrive,
  AlertTriangle,
  X,
  ChevronDown,
  RefreshCw,
  Settings,
  Activity,
  Zap,
  BatteryLow,
} from 'lucide-react';
import { useLowPerformanceMode } from '../context/LowPerformanceModeContext';
import { formatBytes } from '../services/storageManager';
import {
  type ResourceStatus,
  CORE_FEATURES,
  ENHANCED_FEATURES,
  OPTIONAL_FEATURES,
} from '../types/lowPerformanceMode';

interface ResourceMeterProps {
  label: string;
  value: number;
  max: number;
  status: ResourceStatus;
  icon: typeof Gauge;
  format?: (value: number) => string;
}

function ResourceMeter({
  label,
  value,
  max,
  status,
  icon: Icon,
  format = (v) => `${((v / max) * 100).toFixed(0)}%`,
}: ResourceMeterProps) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  const statusColors: Record<ResourceStatus, { bar: string; text: string; bg: string }> = {
    normal: { bar: 'bg-green-500', text: 'text-green-500', bg: 'bg-green-500/20' },
    warning: { bar: 'bg-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-500/20' },
    critical: { bar: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/20' },
  };

  const colors = statusColors[status];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className={colors.text} />
          <span className="text-xs text-slate-600 dark:text-slate-400">{label}</span>
        </div>
        <span className={`text-xs font-medium ${colors.text}`}>{format(value)}</span>
      </div>
      <div className={`h-1.5 rounded-full ${colors.bg}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

interface FeatureListProps {
  title: string;
  features: typeof CORE_FEATURES;
  enabledIds: string[];
}

function FeatureList({ title, features, enabledIds }: FeatureListProps) {
  const enabled = features.filter((f) => enabledIds.includes(f.id));
  const disabled = features.filter((f) => !enabledIds.includes(f.id));

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-slate-500">{title}</h4>
      {enabled.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {enabled.map((f) => (
            <span
              key={f.id}
              className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs rounded"
            >
              ✓ {f.name}
            </span>
          ))}
        </div>
      )}
      {disabled.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {disabled.map((f) => (
            <span
              key={f.id}
              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs rounded"
            >
              ✗ {f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourceMonitorPanel() {
  const {
    mode,
    toggleMode,
    isAutoMode,
    setAutoMode,
    resourceMetrics,
    alerts,
    enabledFeatures,
    resourceStatus,
    checkResources,
    dismissAlert,
    clearAlerts,
    config,
  } = useLowPerformanceMode();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const expandedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    expandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!expandedRef.current) return;
      const portal = document.querySelector('[data-resource-monitor-portal]');
      if (portal && portal.contains(event.target as Node)) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleModeToggle = useCallback(() => {
    toggleMode();
  }, [toggleMode]);

  const handleAutoModeToggle = useCallback(() => {
    setAutoMode(!isAutoMode);
  }, [isAutoMode, setAutoMode]);

  const enabledFeatureIds = enabledFeatures.map((f) => f.id);

  const getStatusColor = (status: ResourceStatus) => {
    switch (status) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  const getModeIcon = () => {
    if (mode === 'low') return <BatteryLow size={12} />;
    return <Zap size={12} />;
  };

  const getModeColor = () => {
    if (mode === 'low') return 'text-green-600 dark:text-green-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  const getModeBgColor = () => {
    if (mode === 'low') return 'bg-green-500/20 border-green-500/30';
    return 'bg-amber-500/20 border-amber-500/30';
  };

  if (!mounted) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          isExpanded
            ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
            : `${getModeBgColor()} border`
        }`}
      >
        <span className={getModeColor()}>{getModeIcon()}</span>
        <span className={`text-xs font-medium ${getModeColor()}`}>
          {mode === 'high' ? '高性能' : '低性能'}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && createPortal(
        <div
          className="fixed right-4 top-20 md:right-6 md:top-24 lg:right-8 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl z-[var(--z-toast)] overflow-hidden"
          data-resource-monitor-portal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className={getStatusColor(resourceStatus)} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  性能监控
                </span>
                {resourceStatus !== 'normal' && (
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded ${
                      resourceStatus === 'critical'
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400'
                    }`}
                  >
                    {resourceStatus === 'critical' ? '严重' : '警告'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); checkResources(); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="刷新"
                >
                  <RefreshCw size={14} className="text-slate-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="设置"
                >
                  <Settings size={14} className="text-slate-500" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={14} className="text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 dark:text-slate-400">自动模式</span>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleAutoModeToggle}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    isAutoMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      isAutoMode ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleModeToggle}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  mode === 'high'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                }`}
              >
                {mode === 'high' ? '高性能' : '低性能'}
                <Zap size={12} />
              </button>
            </div>

            {showSettings && (
              <div className="text-xs text-slate-500 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                检查间隔: {config.checkInterval / 1000}秒
              </div>
            )}

            {resourceMetrics && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <ResourceMeter
                    label="内存"
                    value={resourceMetrics.memory.usagePercent}
                    max={1}
                    status={resourceMetrics.memory.status}
                    icon={Gauge}
                    format={() => formatBytes(resourceMetrics.memory.usedHeap)}
                  />
                  <ResourceMeter
                    label="存储"
                    value={resourceMetrics.storage.usagePercent}
                    max={1}
                    status={resourceMetrics.storage.status}
                    icon={HardDrive}
                    format={() => `${(resourceMetrics.storage.usagePercent * 100).toFixed(0)}%`}
                  />
                  <ResourceMeter
                    label="CPU"
                    value={resourceMetrics.cpu.usagePercent}
                    max={1}
                    status={resourceMetrics.cpu.status}
                    icon={Cpu}
                    format={() => `${(resourceMetrics.cpu.usagePercent * 100).toFixed(0)}%`}
                  />
                  <ResourceMeter
                    label="电池"
                    value={resourceMetrics.battery.level}
                    max={1}
                    status={resourceMetrics.battery.status}
                    icon={Battery}
                    format={() => `${(resourceMetrics.battery.level * 100).toFixed(0)}%${resourceMetrics.battery.charging ? ' ⚡' : ''}`}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <FeatureList
                title="核心功能"
                features={CORE_FEATURES}
                enabledIds={enabledFeatureIds}
              />
              <FeatureList
                title="增强功能"
                features={ENHANCED_FEATURES}
                enabledIds={enabledFeatureIds}
              />
              <FeatureList
                title="可选功能"
                features={OPTIONAL_FEATURES}
                enabledIds={enabledFeatureIds}
              />
            </div>

            {alerts.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    最近警报
                  </span>
                  <button
                    onClick={clearAlerts}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    清除全部
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {alerts.slice(-5).reverse().map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                        alert.status === 'critical'
                          ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={12} />
                        <span>{alert.message}</span>
                      </div>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="p-0.5 hover:bg-black/10 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function ResourceStatusBadge({ className = '' }: { className?: string }) {
  const { mode, resourceStatus } = useLowPerformanceMode();

  const getStatusConfig = () => {
    if (mode === 'low') {
      return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        label: '低性能模式',
        icon: BatteryLow,
      };
    }
    if (resourceStatus !== 'normal') {
      return {
        bg: resourceStatus === 'critical' ? 'bg-red-100 dark:bg-red-500/20' : 'bg-yellow-100 dark:bg-yellow-500/20',
        text: resourceStatus === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400',
        label: resourceStatus === 'critical' ? '资源严重' : '资源警告',
        icon: AlertTriangle,
      };
    }
    return {
      bg: 'bg-green-100 dark:bg-green-500/20',
      text: 'text-green-600 dark:text-green-400',
      label: '高性能模式',
      icon: Activity,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <Icon size={12} />
      <span>{config.label}</span>
    </div>
  );
}

export default ResourceMonitorPanel;
