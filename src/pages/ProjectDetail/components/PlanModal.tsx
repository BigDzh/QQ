import React from 'react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

interface PlanFormData {
  title: string;
  description: string;
  riskItem: string;
  dueDate: string;
  priority: '低' | '中' | '高' | '紧急';
}

interface PlanModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: PlanFormData;
  onChange: (field: keyof PlanFormData, value: string) => void;
}

export function PlanModal({ show, onClose, onSubmit, form, onChange }: PlanModalProps) {
  const t = useThemeStyles();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>添加计划目标</h2>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>目标标题</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange('title', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="输入目标标题"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>目标描述</label>
            <textarea
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="输入目标描述（可选）"
              rows={3}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>风险项</label>
            <textarea
              value={form.riskItem}
              onChange={(e) => onChange('riskItem', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="输入风险项（可选）"
              rows={2}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>截止日期</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => onChange('dueDate', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>优先级</label>
            <select
              value={form.priority}
              onChange={(e) => onChange('priority', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${t.border} ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="低">低</option>
              <option value="中">中</option>
              <option value="高">高</option>
              <option value="紧急">紧急</option>
            </select>
          </div>
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
              onClick={onSubmit}
              className={`flex-1 py-2 ${t.button} rounded-lg text-white`}
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
