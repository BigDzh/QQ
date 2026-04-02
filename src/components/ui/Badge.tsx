import React from 'react';
import { useTheme } from '../../context/ThemeContext';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}: BadgeProps) {
  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  };

  const variantClasses = {
    default: isDark || isCosmos
      ? 'bg-gray-600/50 text-gray-100 border-gray-400/50' // 提升对比度
      : isAnime
      ? 'bg-pink-200 text-pink-900 border-pink-300' // 提升对比度
      : 'bg-gray-200 text-gray-800 border-gray-300', // 提升对比度
    success: isCyberpunk || isCosmos
      ? 'bg-emerald-500/40 text-emerald-100 border-emerald-400/60' // 提升背景透明度和文字亮度
      : isAnime
      ? 'bg-emerald-500/40 text-emerald-100 border-emerald-400/60'
      : isDark
      ? 'bg-green-500/40 text-green-100 border-green-400/60' // 优化深色模式对比度
      : 'bg-green-200 text-green-900 border-green-300', // 提升浅色模式对比度
    warning: isCyberpunk || isCosmos
      ? 'bg-amber-500/40 text-amber-100 border-amber-400/60'
      : isAnime
      ? 'bg-amber-500/40 text-amber-100 border-amber-400/60'
      : isDark
      ? 'bg-yellow-500/40 text-yellow-100 border-yellow-400/60'
      : 'bg-yellow-200 text-yellow-900 border-yellow-300',
    danger: isCyberpunk || isCosmos
      ? 'bg-rose-500/40 text-red-100 border-rose-400/60'
      : isAnime
      ? 'bg-rose-500/40 text-red-100 border-rose-400/60'
      : isDark
      ? 'bg-red-500/40 text-red-100 border-red-400/60'
      : 'bg-red-200 text-red-900 border-red-300',
    info: isCyberpunk || isCosmos
      ? 'bg-violet-500/40 text-violet-100 border-violet-400/60'
      : isAnime
      ? 'bg-fuchsia-500/40 text-fuchsia-100 border-fuchsia-400/60'
      : isDark
      ? 'bg-blue-500/40 text-blue-100 border-blue-400/60'
      : 'bg-blue-200 text-blue-900 border-blue-300',
    outline: 'bg-transparent border-current',
  };

  const dotColors = {
    default: isDark || isCosmos ? 'bg-gray-400' : 'bg-gray-500',
    success: isCyberpunk || isAnime || isCosmos ? 'bg-emerald-400' : 'bg-green-500',
    warning: isCyberpunk || isAnime || isCosmos ? 'bg-amber-400' : 'bg-yellow-500',
    danger: isCyberpunk || isAnime || isCosmos ? 'bg-rose-400' : 'bg-red-500',
    info: isCyberpunk || isAnime || isCosmos ? 'bg-violet-400' : 'bg-blue-500',
    outline: 'bg-current',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full border
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}

interface TagProps {
  children: React.ReactNode;
  onRemove?: () => void;
  size?: BadgeSize;
  className?: string;
}

