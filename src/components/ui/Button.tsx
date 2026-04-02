import React from 'react';
import { useTheme } from '../../context/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  pulse?: boolean;
  shimmer?: boolean;
  gradientDirection?: 'ltr' | 'rtl' | 'tb' | 'bt' | 'r';
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  pulse = false,
  shimmer = false,
  gradientDirection = 'ltr',
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const { isDark, isCyberpunk, isAnime, theme } = useTheme();

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
    xl: 'px-8 py-4 text-lg gap-3',
  };

  const gradientMap: Record<string, string> = {
    'ltr': 'from-primary-500 to-primary-600',
    'rtl': 'from-primary-600 to-primary-500',
    'tb': 'from-primary-500 to-primary-600',
    'bt': 'from-primary-600 to-primary-500',
  };

  const getGradientClasses = () => {
    const direction = gradientDirection === 'r' ? 'ltr' : gradientDirection;
    const gradientClass = gradientMap[direction] || gradientMap.ltr;

    if (isCyberpunk) {
      return `bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 active:from-cyan-600 active:to-fuchsia-600`;
    }
    if (isAnime) {
      return `bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 active:from-pink-600 active:to-violet-600`;
    }
    if (theme === 'cosmos') {
      return `bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:from-violet-700 active:to-fuchsia-700`;
    }
    if (theme === 'classical') {
      return `bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-500 hover:via-orange-400 hover:to-red-400 active:from-amber-700 active:via-orange-600 active:to-red-600`;
    }
    return `bg-gradient-to-r ${gradientClass} hover:brightness-110 active:brightness-90`;
  };

  const getHoverTransform = () => {
    return 'hover:scale-105 hover:-translate-y-0.5';
  };

  const getActiveTransform = () => {
    return 'active:scale-95 active:translate-y-0';
  };

  const variantClasses = {
    primary: isCyberpunk
      ? `bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/20 ${getHoverTransform()} ${getActiveTransform()} focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent`
      : isAnime
      ? `bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/20 ${getHoverTransform()} ${getActiveTransform()} focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-transparent`
      : 'bg-primary-600 text-white hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/30 active:bg-primary-700 active:shadow-sm focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    secondary: isDark
      ? `bg-gray-700 text-white hover:bg-gray-600 hover:shadow-lg hover:shadow-gray-500/20 ${getHoverTransform()} ${getActiveTransform()} focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900` // 增强focus可见性
      : 'bg-gray-200 text-gray-900 hover:bg-gray-300 hover:shadow-lg hover:shadow-gray-500/10 active:bg-gray-400 active:shadow-sm focus:ring-2 focus:ring-gray-400 focus:ring-offset-2', // 提升文本对比度
    outline: isCyberpunk
      ? `border-2 border-cyan-400/70 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-cyan-100 hover:shadow-lg hover:shadow-cyan-500/20 ${getHoverTransform()} ${getActiveTransform()} focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]` // 增强hover和focus效果
      : isAnime
      ? `border-2 border-pink-400 text-pink-800 hover:bg-pink-50 hover:border-pink-500 hover:text-pink-900 hover:shadow-lg hover:shadow-pink-500/10 ${getHoverTransform()} ${getActiveTransform()} focus:ring-2 focus:ring-pink-400 focus:ring-offset-2` // 提升文本对比度
      : 'border-2 border-gray-400 text-gray-800 hover:bg-gray-50 hover:border-gray-500 hover:text-gray-900 hover:shadow-lg active:bg-gray-100 active:shadow-sm focus:ring-2 focus:ring-primary-500 focus:ring-offset-2', // 提升边框和文本对比度
    ghost: isCyberpunk
      ? `text-cyan-300 hover:bg-cyan-500/25 hover:text-cyan-100 hover:shadow-lg hover:shadow-cyan-500/10 ${getHoverTransform()} ${getActiveTransform()} focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]` // 增强对比度
      : isAnime
      ? `text-pink-800 hover:bg-pink-100 hover:text-pink-900 hover:shadow-lg hover:shadow-pink-500/10 ${getHoverTransform()} ${getActiveTransform()} focus:ring-2 focus:ring-pink-400 focus:ring-offset-2` // 提升文本对比度
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-lg active:bg-gray-200 active:shadow-sm focus:ring-2 focus:ring-gray-400 focus:ring-offset-2', // 提升文本对比度
    danger: 'bg-danger-600 text-white hover:bg-danger-500 hover:shadow-lg hover:shadow-danger-500/30 active:bg-danger-700 active:shadow-sm focus:ring-2 focus:ring-danger-500 focus:ring-offset-2', // 添加focus状态
    gradient: `${getGradientClasses()} text-white shadow-lg ${getHoverTransform()} ${getActiveTransform()} focus:ring-2 focus:ring-offset-2 focus:ring-primary-400`,
    link: 'text-primary-700 hover:text-primary-800 hover:underline hover:shadow-none active:text-primary-900 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:rounded p-0', // 提升链接对比度并添加focus
  };

  const baseClasses = `inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:bg-transparent
    relative overflow-hidden group
    ${shimmer ? 'shine-sweep' : ''}
  `;

  const widthClass = fullWidth ? 'w-full' : '';
  const pulseClass = pulse && !loading ? 'animate-pulse' : '';
  const shimmerClass = shimmer ? 'relative overflow-hidden' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${pulseClass} ${shimmerClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {shimmer && !loading && (
        <span className="absolute inset-0 -translate-x-full animate-shimmer" />
      )}
      {loading && (
        <svg className="animate-spin h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {loading && loadingText ? loadingText : children}
      {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  pulse?: boolean;
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  label,
  pulse = false,
  className = '',
  ...props
}: IconButtonProps) {
  const iconSizeClasses = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4',
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`${iconSizeClasses[size]} ${pulse ? 'animate-pulse' : ''} ${className}`}
      aria-label={label}
      {...props}
    >
      {icon}
    </Button>
  );
}

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function ButtonGroup({ children, className = '', size = 'md', variant = 'outline' }: ButtonGroupProps) {
  return (
    <div className={`inline-flex rounded-lg shadow-sm ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return null;
        const isFirst = index === 0;
        const isLast = React.Children.count(children) - 1 === index;
        const childProps = (child as React.ReactElement<ButtonProps>).props;

        return React.cloneElement(child as React.ReactElement<ButtonProps>, {
          ...childProps,
          size: childProps.size || size,
          variant: childProps.variant || variant,
          className: `
            ${childProps.className || ''}
            ${!isFirst ? 'rounded-l-none' : ''}
            ${!isLast ? 'rounded-r-none' : ''}
            ${index > 0 && index < React.Children.count(children) - 1 ? 'rounded-none' : ''}
            ${index > 0 ? '-ml-px' : ''}
          `,
        });
      })}
    </div>
  );
}

interface LoadingButtonProps extends ButtonProps {
  success?: boolean;
  successText?: string;
}

export function LoadingButton({
  success = false,
  successText,
  loading = false,
  children,
  className = '',
  ...props
}: LoadingButtonProps) {
  if (success) {
    return (
      <Button variant="primary" className={`bg-success-600 hover:bg-success-500 hover:shadow-lg hover:shadow-success-500/30 active:bg-success-700 active:shadow-sm ${className}`} {...props}>
        <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        {successText || children}
      </Button>
    );
  }

  return (
    <Button loading={loading} className={className} {...props}>
      {children}
    </Button>
  );
}

export default Button;
