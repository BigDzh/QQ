import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const { isDark } = useTheme();

  const baseClasses = isDark
    ? 'bg-gray-700'
    : 'bg-gray-200';

  const animationClasses = animation === 'pulse'
    ? 'animate-pulse'
    : animation === 'wave'
    ? 'animate-shimmer'
    : '';

  const variantClasses = variant === 'circular'
    ? 'rounded-full'
    : variant === 'rectangular'
    ? 'rounded-lg'
    : 'rounded';

  const style: React.CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : '40px'),
    height: height ?? (variant === 'text' ? '1em' : '40px'),
  };

  return (
    <div
      className={`${baseClasses} ${animationClasses} ${variantClasses} ${className}`}
      style={style}
    />
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  const { isDark } = useTheme();

  const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`${bgClass} border ${borderClass} rounded-xl p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="rectangular" height={80} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={60} height={28} />
        <Skeleton variant="rectangular" width={60} height={28} />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: SkeletonTableProps) {
  const { isDark } = useTheme();

  const headerBgClass = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const rowBgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className={`${headerBgClass} border-b ${borderClass} px-4 py-3 flex gap-4`}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" height={14} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={`${rowBgClass} border-b ${borderClass} px-4 py-3 flex gap-4 items-center`}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              height={14}
              className="flex-1"
              animation={colIndex === 0 ? 'none' : 'pulse'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;