import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { Component, Module } from '../../../types';

interface ComponentCopyForm {
  moduleId: string;
  componentNumber: string;
}

interface ComponentCopyModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: ComponentCopyForm;
  onChange: (field: keyof ComponentCopyForm, value: string) => void;
  copyingComponent: Component;
  modules: Module[];
}

export function ComponentCopyModal({ show, onClose, onSubmit, form, onChange, copyingComponent, modules }: ComponentCopyModalProps) {
  const t = useThemeStyles();

  if (!show || !copyingComponent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>复制组件</h2>
        <div className={`mb-4 p-3 rounded-lg border ${t.border} ${t.card}`}>
          <div className={`text-sm ${t.textSecondary}`}>源组件: <span className={t.text}>{copyingComponent.componentName}</span></div>
          <div className={`text-sm ${t.textSecondary}`}>编号: <span className={t.text}>{copyingComponent.componentNumber}</span></div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>组件名称</label>
            <input
              type="text"
              value={copyingComponent.componentName}
              className={`w-full px-3 py-2 border rounded-lg ${t.input} opacity-60`}
              disabled
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>目标模块 *</label>
            <select
              value={form.moduleId}
              onChange={(e) => onChange('moduleId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              required
            >
              <option value="">选择目标模块</option>
              {modules.map((mod) => (
                <option key={mod.id} value={mod.id}>
                  {mod.moduleName} ({mod.moduleNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>新组件编号 *</label>
            <input
              type="text"
              value={form.componentNumber}
              onChange={(e) => onChange('componentNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="输入新组件编号"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
              取消
            </button>
            <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
              复制
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
