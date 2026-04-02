import React, { useState } from 'react';
import { AlertTriangle, File, Clock, HardDrive, X } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

export interface FileConflictInfo {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  existingFileName: string;
  existingFileSize: number;
  existingFileUploadDate: string;
}

export interface FileConflictModalProps {
  show: boolean;
  conflict: FileConflictInfo | null;
  onReplace: () => void;
  onKeepExisting: () => void;
  onCancel: () => void;
  onApplyToAll: ((action: 'replace' | 'keep') => void) | null;
}

export function FileConflictModal({
  show,
  conflict,
  onReplace,
  onKeepExisting,
  onCancel,
  onApplyToAll,
}: FileConflictModalProps) {
  const t = useThemeStyles();
  const [applyToAll, setApplyToAll] = useState(false);

  if (!show || !conflict) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleReplace = () => {
    if (applyToAll && onApplyToAll) {
      onApplyToAll('replace');
    } else {
      onReplace();
    }
  };

  const handleKeepExisting = () => {
    if (applyToAll && onApplyToAll) {
      onApplyToAll('keep');
    } else {
      onKeepExisting();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]" onClick={onCancel}>
      <div className={`${t.modalBg} rounded-lg w-full max-w-lg border ${t.modalBorder} shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-4 border-b ${t.border}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-500" />
            <h2 className={`text-lg font-semibold ${t.text}`}>文件冲突</h2>
          </div>
          <button
            onClick={onCancel}
            className={`p-1 rounded hover:${t.hoverBg} ${t.textMuted}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className={`text-sm ${t.textSecondary}`}>
            目标文件夹中已存在同名文件，请选择如何处理：
          </p>

          <div className={`${t.card} rounded-lg border ${t.border} overflow-hidden`}>
            <div className={`p-3 ${t.emptyBg} border-b ${t.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <File size={16} className={t.textMuted} />
                <span className={`text-sm font-medium ${t.text}`}>新文件</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className={t.textMuted}>文件名:</span>
                  <span className={t.text} title={conflict.fileName}>{conflict.fileName.length > 20 ? conflict.fileName.slice(0, 20) + '...' : conflict.fileName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive size={12} className={t.textMuted} />
                  <span className={t.text}>{formatFileSize(conflict.fileSize)}</span>
                </div>
                <div className="flex items-center gap-1 col-span-2">
                  <Clock size={12} className={t.textMuted} />
                  <span className={t.textMuted}>修改日期:</span>
                  <span className={t.text}>{conflict.uploadDate}</span>
                </div>
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <File size={16} className="text-blue-500" />
                <span className={`text-sm font-medium ${t.text}`}>现有文件</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className={t.textMuted}>文件名:</span>
                  <span className={t.text} title={conflict.existingFileName}>{conflict.existingFileName.length > 20 ? conflict.existingFileName.slice(0, 20) + '...' : conflict.existingFileName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive size={12} className={t.textMuted} />
                  <span className={t.text}>{formatFileSize(conflict.existingFileSize)}</span>
                </div>
                <div className="flex items-center gap-1 col-span-2">
                  <Clock size={12} className={t.textMuted} />
                  <span className={t.textMuted}>修改日期:</span>
                  <span className={t.text}>{conflict.existingFileUploadDate}</span>
                </div>
              </div>
            </div>
          </div>

          {onApplyToAll && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className={`text-sm ${t.textSecondary}`}>应用于所有冲突文件</span>
            </label>
          )}

          <div className={`p-3 rounded-lg ${t.emptyBg} border ${t.border}`}>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle size={14} className="inline mr-1" />
              替换操作不可撤销，现有文件将被永久覆盖
            </p>
          </div>
        </div>

        <div className={`flex gap-3 p-4 border-t ${t.border}`}>
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-colors`}
          >
            取消上传
          </button>
          <button
            onClick={handleKeepExisting}
            className={`flex-1 py-2.5 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-colors`}
          >
            保留现有
          </button>
          <button
            onClick={handleReplace}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            替换文件
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileConflictModal;