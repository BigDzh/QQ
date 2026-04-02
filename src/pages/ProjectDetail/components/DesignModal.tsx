import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { ProjectStage, ProjectVersion } from '../../../types';
import { STAGE_OPTIONS, getDefaultStageForEntity } from '../../../services/stageConfig';

interface DesignFormData {
  name: string;
  type: '装配图' | '配套表';
  format: 'AutoCAD' | 'Excel' | 'PDF';
  stage: ProjectStage;
  version: ProjectVersion;
  adaptedModuleIds: string[];
  adaptedComponentIds: string[];
}

interface DesignModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: DesignFormData;
  onChange: (field: keyof DesignFormData, value: any) => void;
  editingDesignFile: any;
  modules: any[];
  components: any[];
}

export function DesignModal({ show, onClose, onSubmit, form, onChange, editingDesignFile, modules, components }: DesignModalProps) {
  const t = useThemeStyles();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-lg border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>{editingDesignFile ? '编辑设计文件' : '新建设计文件'}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文件名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文件类型</label>
              <select
                value={form.type}
                onChange={(e) => onChange('type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                <option value="装配图">装配图</option>
                <option value="配套表">配套表</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>格式</label>
              <select
                value={form.format}
                onChange={(e) => onChange('format', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                <option value="AutoCAD">AutoCAD</option>
                <option value="Excel">Excel</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
              <select
                value={form.stage || getDefaultStageForEntity('designFile')}
                onChange={(e) => onChange('stage', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                {STAGE_OPTIONS.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
              <select
                value={form.version}
                onChange={(e) => onChange('version', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                <option value="A版">A版</option>
                <option value="B版">B版</option>
                <option value="C版">C版</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>适配模块</label>
            <div className={`border rounded-lg p-3 max-h-32 overflow-y-auto ${t.border}`}>
              {modules.length === 0 ? (
                <p className={`text-sm ${t.textMuted}`}>无模块</p>
              ) : (
                modules.map((module) => (
                  <label key={module.id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.adaptedModuleIds.includes(module.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onChange('adaptedModuleIds', [...form.adaptedModuleIds, module.id]);
                        } else {
                          onChange('adaptedModuleIds', form.adaptedModuleIds.filter(id => id !== module.id));
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
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none ${t.cancelButton}`}>
              取消
            </button>
            <button type="submit" className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none ${t.button}`}>
              {editingDesignFile ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
