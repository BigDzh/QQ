import React from 'react';
import { Trash2, Download, X, CheckSquare, Square, FolderOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface BatchOperationsBarProps<T> {
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onToggleAll: () => void;
  onDeselectAll: () => void;
  onBatchDelete?: () => void;
  onBatchExport?: () => void;
  itemType?: string;
  deleteLabel?: string;
  exportLabel?: string;
}

export function BatchOperationsBar<T>({
  selectedCount,
  totalCount,
  isAllSelected,
  isIndeterminate,
  onToggleAll,
  onDeselectAll,
  onBatchDelete,
  onBatchExport,
  itemType = '项目',
  deleteLabel = '删除',
  exportLabel = '导出',
}: BatchOperationsBarProps<T>) {
  const { theme, isDark, isCyberpunk } = useTheme();
  const t = useThemeStyles();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[var(--z-toast)] flex items-center gap-4 px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-md animate-slide-up ${
        isCyberpunk
          ? 'bg-fuchsia-500/10 border-fuchsia-400/30'
          : isDark
          ? 'bg-gray-800/95 border-gray-600'
          : 'bg-white/95 border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleAll}
          className={`p-2 rounded-lg transition-colors ${
            isCyberpunk
              ? 'hover:bg-fuchsia-500/20 text-fuchsia-400'
              : isDark
              ? 'hover:bg-white/10 text-gray-400'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
          aria-label={isAllSelected ? '取消全选' : '全选'}
        >
          {isAllSelected ? (
            <CheckSquare size={18} className={isCyberpunk ? 'text-fuchsia-400' : 'text-blue-500'} />
          ) : isIndeterminate ? (
            <CheckSquare size={18} className={isCyberpunk ? 'text-fuchsia-400' : 'text-blue-500'} />
          ) : (
            <Square size={18} />
          )}
        </button>

        <div className="flex items-center gap-2">
          <FolderOpen
            size={16}
            className={isCyberpunk ? 'text-fuchsia-400' : 'text-gray-400'}
          />
          <span className={`text-sm font-medium ${t.text}`}>
            已选择{' '}
            <span className={isCyberpunk ? 'text-fuchsia-400' : 'text-blue-500'}>
              {selectedCount}
            </span>{' '}
            / {totalCount} 个{itemType}
          </span>
        </div>
      </div>

      <div className={`w-px h-6 ${t.border}`} />

      <div className="flex items-center gap-2">
        {onBatchExport && (
          <button
            onClick={onBatchExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCyberpunk
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : isDark
                ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <Download size={16} />
            {exportLabel}
          </button>
        )}

        {onBatchDelete && (
          <button
            onClick={onBatchDelete}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCyberpunk
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : isDark
                ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            <Trash2 size={16} />
            {deleteLabel}
          </button>
        )}
      </div>

      <div className={`w-px h-6 ${t.border}`} />

      <button
        onClick={onDeselectAll}
        className={`p-2 rounded-lg transition-colors ${
          isCyberpunk
            ? 'hover:bg-white/10 text-fuchsia-400'
            : isDark
            ? 'hover:bg-white/10 text-gray-400'
            : 'hover:bg-gray-100 text-gray-500'
        }`}
        aria-label="清除选择"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default BatchOperationsBar;