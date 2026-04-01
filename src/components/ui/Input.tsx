import React, { forwardRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
  maxLength?: number;
  showCount?: boolean;
  clearable?: boolean;
  addonLeft?: React.ReactNode;
  addonRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = 'md',
  fullWidth = false,
  showPasswordToggle = false,
  maxLength,
  showCount = false,
  clearable = false,
  addonLeft,
  addonRight,
  className = '',
  disabled,
  value,
  onChange,
  type = 'text',
  ...props
}, ref) => {
  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [internalValue, setInternalValue] = useState(value as string ?? '');
  const [isFocused, setIsFocused] = useState(false);

  const currentValue = value !== undefined ? value : internalValue;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
    onChange?.(e);
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  const iconSizeClasses = {
    sm: 'left-2.5 text-xs',
    md: 'left-3 text-sm',
    lg: 'left-3.5 text-base',
  };

  const inputClasses = {
    default: isDark
      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
      : isCyberpunk
      ? 'bg-[#0d1117] border-white/10 text-white placeholder-gray-500'
      : isAnime
      ? 'bg-pink-50/95 border-pink-300 text-pink-900 placeholder-pink-400 focus:border-fuchsia-400 focus:ring-fuchsia-400/30'
      : isCosmos
      ? 'bg-[#030012]/90 border-violet-500/40 text-white placeholder-gray-500 focus:border-violet-400 focus:ring-violet-400/30'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
    error: isDark
      ? 'bg-red-900/30 border-red-500 text-white placeholder-red-300/50'
      : 'bg-red-50 border-red-500 text-red-900 placeholder-red-300',
    disabled: isDark ? 'bg-gray-700/50 text-gray-500' : 'bg-gray-100 text-gray-400',
  };

  const stateClass = error ? inputClasses.error : disabled ? inputClasses.disabled : inputClasses.default;
  const widthClass = fullWidth ? 'w-full' : '';
  const inputType = type === 'password' && showPassword ? 'text' : type;

  const handleClear = () => {
    const syntheticEvent = {
      target: { value: '' },
    } as React.ChangeEvent<HTMLInputElement>;
    setInternalValue('');
    onChange?.(syntheticEvent);
  };

  const characterCount = typeof currentValue === 'string' ? currentValue.length : 0;
  const showClearButton = clearable && currentValue && !disabled;
  const showPasswordButton = showPasswordToggle && type === 'password';

  const iconButtonBaseClass = isDark || isCosmos
    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100';

  const getFocusRingClass = () => {
    if (error) return 'focus:ring-red-500 focus:border-red-500';
    if (isCyberpunk) return 'focus:ring-cyan-500/50 focus:border-cyan-500/50';
    if (isCosmos) return 'focus:ring-violet-400 focus:border-violet-400';
    return 'focus:ring-primary-500 focus:border-primary-500';
  };

  const getFocusIconColor = () => {
    if (error) return isDark ? 'text-red-400' : 'text-red-500';
    if (isCyberpunk) return 'text-cyan-400';
    return 'text-primary-500';
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className={`block text-sm font-medium mb-1.5 transition-colors duration-200 ${isDark ? 'text-gray-300' : 'text-gray-700'} ${isFocused ? getFocusIconColor() : ''}`}>
          {label}
        </label>
      )}
      {(addonLeft || addonRight) && (
        <div className={`flex ${fullWidth ? 'w-full' : ''}`}>
          {addonLeft && (
            <span className={`inline-flex items-center px-3 rounded-l-lg border border-r-0 transition-colors duration-200 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
              {addonLeft}
            </span>
          )}
          <div className="relative flex-1">
            {leftIcon && (
              <div className={`absolute inset-y-0 left-0 flex items-center pointer-events-none ${iconSizeClasses[size]} transition-colors duration-200 ${isFocused ? getFocusIconColor() : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {leftIcon}
              </div>
            )}
            <input
              ref={ref}
              type={inputType}
              className={`
                ${sizeClasses[size]}
                ${stateClass}
                ${leftIcon ? 'pl-10' : ''}
                ${rightIcon || showPasswordButton || showClearButton ? 'pr-10' : ''}
                ${widthClass}
                ${addonLeft ? 'rounded-l-none' : ''}
                ${addonRight ? 'rounded-r-none' : ''}
                border rounded-lg
                transition-all duration-200 ease-out
                focus:outline-none focus:ring-2
                ${getFocusRingClass()}
                disabled:cursor-not-allowed
              `}
              disabled={disabled}
              value={value}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              maxLength={maxLength}
              {...props}
            />
            {showPasswordButton && (
              <button
                type="button"
                className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-all duration-200 ${iconButtonBaseClass} rounded-md hover:scale-110 active:scale-95`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            )}
            {showClearButton && !showPasswordButton && (
              <button
                type="button"
                className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-all duration-200 ${iconButtonBaseClass} rounded-md hover:scale-110 active:scale-95`}
                onClick={handleClear}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {rightIcon && !showPasswordButton && !showClearButton && (
              <div className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-colors duration-200 ${isFocused ? getFocusIconColor() : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {rightIcon}
              </div>
            )}
          </div>
          {addonRight && (
            <span className={`inline-flex items-center px-3 rounded-r-lg border border-l-0 transition-colors duration-200 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
              {addonRight}
            </span>
          )}
        </div>
      )}
      {(!addonLeft && !addonRight) && (
        <div className="relative">
          {leftIcon && (
            <div className={`absolute inset-y-0 left-0 flex items-center pointer-events-none ${iconSizeClasses[size]} transition-colors duration-200 ${isFocused ? getFocusIconColor() : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              ${sizeClasses[size]}
              ${stateClass}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon || showPasswordButton || showClearButton ? 'pr-10' : ''}
              ${widthClass}
              border rounded-lg
              transition-all duration-200 ease-out
              focus:outline-none focus:ring-2
              ${getFocusRingClass()}
              disabled:cursor-not-allowed
            `}
            disabled={disabled}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            maxLength={maxLength}
            {...props}
          />
          {showPasswordButton && (
            <button
              type="button"
              className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-all duration-200 ${iconButtonBaseClass} rounded-md hover:scale-110 active:scale-95`}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
          {showClearButton && !showPasswordButton && (
            <button
              type="button"
              className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-all duration-200 ${iconButtonBaseClass} rounded-md hover:scale-110 active:scale-95`}
              onClick={handleClear}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {rightIcon && !showPasswordButton && !showClearButton && (
            <div className={`absolute inset-y-0 right-0 flex items-center pr-3 transition-colors duration-200 ${isFocused ? getFocusIconColor() : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {rightIcon}
            </div>
          )}
        </div>
      )}
      <div className="flex justify-between mt-1.5">
        <p className={`text-xs transition-colors duration-200 ${error ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
        {showCount && maxLength && (
          <p className={`text-xs transition-colors duration-200 ${isFocused ? getFocusIconColor() : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {characterCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  fullWidth = false,
  maxLength,
  showCount = false,
  className = '',
  disabled,
  value,
  ...props
}, ref) => {
  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();
  const [internalValue, setInternalValue] = useState(value as string ?? '');
  const [isFocused, setIsFocused] = useState(false);

  const currentValue = value !== undefined ? value : internalValue;
  const characterCount = typeof currentValue === 'string' ? currentValue.length : 0;

  const baseClasses = isDark
    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
    : isCyberpunk
    ? 'bg-[#0d1117] border-white/10 text-white placeholder-gray-500'
    : isAnime
    ? 'bg-pink-50/95 border-pink-300 text-pink-900 placeholder-pink-400'
    : isCosmos
    ? 'bg-[#030012]/90 border-violet-500/40 text-white placeholder-gray-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  const getFocusRingClass = () => {
    if (error) return 'focus:ring-red-500 focus:border-red-500';
    if (isAnime) return 'focus:ring-fuchsia-400 focus:border-fuchsia-400';
    if (isCosmos) return 'focus:ring-violet-400 focus:border-violet-400';
    return 'focus:ring-primary-500 focus:border-primary-500';
  };

  const getFocusColor = () => {
    if (error) return isDark ? 'text-red-400' : 'text-red-500';
    return 'text-primary-500';
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className={`block text-sm font-medium mb-1.5 transition-colors duration-200 ${isDark ? 'text-gray-300' : 'text-gray-700'} ${isFocused ? getFocusColor() : ''}`}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`
          px-4 py-2.5 text-sm
          ${baseClasses}
          ${fullWidth ? 'w-full' : ''}
          border rounded-lg
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2
          ${getFocusRingClass()}
          disabled:cursor-not-allowed
          resize-none
        `}
        disabled={disabled}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => {
          setInternalValue(e.target.value);
          props.onChange?.(e);
        }}
        maxLength={maxLength}
        {...props}
      />
      <div className="flex justify-between mt-1.5">
        <p className={`text-xs transition-colors duration-200 ${error ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
        {showCount && maxLength && (
          <p className={`text-xs transition-colors duration-200 ${isFocused ? getFocusColor() : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {characterCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  size?: InputSize;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  options,
  placeholder,
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  const { isDark, isCyberpunk, isAnime, isCosmos } = useTheme();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  const baseClasses = isDark
    ? 'bg-gray-800 border-gray-600 text-white'
    : isCyberpunk
    ? 'bg-[#0d1117] border-white/10 text-white'
    : isAnime
    ? 'bg-pink-50/95 border-pink-300 text-pink-900'
    : isCosmos
    ? 'bg-[#030012]/90 border-violet-500/40 text-white'
    : 'bg-white border-gray-300 text-gray-900';

  const getFocusRingClass = () => {
    if (error) return 'focus:ring-red-500 focus:border-red-500';
    if (isAnime) return 'focus:ring-fuchsia-400 focus:border-fuchsia-400';
    if (isCosmos) return 'focus:ring-violet-400 focus:border-violet-400';
    if (isDark) return 'focus:ring-blue-500 focus:border-blue-500';
    if (isCyberpunk) return 'focus:ring-cyan-500 focus:border-cyan-500';
    return 'focus:ring-blue-500 focus:border-blue-500';
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          ${sizeClasses[size]}
          ${baseClasses}
          ${fullWidth ? 'w-full' : ''}
          border rounded-lg
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2
          ${getFocusRingClass()}
          disabled:cursor-not-allowed
          appearance-none
          bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")]
          bg-[length:1.25rem_1.25rem]
          bg-[position:right_0.5rem_center]
          bg-no-repeat
          pr-10
          hover:border-gray-400
          active:scale-[0.98]
        `}
        disabled={disabled}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(error || helperText) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  onSearch,
  onChange,
  className = '',
  ...props
}, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch((e.target as HTMLInputElement).value);
    }
  };

  return (
    <Input
      ref={ref}
      leftIcon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      onChange={(e) => {
        onChange?.(e);
      }}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default Input;
