import { RotateCcw } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { DataSnapshot } from '../../../services/dataMigration';

interface RollbackModalProps {
  show: boolean;
  onClose: () => void;
  snapshot: DataSnapshot | null;
  confirmText: string;
  onConfirmTextChange: (text: string) => void;
  onConfirm: () => void;
}

export function RollbackModal({ show, onClose, snapshot, confirmText, onConfirmTextChange, onConfirm }: RollbackModalProps) {
  const t = useThemeStyles();

  if (!show || !snapshot) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>数据回滚</h2>
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${t.emptyBg}`}>
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw size={18} className="text-amber-500" />
              <span className={`font-medium ${t.text}`}>回滚快照信息</span>
            </div>
            <div className="text-sm space-y-1">
              <div className={`${t.textSecondary}`}>版本: <span className={t.text}>{snapshot.version}</span></div>
              <div className={`${t.textSecondary}`}>时间: <span className={t.text}>{new Date(snapshot.timestamp).toLocaleString()}</span></div>
              <div className={`${t.textSecondary}`}>项目数: <span className={t.text}>{snapshot.metadata.projectCount || 0}</span></div>
              <div className={`${t.textSecondary}`}>文档数: <span className={t.text}>{snapshot.metadata.documentCount || 0}</span></div>
              <div className={`${t.textSecondary}`}>用户数: <span className={t.text}>{snapshot.metadata.userCount || 0}</span></div>
            </div>
          </div>
          <div className={`p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm`}>
            ⚠️ 回滚将清除当前所有数据并恢复到上述快照状态，当前未保存的更改将丢失！
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>请输入 "确认回滚" 以继续</label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => onConfirmTextChange(e.target.value)}
              placeholder="确认回滚"
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmText !== '确认回滚'}
            className={`flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            确认回滚
          </button>
        </div>
      </div>
    </div>
  );
}