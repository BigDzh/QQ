import React, { useState } from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  content?: React.ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
  variant?: 'line' | 'card' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles: Record<string, string> = {
  line: '',
  card: 'p-1 rounded-lg',
  bordered: '',
};

const sizeStyles: Record<string, { tab: string; padding: string }> = {
  sm: { tab: 'px-3 py-1.5 text-sm', padding: 'p-3' },
  md: { tab: 'px-4 py-2 text-sm', padding: 'p-4' },
  lg: { tab: 'px-5 py-2.5 text-base', padding: 'p-5' },
};

export function Tabs({
  tabs,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
  variant = 'line',
  size = 'md',
  className = '',
}: TabsProps) {
  const t = useThemeStyles();
  const [uncontrolledActiveKey, setUncontrolledActiveKey] = useState(defaultActiveKey || tabs[0]?.key);

  const isControlled = controlledActiveKey !== undefined;
  const activeKey = isControlled ? controlledActiveKey : uncontrolledActiveKey;

  const handleTabClick = (key: string, disabled?: boolean) => {
    if (disabled) return;
    if (!isControlled) {
      setUncontrolledActiveKey(key);
    }
    onChange?.(key);
  };

  const activeTab = tabs.find(tab => tab.key === activeKey);

  return (
    <div className={className}>
      <div className={`flex ${variantStyles[variant]} ${t.card} border ${t.border}`} role="tablist">
        {tabs.map(tab => {
          const isActive = tab.key === activeKey;
          const baseClasses = `transition-all duration-200 font-medium ${
            sizeStyles[size].tab
          } ${variant === 'line' ? 'border-b-2' : 'rounded-md'}`;

          if (variant === 'line') {
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key, tab.disabled)}
                disabled={tab.disabled}
                role="tab"
                aria-selected={isActive}
                className={`${baseClasses} ${
                  isActive
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 font-semibold'
                    : `border-transparent ${t.textSecondary} hover:${t.text} hover:font-semibold`
                } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="flex items-center gap-2">
                  {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key, tab.disabled)}
                disabled={tab.disabled}
                role="tab"
                aria-selected={isActive}
                className={`${baseClasses} ${
                  isActive
                    ? `${t.card} ${t.text} shadow-sm font-semibold`
                    : `${t.textSecondary} hover:${t.text} hover:font-semibold`
                } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
              <span className="flex items-center gap-2">
                {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className={sizeStyles[size].padding} role="tabpanel">
        {activeTab?.content}
      </div>
    </div>
  );
}

export interface TabPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ children, className = '' }: TabPanelProps) {
  return <div className={className}>{children}</div>;
}
