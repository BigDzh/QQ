import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Cpu, HardDrive, Monitor, ChevronDown, ChevronUp, MemoryStick, Globe, Zap, Gauge, Wifi, WifiOff, Clock, Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Bell, BellOff, BarChart3, Check, ChevronRight, X, AlertTriangle } from 'lucide-react';
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
  const [isHovered, setIsHovered] = useState(false);
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
    if (value < 60) return { text: 'text-emerald-500', bg: 'bg-emerald-500', glow: 'shadow-emerald-500/50' };
    if (value < 85) return { text: 'text-amber-500', bg: 'bg-amber-500', glow: 'shadow-amber-500/50' };
    return { text: 'text-rose-500', bg: 'bg-rose-500', glow: 'shadow-rose-500/50' };
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return { text: 'text-emerald-500', bg: 'bg-emerald-500' };
    if (fps >= 30) return { text: 'text-amber-500', bg: 'bg-amber-500' };
    return { text: 'text-rose-500', bg: 'bg-rose-500' };
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
      case 'up': return <TrendingUp size={12} className="text-rose-500" />;
      case 'down': return <TrendingDown size={12} className="text-emerald-500" />;
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
    value: number; label: string; icon: any; color: { text: string; bg: string; glow?: string };
    trend?: 'up' | 'down' | 'stable'; historyData?: number[];
  }) => {
    const chartColor = color.text.replace('text-', '');
    return (
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg ${color.bg}/10 shrink-0`}>
        <Icon size={14} className={color.text} />
      </div>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-300">{label}</span>
            <div className="flex items-center gap-1">
              {trend && getTrendIcon(trend)}
              <span className={`font-semibold ${color.text}`}>{value}%</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${color.bg} ${color.glow ? `shadow-[0_0_6px_var(--tw-shadow-color)]` : ''}`}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
  };

  const DetailItem = ({ label, value, unit = '', trend, highlight }: { label: string; value: string | number; unit?: string; trend?: 'up' | 'down' | 'stable'; highlight?: boolean }) => (
    <div className={`flex justify-between items-center py-2 ${highlight ? 'px-2 -mx-2 rounded-lg bg-blue-50/50 dark:bg-blue-500/10' : 'border-b border-gray-100 dark:border-gray-700/50'} last:border-0 transition-colors`}>
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-1.5">
        {trend && getTrendIcon(trend)}
        <span className={`text-sm font-medium ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{value}{unit}</span>
      </div>
    </div>
  );

  const handleTogglePerformanceMode = useCallback(() => {
    const newMode = isHighPerformance ? 'low' : 'high';
    setMode(newMode);

    const message = newMode === 'low'
      ? '已切换至低性能模式'
      : '已切换至高性能模式';

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
  const cpuColor = getStatusColor(resources.cpu);
  const memColor = getStatusColor(resources.memory);
  const diskColor = getStatusColor(resources.disk);
  const fpsColor = getFpsColor(currentFps);

  return (
    <div className="relative flex items-center gap-2 z-[var(--z-toast)]">
      <button
        onClick={handleTogglePerformanceMode}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
          isHighPerformance
            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30'
            : 'bg-gray-100 dark:bg-gray-800 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title={isHighPerformance ? '高性能模式 - 点击切换' : '低性能模式 - 点击切换'}
      >
        {isHighPerformance ? (
          <Zap size={14} className="text-amber-500 animate-pulse" />
        ) : (
          <Gauge size={14} className="text-gray-400" />
        )}
        <span className={`text-xs font-medium transition-colors ${
          isHighPerformance ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {isHighPerformance ? '高性能' : '低性能'}
        </span>
      </button>

      <button
        ref={triggerButtonRef}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-300 ${
          expanded
            ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/40 shadow-lg shadow-blue-500/10'
            : isHovered
              ? 'bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 shadow-md'
              : 'bg-white/60 dark:bg-gray-800/60 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${cpuColor.bg}/10 transition-colors`}>
            <Cpu size={13} className={cpuColor.text} />
            <span className={`text-xs font-bold ${cpuColor.text}`}>{resources.cpu}%</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${memColor.bg}/10 transition-colors`}>
            <MemoryStick size={13} className={memColor.text} />
            <span className={`text-xs font-bold ${memColor.text}`}>{resources.memory}%</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${diskColor.bg}/10 transition-colors`}>
            <HardDrive size={13} className={diskColor.text} />
            <span className={`text-xs font-bold ${diskColor.text}`}>{resources.disk}%</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${fpsColor.bg}/10 transition-colors`}>
            <Activity size={13} className={fpsColor.text} />
            <span className={`text-xs font-bold ${fpsColor.text}`}>{currentFps}</span>
          </div>
        </div>
        <div className={`ml-1 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          {expanded ? (
            <ChevronUp size={14} className="text-blue-600 dark:text-blue-400" />
          ) : (
            <ChevronDown size={14} className="text-gray-600 dark:text-gray-300" />
          )}
        </div>
      </button>

      {expanded && createPortal(
        <div
          className="fixed w-80 max-w-[calc(100vw-2rem)] bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            top: `${panelPosition.top}px`,
            right: `${panelPosition.right}px`,
            zIndex: 9999
          }}
          data-system-monitor-panel="true"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5" />
            <div className="relative space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30">
                    <Monitor size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">系统监控</span>
                    <p className="text-xs text-gray-500 dark:text-gray-300">实时性能数据</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                    <Clock size={12} />
                    <span>{uptime}</span>
                  </div>
                  <button
                    onClick={handleManualRefresh}
                    className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                    title="刷新数据"
                  >
                    <RefreshCw size={14} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => setExpanded(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="关闭"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${network.online ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  {network.online ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span className="font-medium">{network.online ? '在线' : '离线'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <BarChart3 size={12} />
                  <span>每{resources.updateInterval / 1000}秒</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    {isHighPerformance ? (
                      <Zap size={14} className="text-amber-500" />
                    ) : (
                      <Gauge size={14} className="text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">性能模式</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isHighPerformance ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {isHighPerformance ? '高' : '低'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowFeatures(!showFeatures)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                      showFeatures
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Globe size={12} />
                    <span>功能</span>
                    <span className="font-medium">{enabledCount}/{allFeatures.length}</span>
                    <ChevronRight size={12} className={`transition-transform ${showFeatures ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => !isHighPerformance && handleTogglePerformanceMode()}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      isHighPerformance
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-amber-400 dark:hover:border-amber-500'
                    }`}
                  >
                    高性能
                  </button>
                  <button
                    onClick={() => isHighPerformance && handleTogglePerformanceMode()}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      !isHighPerformance
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 dark:from-gray-500 dark:to-gray-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    低性能
                  </button>
                </div>

                {showFeatures && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {!isHighPerformance && (
                      <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                        <div className="text-xs text-amber-700 dark:text-amber-300">
                          <span className="font-medium">低性能模式已禁用以下功能：</span>
                          <span className="ml-1">
                            {ENHANCED_FEATURES.filter(f => !f.enabledInLowMode).map(f => f.name).join('、')}
                            {OPTIONAL_FEATURES.filter(f => !f.enabledInLowMode).length > 0 && (
                              <span>、{OPTIONAL_FEATURES.filter(f => !f.enabledInLowMode).map(f => f.name).join('、')}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        核心功能始终启用，其他可自定义
                      </span>
                      {Object.keys(featureOverrides).length > 0 && (
                        <button
                          onClick={handleResetFeatures}
                          className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                        >
                          重置
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5">
                          <Zap size={10} />
                          <span>核心功能</span>
                        </div>
                        <div className="space-y-1">
                          {CORE_FEATURES.map(feature => (
                            <div key={feature.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                              <Check size={12} className="text-emerald-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{feature.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 mb-1.5">
                          <Activity size={10} />
                          <span>增强功能</span>
                        </div>
                        <div className="space-y-1">
                          {ENHANCED_FEATURES.map(feature => {
                            const isEnabled = getEffectiveFeatureState(feature);
                            const isOverridden = featureOverrides[feature.id] !== undefined;
                            const isDisabledByMode = !isHighPerformance && !feature.enabledInLowMode;
                            return (
                              <div
                                key={feature.id}
                                className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                                  isEnabled ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-gray-100/50 dark:bg-gray-800/30'
                                }`}
                              >
                                <button
                                  onClick={() => handleFeatureToggle(feature.id, !isEnabled)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    isEnabled
                                      ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-500/50'
                                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                  }`}
                                >
                                  {isEnabled && <Check size={10} />}
                                </button>
                                <span className={`text-sm flex-1 ${isEnabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {feature.name}
                                </span>
                                {isDisabledByMode && !isOverridden && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">低性能关闭</span>
                                )}
                                {isOverridden && (
                                  <span className="text-xs text-blue-400">已自定义</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 mb-1.5">
                          <BarChart3 size={10} />
                          <span>可选功能</span>
                        </div>
                        <div className="space-y-1">
                          {OPTIONAL_FEATURES.map(feature => {
                            const isEnabled = getEffectiveFeatureState(feature);
                            const isOverridden = featureOverrides[feature.id] !== undefined;
                            const isDisabledByMode = !isHighPerformance && !feature.enabledInLowMode;
                            return (
                              <div
                                key={feature.id}
                                className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                                  isEnabled ? 'bg-purple-50/50 dark:bg-purple-900/20' : 'bg-gray-100/50 dark:bg-gray-800/30'
                                }`}
                              >
                                <button
                                  onClick={() => handleFeatureToggle(feature.id, !isEnabled)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    isEnabled
                                      ? 'bg-purple-500 border-purple-500 text-white shadow-sm shadow-purple-500/50'
                                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                                  }`}
                                >
                                  {isEnabled && <Check size={10} />}
                                </button>
                                <span className={`text-sm flex-1 ${isEnabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {feature.name}
                                </span>
                                {isDisabledByMode && !isOverridden && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">低性能关闭</span>
                                )}
                                {!isDisabledByMode && (
                                  <span className="text-xs text-gray-400">{feature.resourceCost === 'high' ? '高' : feature.resourceCost === 'medium' ? '中' : '低'}</span>
                                )}
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

              <div className="space-y-2.5">
                <ResourceBar
                  value={resources.cpu}
                  label="CPU"
                  icon={Cpu}
                  color={cpuColor}
                  trend={getTrend(history, 'cpu')}
                  historyData={cpuHistory}
                />
                <ResourceBar
                  value={resources.memory}
                  label="内存"
                  icon={MemoryStick}
                  color={memColor}
                  trend={getTrend(history, 'memory')}
                  historyData={memoryHistory}
                />
                <ResourceBar
                  value={resources.disk}
                  label="磁盘"
                  icon={HardDrive}
                  color={diskColor}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/30">
                <DetailItem
                  label="帧率"
                  value={currentFps}
                  trend={getTrend(history, 'fps')}
                  highlight={currentFps < 30}
                />
                <DetailItem
                  label="网络"
                  value={network.effectiveType.toUpperCase()}
                />
                <DetailItem
                  label="CPU核心"
                  value={navigator.hardwareConcurrency || '?'}
                />
                <DetailItem
                  label="延迟"
                  value={network.rtt}
                  unit="ms"
                  highlight={network.rtt > 200}
                />
              </div>

              <div className="flex gap-2 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/30">
                <DetailItem
                  label="内存"
                  value={`${formatNumber(resources.memoryUsed)} / ${formatNumber(resources.memoryTotal)} GB`}
                />
                <DetailItem
                  label="磁盘"
                  value={`${formatNumber(resources.diskUsed)} / ${formatNumber(resources.diskTotal)} GB`}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Globe size={12} />
                  <span>浏览器环境</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowAlertConfig(true)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                      getAlertConfig().enabled
                        ? 'text-emerald-500 hover:bg-emerald-500/10'
                        : 'text-gray-400 hover:bg-gray-500/10'
                    }`}
                    title="告警设置"
                  >
                    {getAlertConfig().enabled ? <Bell size={12} /> : <BellOff size={12} />}
                  </button>
                  <button
                    onClick={() => setShowStatsPanel(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:bg-gray-500/10 transition-colors"
                    title="性能统计"
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
