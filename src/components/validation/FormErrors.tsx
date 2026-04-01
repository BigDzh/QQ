import React from 'react';
import { AlertCircle, Info, X, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';

interface FormError {
  field: string;
  message: string;
}

interface FormErrorsProps {
  errors: Record<string, string>;
  touched?: Record<string, boolean>;
  showIcon?: boolean;
  className?: string;
}

export function FormErrors({
  errors,
  touched = {},
  showIcon = true,
  className = '',
}: FormErrorsProps) {
  const { theme, isDark, isCyberpunk } = useTheme();
  const t = useThemeStyles();

  const visibleErrors = Object.entries(errors).filter(
    ([field, error]) => !touched[field] || error
  );

  if (visibleErrors.length === 0) {
    return null;
  }

  const getIcon = (type: 'error' | 'info') => {
    if (!showIcon) return null;

    if (type === 'error') {
      return (
        <AlertCircle
          size={16}
          className={isCyberpunk ? 'text-red-400' : 'text-red-500'}
        />
      );
    }
    return (
      <Info
        size={16}
        className={isCyberpunk ? 'text-cyan-400' : 'text-blue-500'}
      />
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {visibleErrors.map(([field, message]) => (
        <div
          key={field}
          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
            isCyberpunk
              ? 'bg-red-500/10 border border-red-400/20'
              : isDark
              ? 'bg-red-900/20 border border-red-800/30'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {getIcon('error')}
          <span className={isCyberpunk ? 'text-red-400' : isDark ? 'text-red-400' : 'text-red-600'}>
            {message}
          </span>
        </div>
      ))}
    </div>
  );
}

interface FieldErrorProps {
  error?: string;
  touched?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function FieldError({
  error,
  touched,
  showIcon = true,
  className = '',
}: FieldErrorProps) {
  const { theme, isDark, isCyberpunk } = useTheme();

  if (!error || (touched === false && error)) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
        isCyberpunk
          ? 'bg-red-500/10 text-red-400'
          : isDark
          ? 'bg-red-900/30 text-red-400'
          : 'bg-red-50 text-red-600'
      } ${className}`}
    >
      {showIcon && <AlertCircle size={12} />}
      <span>{error}</span>
    </div>
  );
}

interface FormSuccessProps {
  message?: string;
  className?: string;
}

export function FormSuccess({
  message = '操作成功',
  className = '',
}: FormSuccessProps) {
  const { theme, isDark, isCyberpunk } = useTheme();
  const t = useThemeStyles();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
        isCyberpunk
          ? 'bg-green-500/10 border border-green-400/20'
          : isDark
          ? 'bg-green-900/20 border border-green-800/30'
          : 'bg-green-50 border border-green-200'
      } ${className}`}
    >
      <CheckCircle
        size={16}
        className={isCyberpunk ? 'text-green-400' : isDark ? 'text-green-400' : 'text-green-600'}
      />
      <span className={isCyberpunk ? 'text-green-400' : isDark ? 'text-green-400' : 'text-green-600'}>
        {message}
      </span>
    </div>
  );
}

export default FormErrors;