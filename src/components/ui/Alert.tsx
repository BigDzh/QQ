import React from 'react';

export type AlertVariant = 'success' | 'warning' | 'danger' | 'info';
export type AlertSize = 'sm' | 'md' | 'lg';

export interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  icon?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-500',
    text: 'text-green-800 dark:text-green-200',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500',
    text: 'text-yellow-800 dark:text-yellow-200',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    text: 'text-red-800 dark:text-red-200',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
  },
};

const sizeStyles: Record<AlertSize, string> = {
  sm: 'p-2 text-sm',
  md: 'p-3 text-sm',
  lg: 'p-4 text-base',
};

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  danger: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function Alert({
  children,
  variant = 'info',
  size = 'md',
  title,
  icon,
  closable = false,
  onClose,
  className = '',
}: AlertProps) {
  const styles = variantStyles[variant];
  const [closed, setClosed] = React.useState(false);

  if (closed) return null;

  const handleClose = () => {
    setClosed(true);
    onClose?.();
  };

  return (
    <div
      className={`border rounded-lg ${styles.bg} ${styles.border} ${sizeStyles[size]} ${className}`}
      role="alert"
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icon || defaultIcons[variant]}
        </div>
        <div className="flex-1">
          {title && (
            <h4 className={`font-semibold mb-1 ${styles.text}`}>{title}</h4>
          )}
          <div className={`${styles.text} ${title ? '' : 'mt-0.5'}`}>{children}</div>
        </div>
        {closable && (
          <button
            type="button"
            onClick={handleClose}
            className={`flex-shrink-0 ${styles.icon} hover:opacity-70 transition-opacity`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
