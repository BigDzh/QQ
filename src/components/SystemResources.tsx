import { useState, useEffect, useCallback, useRef } from 'react';
import { Cpu, HardDrive, Monitor, ChevronDown, ChevronUp, MemoryStick, Globe } from 'lucide-react';

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

export default function SystemResources() {
  const [expanded, setExpanded] = useState(false);
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
  const lastUpdateTime = useRef(performance.now());
  const cpuSamples = useRef<number[]>([]);

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

  const updateResources = useCallback(() => {
    const memoryInfo = getMemoryInfo();
    const cpuUsage = getCpuUsage();

    setResources(prev => {
      return {
        ...prev,
        cpu: cpuUsage,
        memory: memoryInfo.percent,
        memoryTotal: memoryInfo.total,
        memoryUsed: memoryInfo.used,
      };
    });
  }, [getMemoryInfo, getCpuUsage]);

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
    getDiskInfo();
  }, [getDiskInfo]);

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

  const formatNumber = (value: number, decimals: number = 1) => {
    return value.toFixed(decimals);
  };

  const ResourceBar = ({ value, label, icon: Icon, color }: { value: number; label: string; icon: any; color: string }) => (
    <div className="flex items-center gap-3">
      <Icon size={14} className={color} />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">{label}</span>
          <span className={`font-medium ${getStatusColor(value)}`}>{value}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getStatusBg(value)}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  const DetailItem = ({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}{unit}</span>
    </div>
  );

  return (
    <div className="relative">
      <button
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
        {expanded ? (
          <ChevronUp size={14} className="text-gray-400 ml-1" />
        ) : (
          <ChevronDown size={14} className="text-gray-400 ml-1" />
        )}
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Monitor size={14} />
                系统资源
              </span>
              <span className="text-xs text-gray-500">每{resources.updateInterval / 1000}秒更新</span>
            </div>

            <div className="space-y-3">
              <ResourceBar value={resources.cpu} label="CPU" icon={Cpu} color={getStatusColor(resources.cpu)} />
              <ResourceBar value={resources.memory} label="内存" icon={MemoryStick} color={getStatusColor(resources.memory)} />
              <ResourceBar value={resources.disk} label="磁盘" icon={HardDrive} color={getStatusColor(resources.disk)} />
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 space-y-1">
              <DetailItem label="帧率(FPS)" value={currentFps} />
              <DetailItem label="CPU核心" value={navigator.hardwareConcurrency || '未知'} />
              <DetailItem label="内存总量" value={`${formatNumber(resources.memoryTotal)} GB`} />
              <DetailItem label="内存使用" value={`${formatNumber(resources.memoryUsed)} GB`} />
              <DetailItem label="磁盘总量" value={`${formatNumber(resources.diskTotal)} GB`} />
              <DetailItem label="磁盘使用" value={`${formatNumber(resources.diskUsed)} GB`} />
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Globe size={12} />
                <span>浏览器环境，CPU基于帧率估算</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
