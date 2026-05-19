import React from 'react';
import { useThemeStyles } from '../../hooks/useThemeStyles';

export interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  showQuickJumper?: boolean;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export function Pagination({
  current,
  total,
  pageSize = 10,
  onChange,
  showQuickJumper = false,
  showSizeChanger = false,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  className = '',
}: PaginationProps) {
  const t = useThemeStyles();
  const totalPages = Math.ceil(total / pageSize);
  const [inputValue, setInputValue] = React.useState('');

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (current >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
  };

  const handleQuickJumperSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputValue, 10);
    if (page >= 1 && page <= totalPages) {
      onChange(page);
      setInputValue('');
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(current - 1)}
          disabled={current <= 1}
          className="action-btn action-btn-sm action-btn-outline"
          aria-label="上一页"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {getPageNumbers().map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className={`px-2 ${t.textMuted}`}>
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onChange(page)}
              className={`action-btn action-btn-sm ${
                current === page
                  ? 'action-btn-primary'
                  : 'action-btn-outline'
              }`}
              aria-label={`第${page}页`}
              aria-current={current === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(current + 1)}
          disabled={current >= totalPages}
          className="action-btn action-btn-sm action-btn-outline"
          aria-label="下一页"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {showSizeChanger && (
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
          className="select-field max-w-[120px]"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>
              {size} / 页
            </option>
          ))}
        </select>
      )}

      {showQuickJumper && (
        <form onSubmit={handleQuickJumperSubmit} className="flex items-center gap-2">
          <span className={`text-sm ${t.textSecondary}`}>跳至</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="input-field w-16 text-center"
          />
          <span className={`text-sm ${t.textSecondary}`}>页</span>
        </form>
      )}

      <span className={`text-sm ${t.textSecondary}`}>
        共 {total} 条
      </span>
    </div>
  );
}

export interface SimplePaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  className?: string;
}

export function SimplePagination({
  current,
  total,
  pageSize = 10,
  onChange,
  className = '',
}: SimplePaginationProps) {
  const t = useThemeStyles();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(current - 1)}
        disabled={current <= 1}
        className="action-btn action-btn-sm action-btn-outline"
        aria-label="上一页"
      >
        上一页
      </button>
      <span className={`px-3 py-1.5 text-sm ${t.text}`}>
        {current} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(current + 1)}
        disabled={current >= totalPages}
        className="action-btn action-btn-sm action-btn-outline"
        aria-label="下一页"
      >
        下一页
      </button>
    </div>
  );
}
