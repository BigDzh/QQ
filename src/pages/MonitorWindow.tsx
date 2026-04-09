import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Cpu, HardDrive, Monitor as MonitorIcon, MemoryStick, Globe, Zap, Wifi, WifiOff, Clock, Activity, TrendingUp, TrendingDown, Minus, RefreshCw, Minimize2, X, Pin, PinOff, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { usePerformanceMode } from '../context/PerformanceModeContext';
import { useLowPerformanceMode } from '../context/LowPerformanceModeContext';
import FeatureSwitchPanel from '../components/FeatureSwitchPanel';
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

export default function MonitorWindow() {
  const { isDark } = useTheme();
  const { isHighPerformance } = usePerformanceMode();
  const { features: allFeatures, isFeatureEnabled, getEffectiveFeatureState: contextGetEffectiveFeatureState, featureOverrides } = useLowPerformanceMode();
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
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showFeaturePanel, setShowFeaturePanel] = useState(false);
  const lastUpdateTime = useRef(performance.now());
  const cpuSamples = useRef<number[]>([]);

  const getEffectiveFeatureState = useCallback((feature: FeatureToggle) => {
    return contextGetEffectiveFeatureState(feature);
  }, [contextGetEffectiveFeatureState]);

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
    return { total: 256, used: 115 };
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

  const handleClose = useCallback(() => {
    window.electronAPI?.closeMonitorWindowIPC();
  }, []);

  const handleMinimize = useCallback(() => {
    window.electronAPI?.minimizeMonitorWindow();
  }, []);

  const handleToggleAlwaysOnTop = useCallback(() => {
    const newValue = !alwaysOnTop;
    setAlwaysOnTop(newValue);
    window.electronAPI?.toggleMonitorAlwaysOnTop(newValue);
  }, [alwaysOnTop]);

  const enabledCount = useMemo(() => {
    return allFeatures.filter(f => getEffectiveFeatureState(f)).length;
  }, [allFeatures, getEffectiveFeatureState]);

  const cpuHistory = history.map(h => h.cpu);
  const memoryHistory = history.map(h => h.memory);

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'dark bg-gray-800' : 'bg-gray-50'} overflow-hidden`}>
      <div className="flex items-center justify-between px-3 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
        <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MonitorIcon size={14} />
          系统监控
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleAlwaysOnTop}
            className={`p-1.5 rounded-lg transition-colors ${alwaysOnTop ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title={alwaysOnTop ? '取消置顶' : '置顶窗口'}
          >
            {alwaysOnTop ? <Pin size={14} /> : <PinOff size={14} />}
          </button>
          <button
            onClick={handleManualRefresh}
            className={`p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
            title="刷新"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="最小化"
          >
            <Minimize2 size={14} />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500"
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
              {isHighPerformance ? <Zap size={14} className="text-amber-500" /> : <Activity size={14} className="text-slate-500" />}
              {isHighPerformance ? '高性能' : '低性能'}模式
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFeaturePanel(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
                title="打开功能开关控制面板"
              >
                <Settings size={12} />
              </button>
              <button
                onClick={() => setShowFeatures(!showFeatures)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                  showFeatures
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Globe size={12} />
                {enabledCount}/{allFeatures.length}
              </button>
            </div>
          </div>

          {showFeatures && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 space-y-2 max-h-40 overflow-y-auto">
              {allFeatures.map(feature => {
                const isEnabled = getEffectiveFeatureState(feature);
                const hasOverride = featureOverrides[feature.id] !== undefined;
                const categoryColors = {
                  core: 'text-amber-500',
                  enhanced: 'text-blue-500',
                  optional: 'text-purple-500'
                };
                return (
                  <div key={feature.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center ${isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      {isEnabled && <span className="text-white">✓</span>}
                    </div>
                    <span className={isEnabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}>
                      {feature.name}
                    </span>
                    {hasOverride && (
                      <span className="text-xs text-cyan-400">(手动)</span>
                    )}
                    <span className={`ml-auto ${categoryColors[feature.category]}`}>
                      {feature.category === 'core' ? '核心' : feature.category === 'enhanced' ? '增强' : '可选'}
                    </span>
                  </div>
                );
              })}
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
            <DetailItem label="帧率(FPS)" value={currentFps} trend={getTrend(history, 'fps')} />
            <DetailItem label="网络" value={network.effectiveType.toUpperCase()} />
            <DetailItem label="CPU核心" value={navigator.hardwareConcurrency || '未知'} />
            <DetailItem label="延迟(RTT)" value={network.rtt} unit="ms" />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 space-y-1">
          <DetailItem label="内存总量" value={`${formatNumber(resources.memoryTotal)} GB`} />
          <DetailItem label="内存使用" value={`${formatNumber(resources.memoryUsed)} GB`} />
          <DetailItem label="磁盘总量" value={`${formatNumber(resources.diskTotal)} GB`} />
          <DetailItem label="磁盘使用" value={`${formatNumber(resources.diskUsed)} GB`} />
        </div>
      </div>

      <FeatureSwitchPanel
        isVisible={showFeaturePanel}
        onClose={() => setShowFeaturePanel(false)}
      />
    </div>
  );
}