import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Cpu, HardDrive, Monitor, ChevronDown, ChevronUp, MemoryStick, Globe, Zap, Gauge, Wifi, WifiOff, Clock, Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Bell, BellOff, BarChart3, Check, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { usePerformanceMode } from '../context/PerformanceModeContext';
import { useLowPerformanceMode } from '../context/LowPerformanceModeContext';
import { useToast } from './Toast';
import { usePerformanceAlert, getAlertConfig } from '../hooks/usePerformanceAlert';
import { AlertConfigPanel } from './AlertConfigPanel';
import { PerformanceStatsPanel } from './PerformanceStatsPanel';
import { CORE_FEATURES, ENHANCED_FEATURES, OPTIONAL_FEATURES } from '../types/lowPerformanceMode';
import type { FeatureToggle } from '../types/lowPerformanceMode';

interface ResourceData {
  cpu: number;
  memory: number;
  memoryTotal: number;
  memoryUsed: number;
  disk: number;
  diskTotal: number;
  diskUsed: number;
  fps: number;
  updateInterval: number;
}

interface NetworkStatus {
  online: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

interface HistoryPoint {
  timestamp: number;
  cpu: number;
  memory: number;
  fps: number;
}

const MAX_HISTORY = 20;

export default function SystemResources() {
  const [expanded, setExpanded] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const { isHighPerformance, setMode } = usePerformanceMode();
  const { showToast } = useToast();
  const { isDark } = useTheme();
  const { features: allFeatures, isFeatureEnabled } = useLowPerformanceMode();
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, boolean>>({});
  const [resources, setResources] = useState<ResourceData>({
    cpu: 0,
    memory: 0,
    memoryTotal: 0,
    memoryUsed: 0,
    disk: 0,
    diskTotal: 0,
    diskUsed: 0,
    fps: 60,
    updateInterval: 3000,
  });
  const [currentFps, setCurrentFps] = useState(60);
  const [network, setNetwork] = useState<NetworkStatus>({
    online: typeof navigator.onLine !== 'undefined' ? navigator.onLine : true,
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
  });
  const [startTime] = useState(Date.now());
  const [uptime, setUptime] = useState('0分钟');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const lastUpdateTime = useRef(performance.now());
  const cpuSamples = useRef<number[]>([]);

  usePerformanceAlert(
    { cpu: resources.cpu, memory: resources.memory, disk: resources.disk, fps: currentFps },
    isHighPerformance
  );

  const getMemoryInfo = useCallback(() => {
    const memory = (performance as any).memory;
    if (memory) {
      const totalGB = memory.jsHeapSizeLimit / (1024 * 1024 * 1024);
      const usedGB = memory.usedJSHeapSize / (1024 * 1024 * 1024);
      const usedPercent = (usedGB / totalGB) * 100;
      return {
        total: Math.round(totalGB * 100) / 100,
        used: Math.round(usedGB * 100) / 100,
        percent: Math.round(usedPercent),
      };
    }
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const totalGB = deviceMemory;
    const usedGB = totalGB * 0.35;
    return {
      total: totalGB,
      used: Math.round(usedGB * 100) / 100,
      percent: 35,
    };
  }, []);

  const getCpuUsage = useCallback(() => {
    const now = performance.now();
    const timeDiff = now - lastUpdateTime.current;
    lastUpdateTime.current = now;

    const baseLoad = 15;
    const timeLoad = Math.min(timeDiff / 100, 40);

    let load = baseLoad + timeLoad;

    if (currentFps < 30) {
      load += 20;
    } else if (currentFps < 50) {
      load += 10;
    }

    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency > 4) {
      load *= 0.85;
    }

    cpuSamples.current.push(load);
    if (cpuSamples.current.length > 5) {
      cpuSamples.current.shift();
    }

    const avgLoad = cpuSamples.current.reduce((a, b) => a + b, 0) / cpuSamples.current.length;

    return Math.min(Math.max(Math.round(avgLoad), 5), 95);
  }, [currentFps]);

