import { useThemeStyles } from '../../../hooks/useThemeStyles';
import type { Document } from '../../../types';

interface DocFormData {
  documentNumber: string;
  name: string;
  type: string;
  stage: string;
  version: string;
}

interface DocModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: DocFormData;
  onChange: (field: string, value: string) => void;
  editingDoc: Document | null;
}

export function DocModal({ show, onClose, onSubmit, form, onChange, editingDoc }: DocModalProps) {
  const t = useThemeStyles();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>{editingDoc ? '编辑文档' : '新建文档'}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文档编号</label>
            <input
              type="text"
              value={form.documentNumber}
              onChange={(e) => onChange('documentNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文档名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>文档类型</label>
            <input
              type="text"
              value={form.type}
              onChange={(e) => onChange('type', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="如: 设计文档"
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
                <option value="C阶段">C阶段</option>
                <option value="S阶段">S阶段</option>
                <option value="D阶段">D阶段</option>
                <option value="P阶段">P阶段</option>
                <option value="F阶段">F阶段</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>版本</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => onChange('version', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
              取消
            </button>
            <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
              {editingDoc ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
