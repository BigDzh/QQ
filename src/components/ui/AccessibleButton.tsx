import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-500',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-500',
  danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
};

const sizeStyles = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      label,
      icon,
      iconPosition = 'left',
      loading = false,
      variant = 'primary',
      size = 'md',
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        label={label}
        aria-label={label}
        aria-disabled={isDisabled}
        aria-busy={loading}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center rounded-lg font-medium
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span aria-hidden="true">{icon}</span>
        )}
        {(children || label) && <span>{children || label}</span>}
        {!loading && icon && iconPosition === 'right' && (
          <span aria-hidden="true">{icon}</span>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

interface AccessibleIconButtonProps extends Omit<AccessibleButtonProps, 'icon' | 'iconPosition' | 'children'> {
  children: ReactNode;
}

export const AccessibleIconButton = forwardRef<HTMLButtonElement, AccessibleIconButtonProps>(
  ({ label, children, className = '', ...props }, ref) => {
    return (
      <AccessibleButton
        ref={ref}
        label={label}
        variant="ghost"
        size="md"
        className={`p-2 rounded-lg ${className}`}
        {...props}
      >
        {children}
      </AccessibleButton>
    );
  }
);

AccessibleIconButton.displayName = 'AccessibleIconButton';