  const getDiskInfo = useCallback(() => {
    if ('storage' in navigator && 'estimate' in navigator) {
      (navigator as any).storage.estimate().then((estimate: any) => {
        if (estimate) {
          const totalGB = (estimate.quota || 256 * 1024 * 1024 * 1024) / (1024 * 1024 * 1024);
          const usedGB = ((estimate.quota || 0) - (estimate.usage || 0)) / (1024 * 1024 * 1024);
          setResources(prev => ({
            ...prev,
            disk: Math.round(((totalGB - usedGB) / totalGB) * 100),
            diskTotal: Math.round(totalGB * 10) / 10,
            diskUsed: Math.round((totalGB - usedGB) * 10) / 10,
          }));
        }
      });
    }
    return {
      total: 256,
      used: 115,
    };
  }, []);

  const getNetworkInfo = useCallback((): NetworkStatus => {
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    if (connection) {
      return {
        online: navigator.onLine,
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 50,
      };
    }
    return {
      online: navigator.onLine,
      effectiveType: 'unknown',
      downlink: 10,
      rtt: 50,
    };
  }, []);

  const updateResources = useCallback(() => {
    const memoryInfo = getMemoryInfo();
    const cpuUsage = getCpuUsage();

    setResources(prev => {
      const newResources = {
        ...prev,
        cpu: cpuUsage,
        memory: memoryInfo.percent,
        memoryTotal: memoryInfo.total,
        memoryUsed: memoryInfo.used,
      };

      setHistory(prevHistory => {
        const newPoint: HistoryPoint = {
          timestamp: Date.now(),
          cpu: cpuUsage,
          memory: memoryInfo.percent,
          fps: currentFps,
        };
        const newHistory = [...prevHistory, newPoint].slice(-MAX_HISTORY);
        return newHistory;
      });

      return newResources;
    });
  }, [getMemoryInfo, getCpuUsage, currentFps]);

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    updateResources();
    getDiskInfo();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [updateResources, getDiskInfo]);

  useEffect(() => {
    const handleOnline = () => setNetwork(prev => ({ ...prev, online: true }));
    const handleOffline = () => setNetwork(prev => ({ ...prev, online: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    updateResources();
    const interval = setInterval(updateResources, resources.updateInterval);
    return () => clearInterval(interval);
  }, [updateResources, resources.updateInterval]);

  useEffect(() => {
    let animationId: number;
    let lastFrameTime = performance.now();
    let frameCount = 0;

    const measureFps = (currentTime: number) => {
      frameCount++;
      if (currentTime - lastFrameTime >= 1000) {
        setCurrentFps(frameCount);
        frameCount = 0;
        lastFrameTime = currentTime;
      }
      animationId = requestAnimationFrame(measureFps);
    };

    animationId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const networkInfo = getNetworkInfo();
    setNetwork(networkInfo);
  }, [getNetworkInfo]);

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (connection) {
      const handleChange = () => setNetwork(getNetworkInfo());
      connection.addEventListener('change', handleChange);
      return () => connection.removeEventListener('change', handleChange);
    }
  }, [getNetworkInfo]);

  useEffect(() => {
    const updateUptime = () => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setUptime(`${days}天${hours % 24}小时`);
      } else if (hours > 0) {
        setUptime(`${hours}小时${minutes % 60}分钟`);
      } else {
        setUptime(`${minutes}分钟`);
      }
    };

    updateUptime();
    const interval = setInterval(updateUptime, 60000);
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (expanded && triggerButtonRef.current) {
      const rect = triggerButtonRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [expanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!expanded) return;

      const target = event.target as Node;
      const panel = document.querySelector('[data-system-monitor-panel="true"]');
      const trigger = triggerButtonRef.current;

      if (panel && panel.contains(target)) return;
      if (trigger && trigger.contains(target)) return;

      setExpanded(false);
      setShowFeatures(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  const getStatusColor = (value: number) => {
    if (value < 60) return 'text-green-500';
    if (value < 85) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBg = (value: number) => {
    if (value < 60) return 'bg-green-500';
    if (value < 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrend = (points: HistoryPoint[], key: 'cpu' | 'memory' | 'fps') => {
    if (points.length < 2) return 'stable';
    const recent = points.slice(-5);
    const first = recent[0][key];
    const last = recent[recent.length - 1][key];
    const diff = last - first;
    if (Math.abs(diff) < 3) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp size={12} className="text-red-500" />;
      case 'down': return <TrendingDown size={12} className="text-green-500" />;
      default: return <Minus size={12} className="text-gray-400" />;
    }
  };

  const formatNumber = (value: number, decimals: number = 1) => {
    return value.toFixed(decimals);
  };

  const MiniTrendChart = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length < 2) return null;
    const max = Math.max(...data, 100);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * 60,
      y: 20 - ((v - min) / range) * 18,
    }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <svg width="60" height="24" className="inline-block">
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const ResourceBar = ({ value, label, icon: Icon, color, trend, historyData }: {
    value: number; label: string; icon: any; color: string;
    trend?: 'up' | 'down' | 'stable'; historyData?: number[];
  }) => (
    <div className="flex items-center gap-3">
      <Icon size={14} className={color} />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">{label}</span>
          <div className="flex items-center gap-1">
            {trend && getTrendIcon(trend)}
            <span className={`font-medium ${getStatusColor(value)}`}>{value}%</span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getStatusBg(value)}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
      {historyData && historyData.length > 2 && (
        <MiniTrendChart data={historyData} color={getStatusColor(value).replace('text-', 'var(--')} />
      )}
    </div>
  );

  const DetailItem = ({ label, value, unit = '', trend }: { label: string; value: string | number; unit?: string; trend?: 'up' | 'down' | 'stable' }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1">
        {trend && getTrendIcon(trend)}
        <span className="text-sm font-medium text-gray-900 dark:text-white">{value}{unit}</span>
      </div>
    </div>
  );

  const handleTogglePerformanceMode = useCallback(() => {
    const newMode = isHighPerformance ? 'low' : 'high';
    setMode(newMode);

    const message = newMode === 'low'
      ? '已切换至低性能模式，部分优化功能已禁用'
      : '已切换至高性能模式，已启用全部优化功能';

    showToast(message, newMode === 'low' ? 'warning' : 'success');
  }, [isHighPerformance, setMode, showToast]);

  const getEffectiveFeatureState = useCallback((feature: FeatureToggle) => {
    if (featureOverrides[feature.id] !== undefined) {
      return featureOverrides[feature.id];
    }
    return isFeatureEnabled(feature.id);
  }, [featureOverrides, isFeatureEnabled]);

  const handleFeatureToggle = useCallback((featureId: string, enabled: boolean) => {
    setFeatureOverrides(prev => ({
      ...prev,
      [featureId]: enabled
    }));
    const feature = allFeatures.find(f => f.id === featureId);
    const featureName = feature?.name || featureId;
    showToast(
      enabled ? `已启用: ${featureName}` : `已禁用: ${featureName}`,
      enabled ? 'success' : 'info'
    );
  }, [allFeatures, showToast]);

  const handleResetFeatures = useCallback(() => {
    setFeatureOverrides({});
    showToast('已重置所有功能设置', 'info');
  }, [showToast]);

  const enabledCount = useMemo(() => {
    return allFeatures.filter(f => getEffectiveFeatureState(f)).length;
  }, [allFeatures, getEffectiveFeatureState]);

  const cpuHistory = history.map(h => h.cpu);
  const memoryHistory = history.map(h => h.memory);

  return (
    <div className="relative flex items-center gap-2 z-[var(--z-toast)]">
      <button
        onClick={handleTogglePerformanceMode}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          isHighPerformance
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        title={isHighPerformance ? '切换到低性能模式' : '切换到高性能模式'}
      >
        {isHighPerformance ? (
          <Zap size={14} className="text-amber-500" />
        ) : (
          <Gauge size={14} className="text-slate-500" />
        )}
        <span className="text-xs font-medium">
          {isHighPerformance ? '高性能' : '低性能'}
        </span>
      </button>

      <button
        ref={triggerButtonRef}
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
          expanded
            ? 'bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30'
            : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Cpu size={14} className={getStatusColor(resources.cpu)} />
          <span className={`text-xs font-medium ${getStatusColor(resources.cpu)}`}>{resources.cpu}%</span>
        </div>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        <div className="flex items-center gap-1.5">
          <MemoryStick size={14} className={getStatusColor(resources.memory)} />
          <span className={`text-xs font-medium ${getStatusColor(resources.memory)}`}>{resources.memory}%</span>
        </div>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        <div className="flex items-center gap-1.5">
          <HardDrive size={14} className={getStatusColor(resources.disk)} />
          <span className={`text-xs font-medium ${getStatusColor(resources.disk)}`}>{resources.disk}%</span>
        </div>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        <div className="flex items-center gap-1.5">
          <Activity size={14} className={getFpsColor(currentFps)} />
          <span className={`text-xs font-medium ${getFpsColor(currentFps)}`}>{currentFps}</span>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-gray-400 ml-1" />
        ) : (
          <ChevronDown size={14} className="text-gray-400 ml-1" />
        )}
      </button>

      {expanded && createPortal(
        <div
          className="fixed w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl p-4"
          style={{
            top: `${panelPosition.top}px`,
            right: `${panelPosition.right}px`,
            zIndex: 9999
          }}
          data-system-monitor-panel="true"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Monitor size={14} />
                系统监控
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">每{resources.updateInterval / 1000}秒</span>
                <button
                  onClick={handleManualRefresh}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
                  title="手动刷新"
                >
                  <RefreshCw size={14} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                {network.online ? (
                  <Wifi size={12} className="text-green-500" />
                ) : (
                  <WifiOff size={12} className="text-red-500" />
                )}
                <span className={network.online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {network.online ? '在线' : '离线'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">运行: {uptime}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {isHighPerformance ? <Zap size={14} className="text-amber-500" /> : <Gauge size={14} className="text-slate-500" />}
                  性能模式
                </span>
                <button
                  onClick={() => setShowFeatures(!showFeatures)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                    showFeatures
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <Globe size={12} />
                  功能 {enabledCount}/{allFeatures.length}
                  <ChevronRight size={12} className={`transition-transform ${showFeatures ? 'rotate-90' : ''}`} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => !isHighPerformance && handleTogglePerformanceMode()}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    isHighPerformance
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-white text-gray-600 dark:bg-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500'
                  }`}
                >
                  高性能
                </button>
                <button
                  onClick={() => isHighPerformance && handleTogglePerformanceMode()}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    !isHighPerformance
                      ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                      : 'bg-white text-gray-600 dark:bg-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500'
                  }`}
                >
                  低性能
                </button>
              </div>

              {showFeatures && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      核心功能始终启用，增强/可选功能可手动控制
                    </span>
                    {Object.keys(featureOverrides).length > 0 && (
                      <button
                        onClick={handleResetFeatures}
                        className="text-xs text-blue-500 hover:text-blue-600"
                      >
                        重置
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                        <Zap size={10} className="text-amber-500" />
                        核心功能 (始终启用)
                      </div>
                      <div className="space-y-1">
                        {CORE_FEATURES.map(feature => (
                          <div key={feature.id} className="flex items-center gap-2 py-1 px-2 rounded bg-white/50 dark:bg-gray-800/50">
                            <Check size={12} className="text-green-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{feature.name}</span>
                            <span className="text-xs text-gray-400">{feature.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                        <Activity size={10} className="text-blue-500" />
                        增强功能
                      </div>
                      <div className="space-y-1">
                        {ENHANCED_FEATURES.map(feature => {
                          const isEnabled = getEffectiveFeatureState(feature);
                          const isOverridden = featureOverrides[feature.id] !== undefined;
                          return (
                            <div
                              key={feature.id}
                              className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${
                                isEnabled ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-gray-100/50 dark:bg-gray-700/30'
                              }`}
                            >
                              <button
                                onClick={() => handleFeatureToggle(feature.id, !isEnabled)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isEnabled
                                    ? 'bg-blue-500 border-blue-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                }`}
                              >
                                {isEnabled && <Check size={10} />}
                              </button>
                              <span className={`text-sm flex-1 ${isEnabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                {feature.name}
                              </span>
                              {isOverridden && (
                                <span className="text-xs text-blue-400">已自定义</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                        <BarChart3 size={10} className="text-purple-500" />
                        可选功能
                      </div>
                      <div className="space-y-1">
                        {OPTIONAL_FEATURES.map(feature => {
                          const isEnabled = getEffectiveFeatureState(feature);
                          const isOverridden = featureOverrides[feature.id] !== undefined;
                          return (
                            <div
                              key={feature.id}
                              className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${
                                isEnabled ? 'bg-purple-50/50 dark:bg-purple-900/20' : 'bg-gray-100/50 dark:bg-gray-700/30'
                              }`}
                            >
                              <button
                                onClick={() => handleFeatureToggle(feature.id, !isEnabled)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isEnabled
                                    ? 'bg-purple-500 border-purple-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                                }`}
                              >
                                {isEnabled && <Check size={10} />}
                              </button>
                              <span className={`text-sm flex-1 ${isEnabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                {feature.name}
                              </span>
                              <span className="text-xs text-gray-400">{feature.resourceCost === 'high' ? '高消耗' : feature.resourceCost === 'medium' ? '中消耗' : '低消耗'}</span>
                              {isOverridden && (
                                <span className="text-xs text-purple-400">已自定义</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <ResourceBar
                value={resources.cpu}
                label="CPU"
                icon={Cpu}
                color={getStatusColor(resources.cpu)}
                trend={getTrend(history, 'cpu')}
                historyData={cpuHistory}
              />
              <ResourceBar
                value={resources.memory}
                label="内存"
                icon={MemoryStick}
                color={getStatusColor(resources.memory)}
                trend={getTrend(history, 'memory')}
                historyData={memoryHistory}
              />
              <ResourceBar
                value={resources.disk}
                label="磁盘"
                icon={HardDrive}
                color={getStatusColor(resources.disk)}
              />
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50">
              <div className="grid grid-cols-2 gap-2">
                <DetailItem
                  label="帧率(FPS)"
                  value={currentFps}
                  trend={getTrend(history, 'fps')}
                />
                <DetailItem
                  label="网络"
                  value={network.effectiveType.toUpperCase()}
                />
                <DetailItem
                  label="CPU核心"
                  value={navigator.hardwareConcurrency || '未知'}
                />
                <DetailItem
                  label="延迟(RTT)"
                  value={network.rtt}
                  unit="ms"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 space-y-1">
              <DetailItem
                label="内存总量"
                value={`${formatNumber(resources.memoryTotal)} GB`}
              />
              <DetailItem
                label="内存使用"
                value={`${formatNumber(resources.memoryUsed)} GB`}
              />
              <DetailItem
                label="磁盘总量"
                value={`${formatNumber(resources.diskTotal)} GB`}
              />
              <DetailItem
                label="磁盘使用"
                value={`${formatNumber(resources.diskUsed)} GB`}
              />
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Globe size={12} />
                  <span>浏览器环境</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAlertConfig(true)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                      getAlertConfig().enabled
                        ? 'text-green-500 hover:bg-green-500/10'
                        : 'text-gray-400 hover:bg-gray-500/10'
                    }`}
                  >
                    {getAlertConfig().enabled ? <Bell size={12} /> : <BellOff size={12} />}
                  </button>
                  <button
                    onClick={() => setShowStatsPanel(true)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                      isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <BarChart3 size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <AlertConfigPanel
        isOpen={showAlertConfig}
        onClose={() => setShowAlertConfig(false)}
      />

      <PerformanceStatsPanel
        isOpen={showStatsPanel}
        onClose={() => setShowStatsPanel(false)}
      />
    </div>
  );
}
