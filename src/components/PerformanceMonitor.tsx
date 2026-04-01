import React, { useEffect, useState } from 'react';
import { usePerformanceMetrics, formatBytes, formatTime } from '../hooks/usePerformanceMetrics';
import { Activity, Clock, Gauge, Zap, Eye, X } from 'lucide-react';

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onClose?: () => void;
  defaultExpanded?: boolean;
}

interface ResourceInfo {
  name: string;
  size: number;
  type: string;
  loadTime: number;
}

export default function PerformanceMonitor({
  isVisible = true,
  onClose,
  defaultExpanded = false
}: PerformanceMonitorProps) {
  const metrics = usePerformanceMetrics();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const newResources: ResourceInfo[] = entries
        .filter((entry): entry is PerformanceResourceTiming => entry.entryType === 'resource')
        .map((entry) => ({
          name: entry.name.split('/').pop() || entry.name,
          size: entry.transferSize,
          type: entry.initiatorType,
          loadTime: entry.responseEnd - entry.startTime,
        }))
        .filter(r => r.size > 0)
        .slice(-20);

      setResources(newResources);
    });

    try {
      observer.observe({ type: 'resource', buffered: true });
    } catch (e) {
      console.warn('Resource timing observation failed');
    }

    return () => observer.disconnect();
  }, []);

  if (!isVisible) return null;

  const totalResourceSize = resources.reduce((acc, r) => acc + r.size, 0);

  return (
    <div
      className="fixed bottom-4 right-4 z-[var(--z-toast)] bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700/50 overflow-hidden transition-all duration-300"
      style={{ maxWidth: expanded ? '480px' : '320px' }}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-200">性能监控</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            {showDetails ? '隐藏详情' : '显示详情'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            {expanded ? '收起' : '展开'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<Clock className="w-4 h-4" />}
            label="首次内容绘制 (FCP)"
            value={metrics.fcp !== null ? formatTime(metrics.fcp) : '-'}
            status={metrics.fcp !== null && metrics.fcp < 2000 ? 'good' : metrics.fcp !== null && metrics.fcp < 4000 ? 'warning' : 'bad'}
          />
          <MetricCard
            icon={<Eye className="w-4 h-4" />}
            label="最大内容绘制 (LCP)"
            value={metrics.lcp !== null ? formatTime(metrics.lcp) : '-'}
            status={metrics.lcp !== null && metrics.lcp < 2500 ? 'good' : metrics.lcp !== null && metrics.lcp < 4000 ? 'warning' : 'bad'}
          />
          <MetricCard
            icon={<Zap className="w-4 h-4" />}
            label="首次输入延迟 (FID)"
            value={metrics.fid !== null ? formatTime(metrics.fid) : '-'}
            status={metrics.fid !== null && metrics.fid < 100 ? 'good' : metrics.fid !== null && metrics.fid < 300 ? 'warning' : 'bad'}
          />
          <MetricCard
            icon={<Gauge className="w-4 h-4" />}
            label="可交互时间 (TTI)"
            value={metrics.tti !== null ? formatTime(metrics.tti) : '-'}
            status={metrics.tti !== null && metrics.tti < 3500 ? 'good' : metrics.tti !== null && metrics.tti < 5000 ? 'warning' : 'bad'}
          />
        </div>

        <div className="pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">累计布局偏移 (CLS)</span>
            <span className={`font-medium ${
              metrics.cls < 0.1 ? 'text-green-400' : metrics.cls < 0.25 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {metrics.cls.toFixed(3)}
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="pt-3 border-t border-gray-700/50">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">资源加载</span>
              <span className="text-gray-300">{resources.length} 个文件 · {formatBytes(totalResourceSize)}</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {resources.slice(-10).reverse().map((resource, index) => (
                <div key={index} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-gray-800/50">
                  <span className="text-gray-400 truncate max-w-[200px]" title={resource.name}>
                    {resource.name}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {formatBytes(resource.size)} · {resource.loadTime.toFixed(0)}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 text-xs text-gray-500 text-center">
          仅开发环境显示 · 生产环境自动隐藏
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'bad';
}

function MetricCard({ icon, label, value, status }: MetricCardProps) {
  const statusColors = {
    good: 'text-green-400 bg-green-400/10',
    warning: 'text-yellow-400 bg-yellow-400/10',
    bad: 'text-red-400 bg-red-400/10',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
      <div className={`p-2 rounded-lg ${statusColors[status]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <p className={`text-lg font-semibold ${
          status === 'good' ? 'text-green-400' : status === 'warning' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {value}
        </p>
      </div>
    </div>
  );
}