import React, { useState, useEffect, ReactNode } from 'react';

type AnimationType =
  | 'fade-in'
  | 'fade-out'
  | 'slide-in'
  | 'slide-out'
  | 'slide-up'
  | 'slide-down'
  | 'scale-in'
  | 'scale-out'
  | 'bounce'
  | 'pulse'
  | 'wiggle'
  | 'shake';

interface AnimateProps {
  children: ReactNode;
  type?: AnimationType;
  duration?: 'instant' | 'fast' | 'normal' | 'slow' | 'slower';
  delay?: number;
  loop?: boolean;
  onAnimationEnd?: () => void;
  className?: string;
}

export function Animate({
  children,
  type = 'fade-in',
  duration = 'normal',
  delay = 0,
  loop = false,
  onAnimationEnd,
  className = '',
}: AnimateProps) {
  const durationMap = {
    instant: 'duration-instant',
    fast: 'duration-fast',
    normal: 'duration-normal',
    slow: 'duration-slow',
    slower: 'duration-slower',
  };

  const animationMap: Record<AnimationType, string> = {
    'fade-in': 'animate-fade-in',
    'fade-out': 'animate-fade-out',
    'slide-in': 'animate-slide-in',
    'slide-out': 'animate-slide-out',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down',
    'scale-in': 'animate-scale-in',
    'scale-out': 'animate-scale-out',
    'bounce': 'animate-bounce',
    'pulse': 'animate-pulse',
    'wiggle': 'animate-wiggle',
    'shake': 'animate-shake',
  };

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    if (!loop) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onAnimationEnd?.();
      }, delay + (duration === 'instant' ? 50 : duration === 'fast' ? 150 : duration === 'normal' ? 250 : duration === 'slow' ? 400 : 600));
      return () => clearTimeout(timer);
    }
  }, [delay, duration, loop, onAnimationEnd]);

  if (!isAnimating && !loop) return <>{children}</>;

  return (
    <div
      className={`${animationMap[type]} ${durationMap[duration]} ${loop ? 'infinite' : ''} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

interface TransitionProps {
  children: ReactNode;
  show?: boolean;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  duration?: 'instant' | 'fast' | 'normal' | 'slow' | 'slower';
  className?: string;
}

export function Transition({
  children,
  show = true,
  enter = 'transition-all',
  enterFrom = 'opacity-0 translate-y-2',
  enterTo = 'opacity-100 translate-y-0',
  leave = 'transition-all',
  leaveFrom = 'opacity-100 translate-y-0',
  leaveTo = 'opacity-0 -translate-y-2',
  duration = 'normal',
  className = '',
}: TransitionProps) {
  const durationMap = {
    instant: 'duration-instant',
    fast: 'duration-fast',
    normal: 'duration-normal',
    slow: 'duration-slow',
    slower: 'duration-slower',
  };

  if (!show) return null;

  return (
    <div
      className={`${enter} ${durationMap[duration]} ${enterFrom} ${enterTo} ${className}`}
    >
      {children}
    </div>
  );
}

interface CollapseProps {
  children: ReactNode;
  show?: boolean;
  duration?: 'fast' | 'normal' | 'slow';
  className?: string;
}

export function Collapse({
  children,
  show = false,
  duration = 'normal',
  className = '',
}: CollapseProps) {
  const durationMap = {
    fast: 'duration-fast',
    normal: 'duration-normal',
    slow: 'duration-slow',
  };

  return (
    <div
      className={`overflow-hidden transition-all ${durationMap[duration]} ${
        show ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
}

export function Skeleton({ width, height = 16, circle = false, className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-gray-200 dark:bg-gray-700 ${circle ? 'rounded-full' : 'rounded'} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} className={i === lines - 1 ? 'w-3/4' : 'w-full'} />
      ))}
    </div>
  );
}

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

interface ProgressProps {
  value?: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function Progress({
  value = 0,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  animated = false,
  className = '',
}: ProgressProps) {
  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
  };

  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-slow ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  show?: boolean;
  text?: string;
  spinner?: ReactNode;
  className?: string;
}

export function LoadingOverlay({ show = false, text, spinner, className = '' }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className={`absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        {spinner || <Spinner size="lg" />}
        {text && <p className="text-sm text-gray-600 dark:text-gray-300">{text}</p>}
      </div>
    </div>
  );
}

interface FadeProps {
  children: ReactNode;
  show?: boolean;
  duration?: 'fast' | 'normal' | 'slow';
  className?: string;
}

export function Fade({ children, show = false, duration = 'normal', className = '' }: FadeProps) {
  const durationMap = {
    fast: 'duration-fast',
    normal: 'duration-normal',
    slow: 'duration-slow',
  };

  return (
    <div
      className={`transition-opacity ${durationMap[duration]} ${
        show ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface SlideProps {
  children: ReactNode;
  show?: boolean;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  duration?: 'fast' | 'normal' | 'slow';
  className?: string;
}

export function Slide({
  children,
  show = false,
  direction = 'up',
  distance = 10,
  duration = 'normal',
  className = '',
}: SlideProps) {
  const durationMap = {
    fast: 'duration-fast',
    normal: 'duration-normal',
    slow: 'duration-slow',
  };

  const getTransform = (show: boolean) => {
    const factor = show ? 0 : 1;
    const offset = distance * factor;
    switch (direction) {
      case 'left': return `translateX(${offset}px)`;
      case 'right': return `translateX(${-offset}px)`;
      case 'up': return `translateY(${offset}px)`;
      case 'down': return `translateY(${-offset}px)`;
      default: return `translateY(${offset}px)`;
    }
  };

  return (
    <div
      className={`transition-all ${durationMap[duration]} ${className}`}
      style={{ transform: getTransform(show), opacity: show ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

export default Animate;
