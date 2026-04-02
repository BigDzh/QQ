import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { Software, Component } from '../../../types';

interface SoftwareFormData {
  name: string;
  version: string;
  adaptedComponentIds: string[];
}

interface SoftwareModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: SoftwareFormData;
  onChange: (field: keyof SoftwareFormData, value: string | string[]) => void;
  editingSoftware: Software | null;
  components: Component[];
}

export function SoftwareModal({ show, onClose, onSubmit, form, onChange, editingSoftware, components }: SoftwareModalProps) {
  const t = useThemeStyles();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-lg border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>{editingSoftware ? '编辑软件' : '新建软件'}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>软件名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="请输入软件名称"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
            <input
              type="text"
              value={form.version}
              onChange={(e) => onChange('version', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="如: v1.0"
            />
          </div>
          {components.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>
                适配组件（可多选）
                {editingSoftware && (
                  <span className="text-xs font-normal text-gray-500 ml-1">（修改将更新现有适配关系）</span>
                )}
              </label>
              <div className={`max-h-48 overflow-y-auto border rounded-lg p-3 ${t.border}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {components.map((comp) => (
                    <label key={comp.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 -mx-2">
                      <input
                        type="checkbox"
                        checked={form.adaptedComponentIds.includes(comp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange('adaptedComponentIds', [...form.adaptedComponentIds, comp.id]);
                          } else {
                            onChange('adaptedComponentIds', form.adaptedComponentIds.filter(id => id !== comp.id));
                          }
                        }}
                        className="checkbox-interactive rounded"
                      />
                      <span className={`text-sm ${t.text} flex-1 truncate`}>{comp.componentName}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        form.adaptedComponentIds.includes(comp.id)
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {form.adaptedComponentIds.includes(comp.id) ? '已选' : '未选'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {form.adaptedComponentIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">已选:</span>
                  {form.adaptedComponentIds.map(id => {
                    const comp = components.find(c => c.id === id);
                    return comp ? (
                      <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs">
                        {comp.componentName}
                        <button
                          type="button"
                          onClick={() => onChange('adaptedComponentIds', form.adaptedComponentIds.filter(cid => cid !== id))}
                          className="hover:text-red-600 dark:hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
          {components.length === 0 && (
            <p className={`text-sm ${t.textMuted}`}>暂无可选组件</p>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
              取消
            </button>
            <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
              {editingSoftware ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
