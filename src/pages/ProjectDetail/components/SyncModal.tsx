import { Package, Check, RefreshCw } from 'lucide-react';
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

  const handleToggle = (compId: string) => {
    if (selectedComponentIds.includes(compId)) {
      onSelectionChange(selectedComponentIds.filter(id => id !== compId));
    } else {
      onSelectionChange([...selectedComponentIds, compId]);
    }
  };

  const isAllSelected = adaptedComponents.length > 0 && selectedComponentIds.length === adaptedComponents.length;
  const isIndeterminate = selectedComponentIds.length > 0 && selectedComponentIds.length < adaptedComponents.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(adaptedComponents.map(c => c.id));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder} max-h-[90vh] overflow-y-auto shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${t.text}`}>同步软件到组件</h2>
          <div className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
            <span>软件:</span>
            <span className={`font-semibold ${t.text}`}>{targetSoftware.name}</span>
            <span className="text-gray-400">|</span>
            <span>v{targetSoftware.version}</span>
          </div>
        </div>

        <div className={`p-3 rounded-lg mb-4 border ${t.border} ${t.card}`}>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Package size={16} className={t.textMuted} />
              <span className={t.textSecondary}>适配组件:</span>
              <span className={`font-semibold ${t.accentText}`}>{adaptedComponents.length} 个</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-500" />
              <span className={t.textSecondary}>已选:</span>
              <span className="font-semibold text-emerald-600">{selectedComponentIds.length} 个</span>
            </div>
          </div>
        </div>

        {adaptedComponents.length === 0 ? (
          <div className={`text-center py-12 rounded-lg ${t.hoverBg}`}>
            <RefreshCw size={48} className="mx-auto opacity-40 mb-4" />
            <p className={`text-base font-medium mb-2 ${t.text}`}>该软件暂无适配组件</p>
            <p className={`text-sm ${t.textMuted}`}>请先编辑软件，添加需要适配的组件后再进行同步</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={handleSelectAll}
                  className="checkbox-interactive rounded w-5 h-5"
                />
                <span className={`text-base font-medium ${t.text}`}>全选</span>
              </label>
              <div className={`text-sm ${t.textMuted}`}>
                已选择 <span className={`font-semibold ${t.accentText}`}>{selectedComponentIds.length}</span> / {adaptedComponents.length} 个组件
              </div>
            </div>

            <div className={`border rounded-lg ${t.border} max-h-80 overflow-y-auto`}>
              {adaptedComponents.map((comp) => {
                const isSelected = selectedComponentIds.includes(comp.id);
                return (
                  <label
                    key={comp.id}
                    onClick={() => handleToggle(comp.id)}
                    className={`flex items-center gap-3 py-3 px-4 border-b last:border-b-0 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 shadow-sm'
                        : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-transparent'
                    } ${t.border}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {isSelected && <Check size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate flex items-center gap-2 ${isSelected ? 'text-emerald-800 dark:text-emerald-100' : 'text-gray-900 dark:text-gray-100'}`}>
                        {comp.componentName}
                      </div>
                      <div className={`text-xs mt-0.5 flex items-center gap-4 ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-400'}`}>
                        <span>编号: <span className="font-mono">{comp.componentNumber}</span></span>
                        {comp.productionOrderNumber && (
                          <span>指令号: <span className="font-mono">{comp.productionOrderNumber}</span></span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4 mt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2.5 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg} transition-opacity`}
          >
            取消
          </button>
          <button
            onClick={onSync}
            disabled={selectedComponentIds.length === 0}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
              selectedComponentIds.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : `${t.button} cursor-pointer`
            }`}
          >
            同步 ({selectedComponentIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}
