import { Gauge, Activity, Zap } from 'lucide-react';
import { usePerformanceMode } from '../context/PerformanceModeContext';

interface ModeDisplayInfo {
  icon: typeof Gauge;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const modeDisplayConfig = {
  high: {
    icon: Zap,
    label: '高性能模式',
    description: '已启用全部性能优化功能',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-700/50',
  },
  low: {
    icon: Gauge,
    label: '低性能模式',
    description: '已禁用部分性能优化功能',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50 dark:bg-slate-900/20',
    borderColor: 'border-slate-200 dark:border-slate-700/50',
  },
};

export function PerformanceModeIndicator({ className = '' }: { className?: string }) {
  const { mode } = usePerformanceMode();
  const config = modeDisplayConfig[mode];
  const IconComponent = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}
      role="status"
    >
      <IconComponent size={16} className={config.color} />
      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
}

export function PerformanceModeBadge({ className = '' }: { className?: string }) {
  const { mode } = usePerformanceMode();
  const config = modeDisplayConfig[mode];
  const IconComponent = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
        ${config.bgColor} ${config.color} ${className}
      `}
      role="status"
    >
      <IconComponent size={12} />
      <span>{config.label}</span>
    </div>
  );
}

export function PerformanceModeToggle({ className = '' }: { className?: string }) {
  const { isHighPerformance, setMode } = usePerformanceMode();

  const handleToggle = () => {
    const newMode = isHighPerformance ? 'low' : 'high';
    setMode(newMode);
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors
        ${isHighPerformance
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-600 dark:text-amber-400'
          : 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400'
        }
        ${className}
      `}
    >
      <Activity size={16} />
      <span className="text-sm font-medium">
        {isHighPerformance ? '高性能' : '低性能'}
      </span>
    </button>
  );
}
