import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, FileText, FolderKanban, Package, CheckSquare, Boxes, ArrowRight, Filter, Clock, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { searchAll, getSearchHistory, addSearchHistory, clearSearchHistory } from '../../services/searchService';
import type { SearchResult } from '../../types/search';

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 50;
const MAX_HISTORY = 10;

const SEARCH_TYPES = [
  { value: 'all', label: '全部', icon: null },
  { value: 'project', label: '项目', icon: FolderKanban },
  { value: 'module', label: '模块', icon: Boxes },
  { value: 'component', label: '组件', icon: Package },
  { value: 'document', label: '文档', icon: FileText },
  { value: 'task', label: '任务', icon: CheckSquare },
] as const;

type SearchType = typeof SEARCH_TYPES[number]['value'];

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<{ query: string; timestamp: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<SearchType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, tasks } = useApp();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef<string>('');
  const latestFilterTypeRef = useRef<SearchType>('all');

  const computedSearchResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchAll(query, projects, tasks);
  }, [query, projects, tasks]);

  useEffect(() => {
    latestQueryRef.current = query;
    latestFilterTypeRef.current = filterType;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (latestQueryRef.current !== query) return;

      const type = latestFilterTypeRef.current;
      const filtered = type === 'all' ? computedSearchResults : computedSearchResults.filter(r => r.type === type);
      setResults(filtered.slice(0, MAX_RESULTS));
      setSelectedIndex(0);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, filterType, computedSearchResults]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(true);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (location.state?.openSearch) {
      setIsOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setHistory(getSearchHistory());
    }
  }, [isOpen]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (query.trim()) {
      addSearchHistory(query);
      setHistory(getSearchHistory());
    }
    setIsOpen(false);
    setQuery('');
    navigate(result.path);
  }, [query, navigate]);

  const handleKeyDownInternal = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  }, [results, selectedIndex, handleSelect]);

  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'project':
        return <FolderKanban size={16} className="text-blue-500" />;
      case 'module':
        return <Boxes size={16} className="text-purple-500" />;
      case 'component':
        return <Package size={16} className="text-green-500" />;
      case 'document':
        return <FileText size={16} className="text-orange-500" />;
      case 'software':
        return <Package size={16} className="text-cyan-500" />;
      case 'task':
        return <CheckSquare size={16} className="text-yellow-500" />;
      default:
        return null;
    }
  }, []);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(result => {
      const type = result.type || 'other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(result);
    });
    return groups;
  }, [results]);

  const filteredGroupedResults = useMemo(() => {
    if (filterType !== 'all') {
      return { [filterType]: groupedResults[filterType] || [] };
    }
    return groupedResults;
  }, [filterType, groupedResults]);

  const totalResults = results.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b dark:border-gray-700">
          <Search size={20} className="text-gray-400 dark:text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInternal}
            placeholder="搜索项目、模块、组件..."
            className="flex-1 px-3 py-1 outline-none text-lg bg-transparent dark:text-white"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg mr-2 transition-colors ${showFilters ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <Filter size={18} />
          </button>
          <button onClick={() => setIsOpen(false)}>
            <X size={20} className="text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {showFilters && (
          <div className="px-4 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-1 flex-wrap">
              {SEARCH_TYPES.map((type) => {
                const IconComponent = type.icon;
                const isActive = filterType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setFilterType(type.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {IconComponent && <IconComponent size={14} />}
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                <span>
                  搜索结果 {filterType !== 'all' ? `(${SEARCH_TYPES.find(t => t.value === filterType)?.label})` : ''}: {totalResults} 条
                </span>
                {totalResults >= MAX_RESULTS && <span className="text-orange-500">（结果已限制）</span>}
              </div>
              {Object.entries(filteredGroupedResults).map(([type, typeResults]) => (
                <div key={type}>
                  <div className="px-4 py-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
                    {getTypeIcon(type)}
                    <span className="uppercase font-medium">{type}</span>
                    <span className="text-gray-400">({typeResults.length})</span>
                  </div>
                  {typeResults.map((result, _index) => {
                    const globalIndex = results.indexOf(result);
                    return (
                      <div
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          globalIndex === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {getTypeIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">{result.title}</div>
                          {result.subtitle && <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</div>}
                        </div>
                        <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : query ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <div>未找到相关结果</div>
              <div className="text-sm mt-1">尝试其他关键词或筛选条件</div>
            </div>
          ) : (
            <div className="py-2">
              {history.length > 0 && (
                <>
                  <div className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      搜索历史
                    </span>
                    <button onClick={handleClearHistory} className="flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400">
                      <Trash2 size={12} />
                      清除
                    </button>
                  </div>
                  {history.slice(0, MAX_HISTORY).map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setQuery(item.query)}
                      className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <Clock size={14} className="text-gray-400" />
                      <span className="flex-1">{item.query}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {history.length === 0 && (
                <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  <div className="text-sm">输入关键词开始搜索</div>
                  <div className="text-xs mt-1">支持 Ctrl+K 快捷键</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> 导航</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> 选择</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> 关闭</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+K</kbd> 打开</span>
        </div>
      </div>
    </div>
  );
}
