import { Trash2, Download, X, CheckSquare, Square, FolderOpen, Loader2, Edit3, GitBranch } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { ReactNode } from 'react';

interface BatchOperationsBarProps<_T> {
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
  isDeleting?: boolean;
  isExporting?: boolean;
  onBatchUpdateStage?: () => void;
  onBatchUpdateVersion?: () => void;
  onBatchUpdateStatus?: () => void;
  updateStageLabel?: string;
  updateVersionLabel?: string;
  updateStatusLabel?: string;
  isUpdatingStage?: boolean;
  isUpdatingVersion?: boolean;
  isUpdatingStatus?: boolean;
  customActions?: ReactNode[];
}

export function BatchOperationsBar({
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
  isDeleting = false,
  isExporting = false,
  onBatchUpdateStage,
  onBatchUpdateVersion,
  onBatchUpdateStatus,
  updateStageLabel = '批量改阶段',
  updateVersionLabel = '批量改版本',
  updateStatusLabel = '批量改状态',
  isUpdatingStage = false,
  isUpdatingVersion = false,
  isUpdatingStatus = false,
  customActions,
}: BatchOperationsBarProps<unknown>) {
  const { isDark, isCyberpunk } = useTheme();

  if (selectedCount === 0) {
    return null;
  }

  const getThemeClasses = () => {
    if (isCyberpunk) {
      return {
        container: 'bg-gradient-to-r from-fuchsia-600/20 via-purple-600/20 to-fuchsia-600/20 border-fuchsia-400/40 shadow-[0_8px_32px_rgba(192,132,252,0.15)]',
        iconActive: 'text-fuchsia-400',
        iconDefault: 'text-fuchsia-300',
        hoverBg: 'hover:bg-fuchsia-500/20',
        selectedHighlight: 'text-fuchsia-400',
        divider: 'border-fuchsia-400/30',
        buttonPrimary: 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-blue-300 hover:from-blue-500/40 hover:to-cyan-500/40 border border-blue-400/30',
        buttonDanger: 'bg-gradient-to-br from-red-500/30 to-pink-500/30 text-red-300 hover:from-red-500/40 hover:to-pink-500/40 border border-red-400/30',
        buttonSecondary: 'bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-amber-300 hover:from-amber-500/40 hover:to-orange-500/40 border border-amber-400/30',
        buttonTertiary: 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30 text-emerald-300 hover:from-emerald-500/40 hover:to-teal-500/40 border border-emerald-400/30',
        text: 'text-gray-100',
        closeHover: 'hover:bg-white/10 text-fuchsia-400',
      };
    }
    if (isDark) {
      return {
        container: 'bg-gradient-to-r from-gray-800/98 via-gray-800/95 to-gray-800/98 border-gray-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
        iconActive: 'text-blue-400',
        iconDefault: 'text-gray-400',
        hoverBg: 'hover:bg-white/10',
        selectedHighlight: 'text-blue-400',
        divider: 'border-gray-600',
        buttonPrimary: 'bg-gradient-to-br from-blue-600/30 to-indigo-600/30 text-blue-300 hover:from-blue-600/40 hover:to-indigo-600/40 border border-blue-500/30',
        buttonDanger: 'bg-gradient-to-br from-red-600/30 to-rose-600/30 text-red-300 hover:from-red-600/40 hover:to-rose-600/40 border border-red-500/30',
        buttonSecondary: 'bg-gradient-to-br from-amber-600/30 to-orange-600/30 text-amber-300 hover:from-amber-600/40 hover:to-orange-600/40 border border-amber-500/30',
        buttonTertiary: 'bg-gradient-to-br from-emerald-600/30 to-teal-600/30 text-emerald-300 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/30',
        text: 'text-gray-100',
        closeHover: 'hover:bg-white/10 text-gray-400',
      };
    }
    return {
      container: 'bg-gradient-to-r from-white/98 via-white/95 to-white/98 border-gray-200/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
      iconActive: 'text-blue-500',
      iconDefault: 'text-gray-400',
      hoverBg: 'hover:bg-gray-100',
      selectedHighlight: 'text-blue-500',
      divider: 'border-gray-200',
      buttonPrimary: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 hover:from-blue-500/20 hover:to-indigo-500/20 border border-blue-200',
      buttonDanger: 'bg-gradient-to-br from-red-500/10 to-rose-500/10 text-red-600 hover:from-red-500/20 hover:to-rose-500/20 border border-red-200',
      buttonSecondary: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-200',
      buttonTertiary: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-200',
      text: 'text-gray-700',
      closeHover: 'hover:bg-gray-100 text-gray-500',
    };
  };

  const theme = getThemeClasses();
  const progressPercentage = (selectedCount / totalCount) * 100;

  const hasActionButtons = onBatchExport || onBatchDelete || onBatchUpdateStage || onBatchUpdateVersion || customActions?.length;

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[var(--z-toast)] flex items-center gap-4 px-5 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl animate-slide-up ${theme.container}`}
      style={{
        minWidth: 'min(90vw, 600px)',
        maxWidth: '90vw',
      }}
    >
      <div
        className="absolute inset-x-0 -top-px left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30"
        style={{ width: '60%' }}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleAll}
          className={`p-2 rounded-xl transition-all duration-200 ${theme.hoverBg} ${
            isAllSelected || isIndeterminate ? theme.iconActive : theme.iconDefault
          } hover:scale-105 active:scale-95`}
          aria-label={isAllSelected ? '取消全选' : '全选'}
        >
          {isAllSelected ? (
            <CheckSquare size={20} className="drop-shadow-lg" />
          ) : isIndeterminate ? (
            <div className="relative">
              <CheckSquare size={20} className="opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2.5 h-0.5 bg-current rounded-full" />
              </div>
            </div>
          ) : (
            <Square size={20} className="opacity-70" />
          )}
        </button>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <FolderOpen
              size={16}
              className={isCyberpunk ? 'text-fuchsia-400' : isDark ? 'text-gray-400' : 'text-gray-400'}
            />
            <span className={`text-sm font-semibold ${theme.text}`}>
              已选择{' '}
              <span className={`${theme.selectedHighlight} tabular-nums`}>
                {selectedCount}
              </span>{' '}
              <span className="text-gray-400 mx-0.5">/</span> {totalCount} 个{itemType}
            </span>
          </div>
          <div className="w-24 h-1.5 bg-gray-600/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCyberpunk
                  ? 'bg-gradient-to-r from-fuchsia-400 to-pink-400'
                  : isDark
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {hasActionButtons && <div className={`w-px h-8 ${theme.divider} mx-1`} />}

      <div className="flex items-center gap-2.5">
        {onBatchUpdateStage && (
          <button
            onClick={onBatchUpdateStage}
            disabled={isUpdatingStage}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${theme.buttonSecondary} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
          >
            {isUpdatingStage ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Edit3 size={15} className="drop-shadow-sm" />
            )}
            <span>{isUpdatingStage ? '修改中...' : updateStageLabel}</span>
          </button>
        )}

        {onBatchUpdateVersion && (
          <button
            onClick={onBatchUpdateVersion}
            disabled={isUpdatingVersion}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${theme.buttonTertiary} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
          >
            {isUpdatingVersion ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <GitBranch size={15} className="drop-shadow-sm" />
            )}
            <span>{isUpdatingVersion ? '修改中...' : updateVersionLabel}</span>
          </button>
        )}

        {onBatchUpdateStatus && (
          <button
            onClick={onBatchUpdateStatus}
            disabled={isUpdatingStatus}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
          >
            {isUpdatingStatus ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Edit3 size={15} className="drop-shadow-sm" />
            )}
            <span>{isUpdatingStatus ? '修改中...' : updateStatusLabel}</span>
          </button>
        )}

        {onBatchExport && (
          <button
            onClick={onBatchExport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
          >
            {isExporting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} className="drop-shadow-sm" />
            )}
            <span>{isExporting ? '导出中...' : exportLabel}</span>
          </button>
        )}

        {onBatchDelete && (
          <button
            onClick={onBatchDelete}
            disabled={isDeleting}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${theme.buttonDanger} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
          >
            {isDeleting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} className="drop-shadow-sm" />
            )}
            <span>{isDeleting ? '删除中...' : deleteLabel}</span>
          </button>
        )}

        {customActions}
      </div>

      <div className={`w-px h-8 ${theme.divider} mx-1`} />

      <button
        onClick={onDeselectAll}
        className={`p-2 rounded-xl transition-all duration-200 ${theme.closeHover} hover:scale-105 active:scale-95`}
        aria-label="清除选择"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default BatchOperationsBar;