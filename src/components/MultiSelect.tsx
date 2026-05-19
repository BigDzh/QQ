import React, { useState, useMemo } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
}

export default function MultiSelect({ options, selected, onChange, placeholder = '请选择', label }: MultiSelectProps) {
  const t = useThemeStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(s => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== value));
  };

  const selectedLabels = selected.map(s => options.find(o => o.value === s)?.label || s);

  return (
    <div className="relative">
      {label && <label className={`block text-sm font-medium mb-1 ${t.textSecondary}`}>{label}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer flex flex-wrap gap-1 items-center ${t.input} ${isOpen ? 'ring-2 ring-blue-500' : ''}`}
      >
        {selected.length === 0 ? (
          <span className={`text-sm ${t.textMuted}`}>{placeholder}</span>
        ) : (
          selectedLabels.map((label, idx) => (
            <span
              key={selected[idx]}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${t.badge}`}
            >
              {label}
              <button
                type="button"
                onClick={(e) => removeOption(selected[idx], e)}
                className="hover:text-red-500"
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}
        <ChevronDown size={16} className={`ml-auto ${t.textMuted} ${isOpen ? 'rotate-180' : ''} transition-transform`} />
      </div>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 ${t.card} border rounded-lg shadow-lg overflow-hidden`}>
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search size={14} className={`absolute left-2 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索..."
                className={`w-full pl-7 pr-3 py-1.5 text-sm rounded border ${t.input}`}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
            <div className={`px-3 py-2 text-sm font-normal ${t.textMuted}`}>未找到匹配项</div>
          ) : (
              filteredOptions.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:${t.hoverBg} hover:font-medium transition-colors`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggleOption(opt.value)}
                    className="rounded"
                  />
                  <span className={`text-sm font-normal ${selected.includes(opt.value) ? 'font-semibold' : ''} ${t.text}`}>{opt.label}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className={`p-2 border-t border-gray-200 dark:border-gray-700`}>
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full py-1.5 text-sm font-medium rounded text-center btn-interactive hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                清除全部
              </button>
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
