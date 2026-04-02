import React from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: 'simple' | 'detailed' | 'animated';
  className?: string;
}

const defaultIcons = {
  simple: (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  detailed: (
    <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  animated: (
    <div className="relative">
      {/* 外圈 - 呼吸动画 */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-400/10 animate-ping" style={{ animationDuration: '3s' }} />
      {/* 中圈 */}
      <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-primary-500/10 to-transparent animate-pulse" style={{ animationDuration: '2s' }} />
      {/* 图标 */}
      <svg className="w-20 h-20 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
  ),
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  illustration = 'simple',
  className = '',
}: EmptyStateProps) {
  const t = useThemeStyles();

  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-4 ${className}`}>
      {/* 图标区域 */}
      <div className={`mb-6 transition-all duration-300 ${t.textMuted} group/icon`}>
        <div className={`transition-transform duration-300 group-hover/icon:scale-110 group-hover/icon:-translate-y-1 ${
          illustration === 'animated' ? 'animate-fade-slide-up' : ''
        }`}>
          {icon || defaultIcons[illustration]}
        </div>
      </div>

      {/* 标题 */}
      <h3 className={`text-lg font-semibold ${t.text} mb-2 animate-fade-slide-up stagger-1`}>
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className={`text-sm ${t.textSecondary} max-w-sm mb-6 leading-relaxed animate-fade-slide-up stagger-2`}>
          {description}
        </p>
      )}

      {/* 操作按钮 */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`
            px-6 py-2.5 text-sm font-medium rounded-xl
            bg-primary-600 text-white
            hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-0.5
            active:bg-primary-700 active:translate-y-0 active:shadow-sm
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            transition-all duration-200 ease-out
            animate-fade-slide-up stagger-3
            shine-sweep
          `}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export interface EmptyTableProps {
  columns: number;
  message?: string;
  className?: string;
}

export function EmptyTable({
  columns,
  message = '暂无数据',
  className = '',
}: EmptyTableProps) {
  return (
    <tr className={className}>
      <td colSpan={columns} className="px-4 py-8 text-center">
        <EmptyState title={message} illustration="animated" />
      </td>
    </tr>
  );
}