export function Tag({
  children,
  onRemove,
  size = 'md',
  className = '',
}: TagProps) {
  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const baseClasses = isCyberpunk || isCosmos
    ? 'bg-violet-500/20 text-violet-200 border-violet-400/50'
    : isAnime
    ? 'bg-pink-500/20 text-pink-200 border-pink-400/50'
    : isDark
    ? 'bg-gray-700/50 text-gray-300 border-gray-600'
    : 'bg-gray-100 text-gray-700 border-gray-300';

  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-medium rounded-md border
        ${sizeClasses[size]}
        ${baseClasses}
        ${className}
      `}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className={`ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none`}
          aria-label="移除标签"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    正常: {
      bg: isCyberpunk ? 'bg-emerald-500/40 border-emerald-400/50' : isAnime ? 'bg-emerald-500/50 border-emerald-400/70' : isCosmos ? 'bg-emerald-500/50 border-emerald-400/70' : isDark ? 'bg-emerald-500/40 border-emerald-400/50' : 'bg-emerald-50 border-emerald-200',
      text: isCyberpunk || isCosmos ? 'text-emerald-200' : isAnime ? 'text-emerald-800' : isDark ? 'text-emerald-200' : 'text-emerald-700',
      dot: isCyberpunk || isAnime || isCosmos ? 'bg-emerald-400' : 'bg-emerald-500',
    },
    未投产: {
      bg: isCyberpunk ? 'bg-gray-500/40 border-gray-400/50' : isAnime ? 'bg-gray-500/50 border-gray-400/70' : isCosmos ? 'bg-gray-500/50 border-gray-400/70' : isDark ? 'bg-gray-500/40 border-gray-400/50' : 'bg-gray-100 border-gray-200',
      text: isCyberpunk || isCosmos ? 'text-gray-200' : isAnime ? 'text-gray-800' : isDark ? 'text-gray-200' : 'text-gray-600',
      dot: isCyberpunk || isAnime || isCosmos ? 'bg-gray-400' : 'bg-gray-500',
    },
    投产中: {
      bg: isCyberpunk ? 'bg-violet-500/40 border-violet-400/50' : isAnime ? 'bg-pink-500/50 border-pink-400/70' : isCosmos ? 'bg-violet-500/50 border-violet-400/70' : isDark ? 'bg-violet-500/40 border-violet-400/50' : 'bg-violet-50 border-violet-200',
      text: isCyberpunk || isCosmos ? 'text-violet-200' : isAnime ? 'text-pink-800' : isDark ? 'text-violet-200' : 'text-violet-700',
      dot: isCyberpunk || isAnime || isCosmos ? 'bg-violet-400' : 'bg-violet-500',
    },
    维修中: {
      bg: isCyberpunk ? 'bg-orange-500/40 border-orange-400/50' : isAnime ? 'bg-orange-500/50 border-orange-400/70' : isCosmos ? 'bg-orange-500/50 border-orange-400/70' : isDark ? 'bg-orange-500/40 border-orange-400/50' : 'bg-orange-50 border-orange-200',
      text: isCyberpunk || isCosmos ? 'text-orange-200' : isAnime ? 'text-orange-800' : isDark ? 'text-orange-200' : 'text-orange-700',
      dot: isCyberpunk || isAnime || isCosmos ? 'bg-orange-400' : 'bg-orange-500',
    },
    三防中: {
      bg: isCyberpunk ? 'bg-purple-500/40 border-purple-400/50' : isAnime ? 'bg-purple-500/50 border-purple-400/70' : isCosmos ? 'bg-purple-500/50 border-purple-400/70' : isDark ? 'bg-purple-500/40 border-purple-400/50' : 'bg-purple-50 border-purple-200',
      text: isCyberpunk || isCosmos ? 'text-purple-200' : isAnime ? 'text-purple-800' : isDark ? 'text-purple-200' : 'text-purple-700',
      dot: isCyberpunk || isAnime || isCosmos ? 'bg-purple-400' : 'bg-purple-500',
    },
    测试中: {
      bg: isCyberpunk ? 'bg-amber-500/40 border-amber-400/50' : isAnime ? 'bg-amber-500/50 border-amber-400/70' : isCosmos ? 'bg-amber-500/50 border-amber-400/70' : isDark ? 'bg-amber-500/40 border-amber-400/50' : 'bg-amber-50 border-amber-200',
      text: isCyberpunk || isCosmos ? 'text-amber-200' : isAnime ? 'text-amber-800' : isDark ? 'text-amber-200' : 'text-amber-700',
      dot: isCyberpunk || isAnime || isCosmos ? 'bg-amber-400' : 'bg-amber-500',
    },
    仿真中: {
      bg: isCyberpunk ? 'bg-cyan-500/40 border-cyan-400/50' : isAnime ? 'bg-cyan-500/50 border-cyan-400/70' : isCosmos ? 'bg-cyan-500/50 border-cyan-400/70' : isDark ? 'bg-cyan-500/40 border-cyan-400/50' : 'bg-cyan-50 border-cyan-200',
      text: isCyberpunk || isCosmos ? 'text-cyan-200' : isAnime ? 'text-cyan-800' : isDark ? 'text-cyan-200' : 'text-cyan-700',
      dot: isCyberpunk || isAnime || isCosmos ? 'bg-cyan-400' : 'bg-cyan-500',
    },
    故障: {
      bg: isCyberpunk ? 'bg-rose-500/40 border-rose-400/50' : isAnime ? 'bg-rose-500/50 border-rose-400/70' : isCosmos ? 'bg-rose-500/50 border-rose-400/70' : isDark ? 'bg-rose-500/40 border-rose-400/50' : 'bg-rose-50 border-rose-200',
      text: isCyberpunk || isCosmos ? 'text-rose-200' : isAnime ? 'text-rose-800' : isDark ? 'text-rose-200' : 'text-rose-700',
      dot: isCyberpunk || isAnime || isCosmos ? 'bg-rose-400' : 'bg-rose-500',
    },
  };

  const config = statusConfig[status] || statusConfig['未投产'];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-1 text-xs font-medium rounded-full border
        ${config.bg} ${config.text}
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}

interface StageBadgeProps {
  stage: string;
  className?: string;
}

export function StageBadge({ stage, className = '' }: StageBadgeProps) {
  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();

  const stageConfig: Record<string, { bg: string; text: string }> = {
    'F阶段': {
      bg: isCyberpunk ? 'bg-fuchsia-500/40 border-fuchsia-400/50' : isAnime ? 'bg-fuchsia-500/50 border-fuchsia-400/70' : isCosmos ? 'bg-fuchsia-500/50 border-fuchsia-400/70' : isDark ? 'bg-fuchsia-500/40 border-fuchsia-400/50' : 'bg-fuchsia-100 border-fuchsia-300',
      text: isCyberpunk || isCosmos ? 'text-fuchsia-200' : isAnime ? 'text-fuchsia-800' : isDark ? 'text-fuchsia-200' : 'text-fuchsia-700',
    },
    'C阶段': {
      bg: isCyberpunk ? 'bg-cyan-500/40 border-cyan-400/50' : isAnime ? 'bg-violet-500/50 border-violet-400/70' : isCosmos ? 'bg-violet-500/50 border-violet-400/70' : isDark ? 'bg-violet-500/40 border-violet-400/50' : 'bg-violet-100 border-violet-300',
      text: isCyberpunk || isCosmos ? 'text-violet-200' : isAnime ? 'text-violet-800' : isDark ? 'text-violet-200' : 'text-violet-700',
    },
    'S阶段': {
      bg: isCyberpunk ? 'bg-amber-500/40 border-amber-400/50' : isAnime ? 'bg-rose-500/50 border-rose-400/70' : isCosmos ? 'bg-rose-500/50 border-rose-400/70' : isDark ? 'bg-rose-500/40 border-rose-400/50' : 'bg-rose-100 border-rose-300',
      text: isCyberpunk || isCosmos ? 'text-rose-200' : isAnime ? 'text-rose-800' : isDark ? 'text-rose-200' : 'text-rose-700',
    },
    'D阶段': {
      bg: isCyberpunk ? 'bg-orange-500/40 border-orange-400/50' : isAnime ? 'bg-indigo-500/50 border-indigo-400/70' : isCosmos ? 'bg-indigo-500/50 border-indigo-400/70' : isDark ? 'bg-indigo-500/40 border-indigo-400/50' : 'bg-indigo-100 border-indigo-300',
      text: isCyberpunk || isCosmos ? 'text-indigo-200' : isAnime ? 'text-indigo-800' : isDark ? 'text-indigo-200' : 'text-indigo-700',
    },
    'P阶段': {
      bg: isCyberpunk ? 'bg-emerald-500/40 border-emerald-400/50' : isAnime ? 'bg-cyan-500/50 border-cyan-400/70' : isCosmos ? 'bg-cyan-500/50 border-cyan-400/70' : isDark ? 'bg-cyan-500/40 border-cyan-400/50' : 'bg-cyan-100 border-cyan-300',
      text: isCyberpunk || isCosmos ? 'text-cyan-200' : isAnime ? 'text-cyan-800' : isDark ? 'text-cyan-200' : 'text-cyan-700',
    },
  };

  const config = stageConfig[stage] || {
    bg: isDark || isCosmos ? 'bg-gray-500/40 border-gray-400/50' : 'bg-gray-100 border-gray-300',
    text: isDark || isCosmos ? 'text-gray-200' : 'text-gray-700',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md border
        ${config.bg} ${config.text}
        ${className}
      `}
    >
      {stage}
    </span>
  );
}

export default Badge;