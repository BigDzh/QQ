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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>同步设计文件到模块</h2>
        <div className={`mb-4 p-3 rounded-lg border ${t.border} ${t.card}`}>
          <div className={`text-sm ${t.textSecondary}`}>文件名: <span className={t.text}>{targetDesignFile.name}</span></div>
          <div className={`text-sm ${t.textSecondary}`}>已选: <span className={t.text}>{selectedModuleIds.length} 个目标</span></div>
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>选择适配模块</label>
          <div className={`border rounded-lg p-3 max-h-32 overflow-y-auto ${t.border}`}>
            {adaptedModules.length === 0 ? (
              <p className={`text-sm ${t.textMuted}`}>无适配模块</p>
            ) : (
              adaptedModules.map((module: any) => (
                <label key={module.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModuleIds.includes(module.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange([...selectedModuleIds, module.id]);
                      } else {
                        onSelectionChange(selectedModuleIds.filter(id => id !== module.id));
                      }
                    }}
                    className="checkbox-interactive rounded"
                  />
                  <span className={t.text}>{module.moduleName}</span>
                  <span className={`text-xs ${t.textMuted}`}>({module.moduleNumber})</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>选择适配组件</label>
          <div className={`border rounded-lg p-3 max-h-32 overflow-y-auto ${t.border}`}>
            {adaptedComponents.length === 0 ? (
              <p className={`text-sm ${t.textMuted}`}>无适配组件</p>
            ) : (
              adaptedComponents.map((comp: any) => (
                <label key={comp.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModuleIds.includes(comp.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange([...selectedModuleIds, comp.id]);
                      } else {
                        onSelectionChange(selectedModuleIds.filter(id => id !== comp.id));
                      }
                    }}
                    className="checkbox-interactive rounded"
                  />
                  <span className={t.text}>{comp.componentName || comp.name}</span>
                  <span className={`text-xs ${t.textMuted}`}>({comp.componentNumber})</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
          >
            取消
          </button>
          <button
            onClick={onSync}
            disabled={selectedModuleIds.length === 0}
            className={`flex-1 py-2 rounded-lg ${
              selectedModuleIds.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : t.button
            }`}
          >
            同步 ({selectedModuleIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}
