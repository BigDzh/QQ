import { useThemeStyles } from '../../../hooks/useThemeStyles';

interface CategoryModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  newCategory: string;
  onChange: (v: string) => void;
  categories?: string[];
}

export function CategoryModal({ show, onClose, onSubmit, newCategory, onChange, categories }: CategoryModalProps) {
  const t = useThemeStyles();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-md border ${t.modalBorder}`} onClick={(e) => e.stopPropagation()}>
        <h2 className={`text-xl font-semibold mb-4 ${t.text}`}>添加种类</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>种类名称 *</label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${t.input}`}
              placeholder="请输入种类名称"
              required
              autoFocus
            />
          </div>
          {categories && categories.length > 0 && (
            <div className={`text-sm ${t.textMuted}`}>
              当前种类: {categories.join(', ')}
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}>
              取消
            </button>
            <button type="submit" className={`flex-1 py-2 ${t.button} rounded-lg`}>
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
