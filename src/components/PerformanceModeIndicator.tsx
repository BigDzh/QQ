import { useEffect, useState, useCallback } from 'react';
import { Gauge, Activity, Zap, Cpu } from 'lucide-react';
import { usePerformanceMode, type PerformanceMode } from '../context/PerformanceModeContext';
import { useToast } from './Toast';

interface ModeIndicatorProps {
  showOnChange?: boolean;
  autoHideDelay?: number;
}

interface ModeDisplayInfo {
  icon: typeof Gauge;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const modeDisplayConfig: Record<PerformanceMode, ModeDisplayInfo> = {
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

export function PerformanceModeIndicator({ showOnChange = true, autoHideDelay = 3000 }: ModeIndicatorProps) {
  const { mode, isHighPerformance } = usePerformanceMode();
  const { showToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const config = modeDisplayConfig[mode];
  const IconComponent = config.icon;

  const handleModeChange = useCallback((newMode: PerformanceMode) => {
    if (!showOnChange) return;

    setIsAnimating(true);
    setIsVisible(true);

    const message = newMode === 'low'
      ? '已切换至低性能模式，部分优化功能已禁用'
      : '已切换至高性能模式，已启用全部优化功能';

    showToast(message, newMode === 'low' ? 'warning' : 'success');

    if (autoHideDelay > 0) {
      setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => setIsVisible(false), 300);
      }, autoHideDelay);
    }
  }, [showOnChange, autoHideDelay, showToast]);

  useEffect(() => {
    if (isVisible && isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isAnimating]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-4 left-4 z-[var(--z-toast)]
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${config.bgColor} ${config.borderColor}
        transition-all duration-300 ease-out
        ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      role="status"
      aria-live="polite"
    >
      <div className={`${config.color}`}>
        <IconComponent size={20} />
      </div>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {config.description}
        </span>
      </div>
    </div>
  );
}

export function PerformanceModeBadge({ className = '' }: { className?: string }) {
  const { mode, isHighPerformance } = usePerformanceMode();
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
  const { mode, isHighPerformance, setMode } = usePerformanceMode();
  const { showToast } = useToast();

  const handleToggle = useCallback(() => {
    const newMode = isHighPerformance ? 'low' : 'high';
    setMode(newMode);

    const message = newMode === 'low'
      ? '已关闭高性能模式，系统将切换至低性能模式'
      : '已开启高性能模式，系统将启用全部优化功能';

    showToast(message, newMode === 'low' ? 'warning' : 'success');
  }, [isHighPerformance, setMode, showToast]);

  return (
    <button
      onClick={handleToggle}
      className={`
        inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-200
        ${isHighPerformance
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
        }
        ${className}
      `}
      aria-pressed={isHighPerformance}
      aria-label={isHighPerformance ? '切换到低性能模式' : '切换到高性能模式'}
    >
      {isHighPerformance ? (
        <>
          <Zap size={16} className="text-amber-500" />
          <span>高性能</span>
        </>
      ) : (
        <>
          <Gauge size={16} className="text-slate-500" />
          <span>低性能</span>
        </>
      )}
    </button>
  );
}

export function PerformanceModeStatusBar({ className = '' }: { className?: string }) {
  const { mode, isHighPerformance } = usePerformanceMode();
  const config = modeDisplayConfig[mode];
  const IconComponent = config.icon;

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded
        ${config.bgColor} ${config.borderColor} border
        ${className}
      `}
      role="status"
    >
      <IconComponent size={14} className={config.color} />
      <span className={`text-xs font-medium ${config.color}`}>
        {isHighPerformance ? '高性能' : '低性能'}
      </span>
      <span className="text-xs text-slate-400">
        {isHighPerformance ? '|' : '|'}
      </span>
      <Activity size={14} className="text-slate-400" />
      <span className="text-xs text-slate-500">
        {isHighPerformance ? '已启用优化' : '已禁用优化'}
      </span>
    </div>
  );
}

export function usePerformanceModeNotifier() {
  const { mode } = usePerformanceMode();
  const { showToast } = useToast();
  const previousModeRef = { current: mode };

  useEffect(() => {
    if (previousModeRef.current !== mode && previousModeRef.current !== undefined) {
      const newMode = mode;
      const message = newMode === 'low'
        ? '⚠️ 已切换至低性能模式 - 部分功能已禁用'
        : '✅ 已切换至高性能模式 - 全部功能已启用';

      const toastType = newMode === 'low' ? 'warning' : 'success';
      showToast(message, toastType);
    }
    previousModeRef.current = mode;
  }, [mode, showToast]);

  return { previousMode: previousModeRef.current };
}

export default PerformanceModeIndicator;
