import { useThemeStyles } from '../../../hooks/useThemeStyles';
import { Upload } from 'lucide-react';
import type { DiagramCard } from '../../../services/designDiagramService';

interface DiagramModalProps {
  show: boolean;
  onClose: () => void;
  diagramType: 'module' | 'component' | 'table';
  diagramText: string;
  diagramResult: DiagramCard[];
  onCopy: () => void;
}

export function DiagramModal({ show, onClose, diagramType, diagramText, diagramResult, onCopy }: DiagramModalProps) {
  const t = useThemeStyles();

  if (!show) return null;

  const typeLabels = {
    'module': '模块装配图',
    'component': '组件装配图',
    'table': '组件配套表'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`${t.modalBg} rounded-lg p-6 w-full max-w-2xl border ${t.modalBorder} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-semibold ${t.text}`}>生成设计图表 - {typeLabels[diagramType]}</h2>
          <button onClick={onClose} className={`p-1 rounded hover:${t.hoverBg} ${t.textMuted}`}>×</button>
        </div>
        {diagramResult.length > 0 ? (
          <div className="space-y-4">
            {diagramResult.map((card, index) => (
              <div key={index} className={`border rounded-lg p-4 ${t.border}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-medium ${t.text}`}>{card.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${t.badge}`}>{card.format}</span>
                </div>
                <pre className={`text-xs ${t.textSecondary} whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-60`}>
                  {card.content}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${t.textMuted}`}>暂无数据</p>
        )}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onCopy}
            disabled={!diagramText}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${
              diagramText ? t.button : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Upload size={16} />
            复制内容
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-2 border rounded-lg ${t.border} ${t.textSecondary} hover:${t.hoverBg}`}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
