import { Package } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { Software, Component } from '../../../types';

interface SyncModalProps {
  show: boolean;
  onClose: () => void;
  targetSoftware: Software | null;
  selectedComponentIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSync: () => void;
  components: Component[];
}

export function SyncModal({ show, onClose, targetSoftware, selectedComponentIds, onSelectionChange, onSync, components }: SyncModalProps) {
  const t = useThemeStyles();

  if (!show || !targetSoftware) return null;

  const adaptedComponents = components.filter(comp =>
    targetSoftware.adaptedComponentIds?.includes(comp.id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>同步软件到组件</h2>
        <div className={`mb-4 p-3 rounded-lg border ${t.border} ${t.card}`}>
          <div className={`text-sm ${t.textSecondary}`}>目标软件: <span className={t.text}>{targetSoftware.name}</span></div>
          <div className={`text-sm ${t.textSecondary}`}>版本: <span className={t.text}>{targetSoftware.version}</span></div>
          <div className={`text-sm ${t.textSecondary}`}>适配组件: <span className={t.text}>{targetSoftware.adaptedComponentIds?.length || 0} 个</span></div>
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>选择要同步的适配组件</label>
          <div className={`border rounded-lg p-3 max-h-60 overflow-y-auto ${t.border}`}>
            {adaptedComponents.length === 0 ? (
              <p className={`text-sm ${t.textMuted}`}>该软件暂无适配组件</p>
            ) : (
              adaptedComponents.map((comp) => (
                <label key={comp.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedComponentIds.includes(comp.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange([...selectedComponentIds, comp.id]);
                      } else {
                        onSelectionChange(selectedComponentIds.filter(id => id !== comp.id));
                      }
                    }}
                    className="checkbox-interactive rounded"
                  />
                  <Package size={14} className={t.textMuted} />
                  <span className={t.text}>{comp.componentName}</span>
                  <span className={`text-xs ${t.textMuted}`}>({comp.componentNumber})</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
          >
            取消
          </button>
          <button
            onClick={onSync}
            disabled={selectedComponentIds.length === 0}
            className={`flex-1 py-2 rounded-lg ${
              selectedComponentIds.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : t.button
            }`}
          >
            同步 ({selectedComponentIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}