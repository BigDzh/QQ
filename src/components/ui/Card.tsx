import React from 'react';
import { useTheme } from '../../context/ThemeContext';

type CardVariant = 'default' | 'bordered' | 'elevated' | 'outlined';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: CardPadding;
  hover?: boolean;
  animated?: boolean;
  variant?: CardVariant;
  headerExtra?: React.ReactNode;
  footerAction?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  animated = false,
  variant = 'default',
  headerExtra,
  footerAction,
  onClick,
  disabled = false,
  selected = false,
}: CardProps) {
  const { isDark, isCyberpunk, isAnime } = useTheme();

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  const getVariantClasses = () => {
    if (variant === 'bordered') {
      return isDark ? 'bg-transparent border-gray-600' : 'bg-transparent border-gray-300';
    }
    if (variant === 'elevated') {
      return isCyberpunk
        ? 'bg-[#161b22]/80 backdrop-blur-xl border-transparent shadow-xl'
        : isAnime
        ? 'bg-white/90 backdrop-blur-xl border-transparent shadow-xl'
        : isDark
        ? 'bg-gray-800/90 backdrop-blur-xl border-transparent shadow-xl'
        : 'bg-white/95 backdrop-blur-md border-transparent shadow-lg';
    }
    if (variant === 'outlined') {
      return isDark ? 'bg-transparent border-gray-700' : 'bg-transparent border-gray-200';
    }
    return isCyberpunk
      ? 'bg-[#161b22]/80 backdrop-blur-xl border-white/10'
      : isAnime
      ? 'bg-white/75 backdrop-blur-xl border-pink-200/50'
      : isDark
      ? 'bg-gray-800/80 backdrop-blur-xl border-gray-700'
      : 'bg-white/90 backdrop-blur-md border-gray-200';
  };

  const hoverClasses = hover || animated
    ? isCyberpunk
      ? 'hover:bg-[#1a2028]/80 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/20 hover:font-semibold'
      : isAnime
      ? 'hover:bg-white/90 hover:border-pink-300/50 hover:shadow-lg hover:shadow-pink-500/20 hover:font-semibold'
      : isDark
      ? 'hover:bg-gray-700/80 hover:border-gray-600 hover:shadow-lg hover:font-semibold'
      : 'hover:bg-white hover:border-gray-300 hover:shadow-lg hover:font-semibold'
    : '';

  const animatedClasses = animated
    ? 'transform transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] active:translate-y-0 active:shadow-md shine-sweep'
    : '';

  const cursorClass = onClick && !disabled ? 'cursor-pointer' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  const cardContent = (
    <>
      {headerExtra && (
        <div className="flex items-center justify-end mb-2">
          {headerExtra}
        </div>
      )}
      {children}
      {footerAction && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {footerAction}
        </div>
      )}
    </>
  );

  const selectedClass = selected ? 'z-10 ring-2 ring-primary-500/60 ring-offset-2 ring-offset-transparent' : '';

  return (
    <div
      className={`border rounded-xl ${getVariantClasses()} ${paddingClasses[padding]} ${hoverClasses} ${animatedClasses} ${cursorClass} ${disabledClass} ${selectedClass} transition-all duration-200 ease-out ${className}`}
      onClick={disabled ? undefined : onClick}
    >
      {cardContent}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  extra?: React.ReactNode;
  description?: string;
}

export function CardHeader({ children, className = '', action, extra, description }: CardHeaderProps) {
  const { isDark } = useTheme();

  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex-1">
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {children}
        </h3>
        {description && (
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export function CardFooter({ children, className = '', bordered = true }: CardFooterProps) {
  const { isDark } = useTheme();

  return (
    <div className={`${bordered ? `mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}` : ''} ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
  icon?: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  animated?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function StatCard({ title, value, change, icon, className = '', variant = 'default', animated = false, onClick, disabled }: StatCardProps) {
  const { isDark, isCyberpunk, isAnime } = useTheme();

  return (
    <Card variant={variant} animated={animated} onClick={onClick} disabled={disabled} className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              change.trend === 'up' ? 'text-success-500' : 'text-danger-500'
            }`}>
              <span>{change.trend === 'up' ? '↑' : '↓'}</span>
              <span>{Math.abs(change.value)}%</span>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg transition-colors duration-200 ${
            isCyberpunk
              ? 'bg-cyan-500/10 text-cyan-400'
              : isAnime
              ? 'bg-pink-100 text-pink-600'
              : isDark
              ? 'bg-gray-700 text-gray-300'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  progress?: number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  className?: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
  disabled?: boolean;
}

export function MetricCard({ label, value, unit, progress, trend, icon, className = '', status, onClick, disabled }: MetricCardProps) {
  const { isDark } = useTheme();

  const statusColors = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
  };

  return (
    <Card onClick={onClick} disabled={disabled} className={`${onClick && !disabled ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] active:translate-y-0 active:shadow-md transition-all duration-200 ease-out' : ''} ${className}`} padding="md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
            {unit && <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{unit}</span>}
          </div>
          {progress !== undefined && (
            <div className="mt-2">
              <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${status ? statusColors[status] : 'bg-primary-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              trend.direction === 'up' ? 'text-success-500' :
              trend.direction === 'down' ? 'text-danger-500' :
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {trend.direction === 'up' && <span>↑</span>}
              {trend.direction === 'down' && <span>↓</span>}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg transition-colors duration-200 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

interface ActionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ActionCard({ title, description, icon, action, onClick, className = '', disabled }: ActionCardProps) {
  const { isDark, isCyberpunk, isAnime } = useTheme();

  return (
    <Card
      hover
      animated
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group ${className}`}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className={`p-3 rounded-xl transition-all duration-200 ${
            isCyberpunk
              ? 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:scale-110'
              : isAnime
              ? 'bg-pink-100 text-pink-600 group-hover:bg-pink-200 group-hover:scale-110'
              : isDark
              ? 'bg-gray-700 text-gray-300 group-hover:bg-gray-600 group-hover:scale-110'
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200 group-hover:scale-110'
          }`}>
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
          {description && (
            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </Card>
  );
}

export default Card;
