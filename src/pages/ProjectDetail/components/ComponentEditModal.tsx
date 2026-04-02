import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { ProjectStage } from '../../../types';
import { STAGE_OPTIONS, getDefaultStageForEntity, getEntityStageConfig } from '../../../services/stageConfig';

interface ComponentEditForm {
  componentName: string[];
  componentNumber: string;
  productionOrderNumber: string;
  stage: ProjectStage;
  version: string;
  moduleId: string;
  holder: string[];
  repairOrderNumber: string;
  protectionOrderNumber: string;
}

interface ComponentEditModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: ComponentEditForm;
  onChange: (field: keyof ComponentEditForm, value: string | string[] | ProjectStage) => void;
  editingComponent: any;
  modules: any[];
}

export function ComponentEditModal({ show, onClose, onSubmit, form, onChange, editingComponent, modules }: ComponentEditModalProps) {
  const t = useThemeStyles();

  if (!show || !editingComponent) return null;

  const handleComponentNameChange = (value: string) => {
    const names = value.split(',').map(n => n.trim()).filter(n => n);
    onChange('componentName', names);
  };

  const handleHolderChange = (value: string) => {
    const holders = value.split(',').map(h => h.trim()).filter(h => h);
    onChange('holder', holders);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>编辑组件</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件名称（多个用逗号分隔）</label>
            <input
              type="text"
              value={Array.isArray(form.componentName) ? form.componentName.join(', ') : form.componentName}
              onChange={(e) => handleComponentNameChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件编号</label>
            <input
              type="text"
              value={form.componentNumber}
              onChange={(e) => onChange('componentNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>生产指令号</label>
            <input
              type="text"
              value={form.productionOrderNumber}
              onChange={(e) => onChange('productionOrderNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
              <select
                value={form.stage || getDefaultStageForEntity('component')}
                onChange={(e) => onChange('stage', e.target.value as ProjectStage)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                {STAGE_OPTIONS.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => onChange('version', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
                placeholder="如 v1.0"
              />
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>所属模块</label>
            <select
              value={form.moduleId}
              onChange={(e) => onChange('moduleId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.moduleNumber} - {m.moduleName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>负责人（多个用逗号分隔）</label>
            <input
              type="text"
              value={Array.isArray(form.holder) ? form.holder.join(', ') : form.holder}
              onChange={(e) => handleHolderChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="如: 张三, 李四"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none ${t.cancelButton}`}
            >
              取消
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ease-out focus:outline-none ${t.button}`}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}