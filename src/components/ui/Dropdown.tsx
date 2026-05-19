import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'end';
  className?: string;
  onSelect?: (key: string) => void;
}

export function Dropdown({
  items,
  trigger,
  children,
  placement = 'bottom',
  align = 'start',
  className = '',
  onSelect,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const placementStyles: Record<string, string> = {
    'bottom-start': 'origin-top-left left-0 top-full mt-1',
    'bottom-end': 'origin-top-right right-0 top-full mt-1',
    'top-start': 'origin-bottom-left left-0 bottom-full mb-1',
    'top-end': 'origin-bottom-right right-0 bottom-full mb-1',
  };

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled || item.divider) return;
    setIsOpen(false);
    onSelect?.(item.key);
  };

  const actualPlacement = `${placement}-${align}`;

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {trigger ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="focus:outline-none"
        >
          {trigger}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {children || 'Dropdown'}
          <svg className="w-4 h-4 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div
          className={`absolute z-50 min-w-[12rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 ${placementStyles[actualPlacement]}`}
          role="menu"
        >
          {items.map((item, index) =>
            item.divider ? (
              <div
                key={`divider-${index}`}
                className="border-t border-gray-200 dark:border-gray-700 my-1"
              />
            ) : (
              <button
                key={item.key}
                type="button"
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  item.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 hover:font-semibold hover:text-red-700 dark:hover:text-red-300'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:font-semibold hover:text-gray-900 dark:hover:text-white'
                }`}
                role="menuitem"
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export interface SelectDropdownProps {
  value: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SelectDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg py-1 max-h-60 overflow-auto">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              disabled={option.disabled}
              className={`w-full px-3 py-2 text-left text-sm ${
                option.disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : option.value === value
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:font-semibold hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
