import React from 'react';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ContainerProps {
  children: React.ReactNode;
  size?: ContainerSize;
  padding?: boolean;
  centered?: boolean;
  className?: string;
}

export function Container({
  children,
  size = 'lg',
  padding = true,
  centered = true,
  className = '',
}: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-640px',
    md: 'max-w-768px',
    lg: 'max-w-1024px',
    xl: 'max-w-1280px',
    full: 'max-w-full',
  };

  const paddingClass = padding ? 'px-4 sm:px-6 lg:px-8' : '';

  return (
    <div className={`${sizeClasses[size]} ${centered ? 'mx-auto' : ''} ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}

interface GridProps {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
  };
  className?: string;
}

export function Grid({
  children,
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = { xs: 'gap-2', sm: 'gap-3', md: 'gap-4', lg: 'gap-6' },
  className = '',
}: GridProps) {
  const colClasses = {
    xs: `grid-cols-${cols.xs || 1}`,
    sm: `sm:grid-cols-${cols.sm || 2}`,
    md: `md:grid-cols-${cols.md || 2}`,
    lg: `lg:grid-cols-${cols.lg || 3}`,
    xl: `xl:grid-cols-${cols.xl || 4}`,
  };

  return (
    <div className={`grid ${colClasses.xs} ${colClasses.sm} ${colClasses.md} ${colClasses.lg} ${colClasses.xl} ${gap.xs} ${gap.sm} ${gap.md} ${gap.lg} ${className}`}>
      {children}
    </div>
  );
}

interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  wrap?: boolean;
  className?: string;
}

export function Flex({
  children,
  direction = 'row',
  align = 'center',
  justify = 'start',
  gap = 'none',
  wrap = false,
  className = '',
}: FlexProps) {
  const directionClasses = {
    'row': 'flex-row',
    'col': 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse',
  };

  const alignClasses = {
    'start': 'items-start',
    'center': 'items-center',
    'end': 'items-end',
    'stretch': 'items-stretch',
    'baseline': 'items-baseline',
  };

  const justifyClasses = {
    'start': 'justify-start',
    'center': 'justify-center',
    'end': 'justify-end',
    'between': 'justify-between',
    'around': 'justify-around',
    'evenly': 'justify-evenly',
  };

  const gapClasses = {
    'none': '',
    'xs': 'gap-1',
    'sm': 'gap-2',
    'md': 'gap-4',
    'lg': 'gap-6',
    'xl': 'gap-8',
  };

  return (
    <div className={`flex ${directionClasses[direction]} ${alignClasses[align]} ${justifyClasses[justify]} ${gapClasses[gap]} ${wrap ? 'flex-wrap' : ''} ${className}`}>
      {children}
    </div>
  );
}

interface StackProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

export function Stack({
  children,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  className = '',
}: StackProps) {
  const spacingClasses = {
    'xs': direction === 'vertical' ? 'space-y-1' : 'space-x-1',
    'sm': direction === 'vertical' ? 'space-y-2' : 'space-x-2',
    'md': direction === 'vertical' ? 'space-y-4' : 'space-x-4',
    'lg': direction === 'vertical' ? 'space-y-6' : 'space-x-6',
    'xl': direction === 'vertical' ? 'space-y-8' : 'space-x-8',
  };

  const alignClasses = {
    'start': 'items-start',
    'center': 'items-center',
    'end': 'items-end',
    'stretch': 'items-stretch',
  };

  return (
    <div className={`flex flex-${direction === 'horizontal' ? 'row' : 'col'} ${spacingClasses[spacing]} ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  );
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

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  axis?: 'vertical' | 'horizontal' | 'both';
  className?: string;
}

export function Spacer({ size = 'md', axis = 'both', className = '' }: SpacerProps) {
  const sizeClasses = {
    'xs': axis === 'vertical' ? 'h-1' : axis === 'horizontal' ? 'w-1' : 'h-1 w-1',
    'sm': axis === 'vertical' ? 'h-2' : axis === 'horizontal' ? 'w-2' : 'h-2 w-2',
    'md': axis === 'vertical' ? 'h-4' : axis === 'horizontal' ? 'w-4' : 'h-4 w-4',
    'lg': axis === 'vertical' ? 'h-6' : axis === 'horizontal' ? 'w-6' : 'h-6 w-6',
    'xl': axis === 'vertical' ? 'h-8' : axis === 'horizontal' ? 'w-8' : 'h-8 w-8',
    '2xl': axis === 'vertical' ? 'h-12' : axis === 'horizontal' ? 'w-12' : 'h-12 w-12',
  };

  return <div className={`${sizeClasses[size]} ${className}`} />;
}

interface PageLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarCollapsed?: boolean;
  className?: string;
}

export function PageLayout({
  header,
  children,
  footer,
  sidebar,
  sidebarCollapsed = false,
  className = '',
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      {header && <header className="flex-shrink-0">{header}</header>}
      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside className={`flex-shrink-0 transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
            {sidebar}
          </aside>
        )}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      {footer && <footer className="flex-shrink-0">{footer}</footer>}
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

interface AspectRatioProps {
  ratio?: number;
  children: React.ReactNode;
  className?: string;
}

export function AspectRatio({ ratio = 16 / 9, children, className = '' }: AspectRatioProps) {
  return (
    <div className={`relative w-full pb-[${100 / ratio}%] ${className}`}>
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}

export default Container;
