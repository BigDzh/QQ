import { Link } from 'react-router-dom';
import { Monitor, Package, FileText, Download } from 'lucide-react';
import { useThemeStyles } from '../../../hooks/useThemeStyles';

interface SearchResult {
  type: string;
  id: string;
  name: string;
  number: string;
  url: string;
}

interface GlobalSearchResultsProps {
  searchTerm: string;
  results: SearchResult[];
  onClose: () => void;
}

export function GlobalSearchResults({ searchTerm, results, onClose }: GlobalSearchResultsProps) {
  const t = useThemeStyles();

  if (!searchTerm) return null;

  return (
    <>
      {results.length > 0 ? (
        <div className={`relative z-50 mb-4 p-4 ${t.card} rounded-lg border ${t.border} max-h-64 overflow-y-auto shadow-lg`}>
          <div className={`text-sm ${t.textMuted} mb-2`}>找到 {results.length} 个结果</div>
          <div className="space-y-2">
            {results.map((result, index) => (
              <Link
                key={`${result.type}-${result.id}-${index}`}
                to={result.url}
                onClick={onClose}
                className={`flex items-center justify-between p-2 rounded ${t.hoverBg} hover:${t.hoverBg}`}
              >
                <div className="flex items-center gap-2">
                  {result.type === '系统' && <Monitor size={14} className={t.textMuted} />}
                  {result.type === '模块' && <Package size={14} className={t.textMuted} />}
                  {result.type === '组件' && <Package size={14} className={t.textMuted} />}
                  {result.type === '文档' && <FileText size={14} className={t.textMuted} />}
                  {result.type === '软件' && <Download size={14} className={t.textMuted} />}
                  <span className={`text-sm ${t.text}`}>{result.name}</span>
                  <span className={`text-xs ${t.textMuted}`}>{result.number}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${t.badge}`}>{result.type}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className={`relative z-50 mb-4 text-sm ${t.textMuted} p-4 ${t.card} rounded-lg border ${t.border}`}>
          未找到相关结果
        </div>
      )}
    </>
  );
}

export default GlobalSearchResults;
