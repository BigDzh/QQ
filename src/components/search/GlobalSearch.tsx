import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, FolderKanban, Package, CheckSquare, Boxes, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { searchAll, getSearchHistory, addSearchHistory, clearSearchHistory } from '../../services/searchService';
import type { SearchResult } from '../../types/search';

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 20;

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<{ query: string; timestamp: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, tasks } = useApp();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef<string>('');

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

  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    const searchResults = searchAll(searchQuery, projects, tasks);
    setResults(searchResults.slice(0, MAX_RESULTS));
    setSelectedIndex(0);
  }, [projects, tasks]);

  useEffect(() => {
    latestQueryRef.current = query;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (latestQueryRef.current === query) {
        performSearch(query);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  const handleSelect = useCallback((result: SearchResult) => {
    addSearchHistory(query);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInternal}
            placeholder="搜索项目、模块、组件..."
            className="flex-1 px-3 py-1 outline-none text-lg"
          />
          <button onClick={() => setIsOpen(false)}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-1 text-xs text-gray-500">搜索结果 (最多显示{MAX_RESULTS}条)</div>
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                    index === selectedIndex ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {getTypeIcon(result.type)}
                  <div className="flex-1">
                    <div className="font-medium">{result.title}</div>
                    {result.subtitle && <div className="text-sm text-gray-500">{result.subtitle}</div>}
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </div>
              ))}
            </div>
          ) : query ? (
            <div className="py-8 text-center text-gray-500">未找到相关结果</div>
          ) : (
            <div className="py-2">
              {history.length > 0 && (
                <>
                  <div className="px-4 py-1 text-xs text-gray-500 flex justify-between items-center">
                    <span>搜索历史</span>
                    <button onClick={clearSearchHistory} className="text-primary-600 hover:underline">
                      清除
                    </button>
                  </div>
                  {history.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setQuery(item.query)}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-gray-700"
                    >
                      {item.query}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t text-xs text-gray-500 flex gap-4">
          <span><kbd className="px-1 bg-gray-100 rounded">↑↓</kbd> 导航</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Enter</kbd> 选择</span>
          <span><kbd className="px-1 bg-gray-100 rounded">Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  );
}
