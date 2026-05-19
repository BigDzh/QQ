import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

interface ReviewFormData {
  title: string;
  content: string;
  systemName?: string;
}

interface ReviewModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: ReviewFormData;
  onChange: (field: keyof ReviewFormData, value: string) => void;
  systems?: { id: string; systemName: string }[];
}

export function ReviewModal({ show, onClose, onSubmit, form, onChange, systems = [] }: ReviewModalProps) {
  const t = useThemeStyles();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>新建评审</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>评审标题 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="请输入评审标题"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>评审内容 *</label>
            <textarea
              value={form.content}
              onChange={(e) => onChange('content', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="请输入评审内容"
              rows={4}
              required
            />
          </div>
          {systems.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>关联系统</label>
              <select
                value={form.systemName || ''}
                onChange={(e) => onChange('systemName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              >
                <option value="">请选择系统（可选）</option>
                {systems.map(sys => (
                  <option key={sys.id} value={sys.systemName}>{sys.systemName}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
            >
              取消
            </button>
            <button
              type="submit"
              className={`flex-1 py-2 ${t.button} rounded-lg text-white`}
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
