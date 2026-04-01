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
  illustration?: 'simple' | 'detailed';
  className?: string;
}

const defaultIcons = {
  simple: (
    <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  detailed: (
    <svg className="w-24 h-24 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
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
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      <div className={`mb-4 ${t.textMuted}`}>
        {icon || defaultIcons[illustration]}
      </div>
      <h3 className={`text-lg font-semibold ${t.text} mb-2`}>
        {title}
      </h3>
      {description && (
        <p className={`text-sm ${t.textSecondary} max-w-sm mb-4`}>
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="action-btn action-btn-primary"
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
        <EmptyState title={message} illustration="simple" />
      </td>
    </tr>
  );
}
