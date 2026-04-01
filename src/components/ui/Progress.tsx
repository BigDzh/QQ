import React from 'react';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const variantStyles: Record<ProgressVariant, string> = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
};

const sizeStyles: Record<ProgressSize, { height: string; textSize: string }> = {
  sm: { height: 'h-1', textSize: 'text-xs' },
  md: { height: 'h-2', textSize: 'text-sm' },
  lg: { height: 'h-3', textSize: 'text-base' },
};

export function Progress({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
  className = '',
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const { height, textSize } = sizeStyles[size];

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className={`${textSize} text-gray-600 dark:text-gray-300`}>
            {label}
          </span>
          {showLabel && (
            <span className={`${textSize} text-gray-500 dark:text-gray-400`}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${height} ${variantStyles[variant]} rounded-full transition-all duration-300 ease-out ${
            animated ? 'relative overflow-hidden' : ''
          }`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {animated && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ProgressCircleProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  className?: string;
}

const variantStrokeStyles: Record<ProgressVariant, string> = {
  primary: 'stroke-primary-500',
  success: 'stroke-green-500',
  warning: 'stroke-yellow-500',
  danger: 'stroke-red-500',
};

export function ProgressCircle({
  value,
  max = 100,
  size = 64,
  strokeWidth = 6,
  variant = 'primary',
  showLabel = true,
  className = '',
}: ProgressCircleProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${variantStrokeStyles[variant]} transition-all duration-300 ease-out`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-medium text-gray-700 dark:text-gray-200">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
