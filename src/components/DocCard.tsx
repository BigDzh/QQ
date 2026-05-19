import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';

type DocCardVariant = 'default' | 'compact' | 'detailed';
type DocStatus = 'completed' | 'pending' | 'draft' | 'archived';

interface DocCardProps {
  children?: React.ReactNode;
  className?: string;
  variant?: DocCardVariant;
  title?: string;
  version?: string;
  status?: DocStatus;
  description?: string;
  docNumber?: string;
  md5?: string;
  updatedAt?: string;
  hoverable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
}

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  completed: { bg: 'bg-emerald-500/25', text: 'text-emerald-200', border: 'border-emerald-400/50', label: '已完成' },
  pending: { bg: 'bg-amber-500/25', text: 'text-amber-200', border: 'border-amber-400/50', label: '待处理' },
  draft: { bg: 'bg-slate-500/25', text: 'text-slate-200', border: 'border-slate-400/50', label: '草稿' },
  archived: { bg: 'bg-gray-500/25', text: 'text-gray-200', border: 'border-gray-400/50', label: '已归档' },
};

export function DocCard({
  children,
  className = '',
  variant = 'default',
  title,
  version,
  status = 'completed',
  description,
  docNumber,
  md5,
  updatedAt,
  hoverable = true,
  selected = false,
  onSelect,
  onClick,
  actions,
  headerActions,
  footer,
}: DocCardProps) {
  const { isDark, isCyberpunk, isAnime, theme } = useTheme();
  const t = useThemeStyles();

  const getCardClasses = () => {
    const baseClasses = 'relative rounded-xl border transition-all duration-200 ease-out';

    let bgClasses = '';
    let borderClasses = '';
    let shadowClasses = 'shadow-sm';

    if (isCyberpunk) {
      bgClasses = selected ? 'bg-[#1a1a2e]/90' : 'bg-[#12121a]/80 backdrop-blur-xl';
      borderClasses = selected ? 'border-cyan-400/60' : 'border-cyan-400/40';
      shadowClasses = selected ? 'shadow-lg shadow-cyan-500/20' : 'shadow-sm';
    } else if (isAnime) {
      bgClasses = selected ? 'bg-white/90' : 'bg-white/75 backdrop-blur-xl';
      borderClasses = selected ? 'border-pink-400/60' : 'border-pink-300/50';
      shadowClasses = selected ? 'shadow-lg shadow-pink-500/20' : 'shadow-sm';
    } else if (theme === 'cosmos') {
      bgClasses = selected ? 'bg-[#0d1b2a]/90' : 'bg-[#0d1b2a]/75 backdrop-blur-2xl';
      borderClasses = selected ? 'border-cyan-400/60' : 'border-cyan-400/40';
      shadowClasses = selected ? 'shadow-lg shadow-cyan-500/20' : 'shadow-sm';
    } else if (theme === 'linear') {
      bgClasses = selected ? 'bg-[#1c1c1f]/90' : 'bg-[#141416]/80 backdrop-blur-xl';
      borderClasses = selected ? 'border-[#5e6ad2]/50' : 'border-[#3c3c42]';
      shadowClasses = selected ? 'shadow-lg shadow-[#5e6ad2]/10' : 'shadow-sm';
    } else if (isDark) {
      bgClasses = selected ? 'bg-gray-700/90' : 'bg-gray-800/80 backdrop-blur-xl';
      borderClasses = selected ? 'border-gray-500/60' : 'border-gray-600';
      shadowClasses = selected ? 'shadow-lg' : 'shadow-sm';
    } else {
      bgClasses = selected ? 'bg-white/95' : 'bg-white/90 backdrop-blur-md';
      borderClasses = selected ? 'border-gray-400/60' : 'border-gray-200';
      shadowClasses = selected ? 'shadow-lg' : 'shadow-sm';
    }

    let hoverClasses = '';
    if (hoverable && !selected) {
      if (isCyberpunk) {
        hoverClasses = 'hover:bg-[#1a2028]/80 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10';
      } else if (isAnime) {
        hoverClasses = 'hover:bg-white/90 hover:border-pink-400/60 hover:shadow-lg hover:shadow-pink-500/15';
      } else if (theme === 'cosmos') {
        hoverClasses = 'hover:bg-cyan-500/10 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/15';
      } else if (theme === 'linear') {
        hoverClasses = 'hover:bg-[#1c1c1f]/90 hover:border-[#5e6ad2]/40 hover:shadow-lg hover:shadow-[#5e6ad2]/10';
      } else if (isDark) {
        hoverClasses = 'hover:bg-gray-700/80 hover:border-gray-500 hover:shadow-lg';
      } else {
        hoverClasses = 'hover:bg-white hover:border-gray-300 hover:shadow-lg';
      }
    }

    const cursorClass = onClick ? 'cursor-pointer' : '';
    const transitionClass = 'transition-all duration-200 ease-out';
    const zIndexClass = selected ? 'z-10' : hoverable ? 'hover:z-10' : '';

    return `${baseClasses} ${zIndexClass} ${bgClasses} ${borderClasses} ${shadowClasses} ${hoverClasses} ${cursorClass} ${transitionClass} ${className}`;
  };

  const statusStyle = statusConfig[status] || statusConfig.completed;

  const renderCompactContent = () => (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {title && (
            <span className={`font-medium ${isDark || isCyberpunk || theme === 'cosmos' || theme === 'linear' ? 'text-white' : 'text-gray-900'} hover:underline truncate`}>
              {title}
            </span>
          )}
          {version && (
            <span className={`text-sm ${t.textMuted}`}>{version}</span>
          )}
          <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
            {statusStyle.label}
          </span>
        </div>
        {(description || docNumber) && (
          <div className="flex items-center gap-2 flex-wrap">
            {docNumber && (
              <span className={`text-xs ${t.textMuted}`}>编号: {docNumber}</span>
            )}
            {description && (
              <span className={`text-xs ${t.textMuted} truncate`}>{description}</span>
            )}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );

  const renderDefaultContent = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {title && (
              <h3 className={`font-semibold ${isDark || isCyberpunk || theme === 'cosmos' || theme === 'linear' ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h3>
            )}
            {version && (
              <span className={`text-sm ${t.textMuted}`}>{version}</span>
            )}
          </div>
          {description && (
            <p className={`text-sm ${t.textMuted} line-clamp-2`}>{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      {(docNumber || md5 || updatedAt) && (
        <div className={`grid grid-cols-1 gap-1 text-xs ${t.textMuted}`}>
          {docNumber && <div>文档编号: {docNumber}</div>}
          {md5 && <div className="flex items-center gap-1">
            <span>MD5:</span>
            <code className="px-1 py-0.5 rounded bg-gray-200/50 dark:bg-gray-700/50 font-mono text-[10px]">{md5}</code>
          </div>}
          {updatedAt && <div>更新时间: {updatedAt}</div>}
        </div>
      )}

      {children && (
        <div className="mt-3">
          {children}
        </div>
      )}

      {(actions || headerActions || footer) && (
        <div className={`flex items-center justify-between pt-3 border-t ${t.border}`}>
          <div className="flex items-center gap-1">
            {footer}
          </div>
          <div className="flex items-center gap-1">
            {headerActions}
            {actions}
          </div>
        </div>
      )}
    </div>
  );

  const renderDetailedContent = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect(e.target.checked)}
                className="w-4 h-4 rounded border-cyan-400/50 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer"
              />
            )}
            <h3 className={`text-lg font-semibold ${isDark || isCyberpunk || theme === 'cosmos' || theme === 'linear' ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h3>
            {version && (
              <span className={`px-2 py-1 rounded text-xs ${t.textMuted} bg-gray-200/50 dark:bg-gray-700/50`}>
                v{version}
              </span>
            )}
          </div>
          <p className={`text-sm ${t.textMuted} ml-7`}>{description}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}>
          {statusStyle.label}
        </span>
      </div>

      <div className={`grid grid-cols-3 gap-4 p-4 rounded-lg ${t.card} ${t.border} border`}>
        {docNumber && (
          <div>
            <div className={`text-xs ${t.textMuted} mb-1`}>文档编号</div>
            <div className={`text-sm font-mono ${t.text}`}>{docNumber}</div>
          </div>
        )}
        {md5 && (
          <div>
            <div className={`text-xs ${t.textMuted} mb-1`}>文件校验</div>
            <div className="flex items-center gap-1">
              <code className={`text-xs font-mono ${t.text} px-1 py-0.5 rounded bg-gray-200/30 dark:bg-gray-700/30`}>{md5}</code>
              <button className={`p-1 rounded hover:bg-gray-200/50 dark:hover:bg-gray-700/50 ${t.textMuted} hover:${t.text}`} title="复制">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
        {updatedAt && (
          <div>
            <div className={`text-xs ${t.textMuted} mb-1`}>更新时间</div>
            <div className={`text-sm ${t.text}`}>{updatedAt}</div>
          </div>
        )}
      </div>

      {children && <div>{children}</div>}

      {(actions || headerActions) && (
        <div className={`flex items-center justify-end gap-2 pt-3 border-t ${t.border}`}>
          {actions}
          {headerActions}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={getCardClasses()}
      onClick={onClick}
    >
      {variant === 'compact' && renderCompactContent()}
      {variant === 'default' && renderDefaultContent()}
      {variant === 'detailed' && renderDetailedContent()}
    </div>
  );
}

interface DocCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function DocCardGrid({ children, className = '', columns = 3 }: DocCardGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={`grid ${columnClasses[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
}

export default DocCard;
