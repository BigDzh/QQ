import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { ProjectStage } from '../../../types';

interface SystemFormData {
  systemNumber: string;
  systemName: string;
  productionOrderNumber: string;
  holder: string;
  status: '未投产' | '投产中' | '正常' | '维修中' | '三防中' | '测试中' | '仿真中' | '借用中' | '故障';
  stage: ProjectStage;
  version: string;
}

interface SystemModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: SystemFormData;
  onChange: (field: keyof SystemFormData, value: string) => void;
  editingSystem: any;
  systemTemplate?: any;
  existingSystems?: any[];
  onSelectTemplate?: (system: any) => void;
  onClearTemplate?: () => void;
  isCopying?: boolean;
}

export function SystemModal({ show, onClose, onSubmit, form, onChange, editingSystem, systemTemplate, existingSystems, onSelectTemplate, onClearTemplate, isCopying }: SystemModalProps) {
  const t = useThemeStyles();

  if (!show) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>{editingSystem ? '编辑系统' : '新建系统'}</h2>
        {!editingSystem && existingSystems && existingSystems.length > 0 && (
          <div className={`mb-4 p-3 rounded-lg border ${t.border} ${t.card}`}>
            <div className={`flex items-center gap-2 mb-2`}>
              <span className={`text-sm font-medium ${t.textSecondary}`}>参考系统:</span>
              <select
                value={systemTemplate?.id || ''}
                onChange={(e) => {
                  const selectedSystem = existingSystems.find(s => s.id === e.target.value);
                  if (selectedSystem) {
                    onSelectTemplate?.(selectedSystem);
                  } else {
                    onClearTemplate?.();
                  }
                }}
                className={`flex-1 px-3 py-1.5 text-sm border rounded-lg ${t.input}`}
              >
                <option value="">不选择（空白模板）</option>
                {[...existingSystems].sort((a, b) =>
                  new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                ).map(sys => (
                  <option key={sys.id} value={sys.id}>
                    {sys.systemName} {sys.systemNumber ? `(${sys.systemNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-500">选择参考系统将自动填充系统名称、生产指令号和阶段</div>
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>系统编号</label>
            <input
              type="text"
              value={form.systemNumber}
              onChange={(e) => onChange('systemNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>系统名称 *</label>
            <input
              type="text"
              list="system-name-suggestions"
              value={form.systemName}
              onChange={(e) => onChange('systemName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="输入系统名称"
              required
            />
            <datalist id="system-name-suggestions">
              {existingSystems && [...new Set(existingSystems.map(s => s.systemName))].map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </datalist>
            {existingSystems && existingSystems.length > 0 && (
              <p className={`text-xs ${t.textMuted} mt-1`}>
                可从已有系统名称中选择参考: {[...new Set(existingSystems.map(s => s.systemName))].slice(0, 5).join(', ')}
              </p>
            )}
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
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>负责人</label>
            <input
              type="text"
              value={form.holder}
              onChange={(e) => onChange('holder', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>阶段</label>
              <select
                value={form.stage}
                onChange={(e) => onChange('stage', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                <option value="F阶段">F阶段</option>
                <option value="C阶段">C阶段</option>
                <option value="S阶段">S阶段</option>
                <option value="D阶段">D阶段</option>
                <option value="P阶段">P阶段</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>状态</label>
              <select
                value={form.status}
                onChange={(e) => onChange('status', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                <option value="未投产">未投产</option>
                <option value="投产中">投产中</option>
                <option value="正常">正常</option>
                <option value="维修中">维修中</option>
                <option value="三防中">三防中</option>
                <option value="测试中">测试中</option>
                <option value="仿真中">仿真中</option>
                <option value="借用中">借用中</option>
                <option value="故障">故障</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={handleClose} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
              取消
            </button>
            <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
              {editingSystem ? '保存修改' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
