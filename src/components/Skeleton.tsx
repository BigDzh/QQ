import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  width,
  height,
  variant = 'text',
  animation = 'wave',
}: SkeletonProps) {
  const baseStyles = 'bg-gray-200 dark:bg-gray-700';

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={style}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  spacing?: string;
}

export function SkeletonText({
  lines = 3,
  className = '',
  spacing = 'mt-2',
}: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          height={16}
          width={index === lines - 1 ? '60%' : '100%'}
          className={index > 0 ? spacing : ''}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  showAvatar?: boolean;
  showImage?: boolean;
  lines?: number;
}

export function SkeletonCard({
  className = '',
  showAvatar = true,
  showImage = false,
  lines = 3,
}: SkeletonCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
      {showAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={14} width="40%" />
            <Skeleton variant="text" height={12} width="25%" />
          </div>
        </div>
      )}

      {showImage && <Skeleton variant="rectangular" height={160} className="mb-4" />}

      <SkeletonText lines={lines} />
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: SkeletonTableProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} variant="text" height={14} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              height={14}
              width={colIndex === 0 ? '80%' : '60%'}
              className="flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
}

export function SkeletonList({
  items = 5,
  className = '',
  showAvatar = true,
}: SkeletonListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
        >
          {showAvatar && <Skeleton variant="circular" width={36} height={36} />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={14} width="50%" />
            <Skeleton variant="text" height={12} width="30%" />
          </div>
          <Skeleton variant="rounded" width={60} height={24} />
        </div>
      ))}
    </div>
  );
}

interface SkeletonDashboardProps {
  className?: string;
}

export function SkeletonDashboard({ className = '' }: SkeletonDashboardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} showAvatar={false} lines={1} className="h-24" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton variant="rectangular" height={300} className="w-full" />
        <Skeleton variant="rectangular" height={300} className="w-full" />
      </div>

      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}