import { Plus } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { Software } from '../../../types';

interface VersionModalProps {
  show: boolean;
  onClose: () => void;
  software: Software | null;
  versionInput: string;
  onVersionChange: (v: string) => void;
  onSubmit: (version: string) => void;
  onIncrement?: () => void;
}

export function VersionModal({ show, onClose, software, versionInput, onVersionChange, onSubmit, onIncrement }: VersionModalProps) {
  const t = useThemeStyles();

  if (!show || !software) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>更新软件版本</h2>
        <div className="space-y-4">
          <div>
            <div className={`text-sm ${t.textSecondary} mb-1`}>当前版本</div>
            <div className={`text-lg font-medium ${t.text}`}>{software.version}</div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>新版本号</label>
            <input
              type="text"
              value={versionInput}
              onChange={(e) => onVersionChange(e.target.value)}
              placeholder="如: 1.0.1"
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              pattern="^\d+\.\d+\.\d+$"
            />
          </div>
          {onIncrement && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onIncrement}
                className={`px-3 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} text-sm flex items-center gap-1`}
              >
                <Plus size={14} /> 自动+1
              </button>
            </div>
          )}
          <div className={`text-xs ${t.textMuted}`}>
            格式说明：主版本号.次版本号.修订号（如 1.0.1）
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
          >
            取消
          </button>
          <button
            onClick={() => onSubmit(versionInput)}
            className={`flex-1 py-2 ${t.button} rounded-lg`}
          >
            确认更新
          </button>
        </div>
      </div>
    </div>
  );
}
