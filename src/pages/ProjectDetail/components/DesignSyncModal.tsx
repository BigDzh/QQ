import { Package, Check, RefreshCw, FileText } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

interface DesignSyncModalProps {
  show: boolean;
  onClose: () => void;
  targetDesignFile: any;
  selectedModuleIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSync: () => void;
  modules: any[];
  components: any[];
}

export function DesignSyncModal({ show, onClose, targetDesignFile, selectedModuleIds, onSelectionChange, onSync, modules, components }: DesignSyncModalProps) {
  const t = useThemeStyles();

  if (!show || !targetDesignFile) return null;

  const adaptedModules = modules.filter((m: any) => targetDesignFile?.adaptedModuleIds?.includes(m.id));
  const adaptedComponents = components.filter((c: any) => targetDesignFile?.adaptedComponentIds?.includes(c.id));

  const handleToggle = (id: string) => {
    if (selectedModuleIds.includes(id)) {
      onSelectionChange(selectedModuleIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedModuleIds, id]);
    }
  };

  const allTargets = [...adaptedModules, ...adaptedComponents];
  const isAllSelected = allTargets.length > 0 && selectedModuleIds.length === allTargets.length;
  const isIndeterminate = selectedModuleIds.length > 0 && selectedModuleIds.length < allTargets.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allTargets.map((t: any) => t.id));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder} max-h-[90vh] overflow-y-auto shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${t.text}`}>同步设计文件</h2>
          <div className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
            <span>文件:</span>
            <span className={`font-semibold ${t.text}`}>{targetDesignFile.name}</span>
          </div>
        </div>

        <div className={`p-3 rounded-lg mb-4 border ${t.border} ${t.card}`}>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Package size={16} className={t.textMuted} />
              <span className={t.textSecondary}>适配目标:</span>
              <span className={`font-semibold ${t.accentText}`}>{allTargets.length} 个</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-500" />
              <span className={t.textSecondary}>已选:</span>
              <span className="font-semibold text-emerald-600">{selectedModuleIds.length} 个</span>
            </div>
          </div>
        </div>

        {allTargets.length === 0 ? (
          <div className={`text-center py-12 rounded-lg ${t.hoverBg}`}>
            <RefreshCw size={48} className="mx-auto opacity-40 mb-4" />
            <p className={`text-base font-medium mb-2 ${t.text}`}>该文件暂无适配目标</p>
            <p className={`text-sm ${t.textMuted}`}>请先编辑文件，添加需要适配的模块或组件后再进行同步</p>
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
                已选择 <span className={`font-semibold ${t.accentText}`}>{selectedModuleIds.length}</span> / {allTargets.length} 个目标
              </div>
            </div>

            <div className={`border rounded-lg ${t.border} max-h-60 overflow-y-auto`}>
              {adaptedModules.length > 0 && (
                <div>
                  <div className={`px-4 py-2.5 text-sm font-semibold border-b ${t.border} bg-gray-100 dark:bg-gray-800 ${t.text}`}>
                    模块
                  </div>
                  <div className="p-2">
                    {adaptedModules.map((module: any) => {
                      const isSelected = selectedModuleIds.includes(module.id);
                      return (
                        <label
                          key={module.id}
                          onClick={() => handleToggle(module.id)}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700'
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {isSelected && <Check size={14} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-800 dark:text-emerald-100' : t.text}`}>
                              {module.moduleName}
                            </div>
                            <div className={`text-xs ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : t.textSecondary}`}>
                              编号: <span className="font-mono">{module.moduleNumber}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {adaptedComponents.length > 0 && (
                <div>
                  <div className={`px-4 py-2.5 text-sm font-semibold border-b ${t.border} bg-gray-100 dark:bg-gray-800 ${t.text}`}>
                    组件
                  </div>
                  <div className="p-2">
                    {adaptedComponents.map((comp: any) => {
                      const isSelected = selectedModuleIds.includes(comp.id);
                      return (
                        <label
                          key={comp.id}
                          onClick={() => handleToggle(comp.id)}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700'
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>
                            {isSelected && <Check size={14} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-800 dark:text-emerald-100' : t.text}`}>
                              {comp.componentName || comp.name}
                            </div>
                            <div className={`text-xs ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : t.textSecondary}`}>
                              编号: <span className="font-mono">{comp.componentNumber}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
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
            disabled={selectedModuleIds.length === 0}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
              selectedModuleIds.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : `${t.button} cursor-pointer`
            }`}
          >
            同步 ({selectedModuleIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}
