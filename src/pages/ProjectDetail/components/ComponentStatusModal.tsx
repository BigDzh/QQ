import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { Component } from '../../../types';

interface ComponentStatusForm {
  status: string;
  reason: string;
}

interface ComponentStatusModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: ComponentStatusForm;
  onChange: (field: keyof ComponentStatusForm, value: string) => void;
  editingComponent: Component | null;
  statusOptions?: string[];
}

export function ComponentStatusModal({ show, onClose, onSubmit, form, onChange, editingComponent, statusOptions = ['未投产', '投产中', '正常', '维修中', '三防中', '测试中', '仿真中', '借用中', '故障'] }: ComponentStatusModalProps) {
  const t = useThemeStyles();

  if (!show || !editingComponent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>更改组件状态</h2>
        <div className={`p-4 rounded-lg mb-4 ${t.emptyBg}`}>
          <div className={`text-sm ${t.textSecondary} mb-1`}>组件名称：{editingComponent.componentName}</div>
          <div className={`text-sm ${t.textSecondary} mb-1`}>组件编号：{editingComponent.componentNumber}</div>
          <div className={`text-sm ${t.textSecondary}`}>当前状态：<span className="font-medium">{form.status || editingComponent.status}</span></div>
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>选择新状态</label>
          <div className="grid grid-cols-3 gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onChange('status', status)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                  form.status === status
                    ? `${t.button} text-white`
                    : `${t.border} ${t.textSecondary} hover:${t.hoverBg}`
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>变更原因（必填）</label>
          <textarea
            value={form.reason}
            onChange={(e) => onChange('reason', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            rows={3}
            placeholder="请输入状态变更原因..."
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className={`flex-1 py-2 ${t.button} rounded-lg`}
          >
            确认更新
          </button>
        </div>
      </div>
    </div>
  );
}
