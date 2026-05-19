import React from 'react';

interface GridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Grid({ children, cols = 3, gap = 'md', className = '' }: GridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6',
  };

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

interface StackProps {
  children: React.ReactNode;
  direction?: 'row' | 'col';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
  className?: string;
}

export function Stack({
  children,
  direction = 'col',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  className = '',
}: StackProps) {
  const directionClass = direction === 'row' ? 'flex-row' : 'flex-col';

  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={`flex ${directionClass} ${gapClasses[gap]} ${alignClasses[align]} ${justifyClasses[justify]} ${className}`}
    >
      {children}
    </div>
  );
}

interface CenterProps {
  children: React.ReactNode;
  className?: string;
}

export function Center({ children, className = '' }: CenterProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}

interface SpaceProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export function Space({ size = 'md', className = '' }: SpaceProps) {
  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
    xl: 'h-8',
    '2xl': 'h-12',
  };

  return <div className={`${sizeClasses[size]} ${className}`} />;
}

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ orientation = 'horizontal', className = '' }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={`w-px h-full bg-gray-200 dark:bg-gray-700 ${className}`} />;
  }

  return <div className={`w-full h-px bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

export default Grid;