import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, FileText, Package, Boxes, Download, Loader2, Filter, FolderKanban, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import type { SearchResult } from '../../types/search';

const DEBOUNCE_MS = 150;
const DEFAULT_MAX_RESULTS = 50;

interface SystemSearchProps {
  systemId: string;
  projectId: string;
  onBackupClick?: () => void;
}

interface SearchOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const TYPE_FILTER_OPTIONS: SearchOption[] = [
  { label: '全部', value: 'all' },
  { label: '模块', value: 'module', icon: <Boxes size={14} className="text-purple-500" /> },
  { label: '组件', value: 'component', icon: <Package size={14} className="text-green-500" /> },
  { label: '文档', value: 'document', icon: <FileText size={14} className="text-orange-500" /> },
  { label: '软件', value: 'software', icon: <Package size={14} className="text-cyan-500" /> },
  { label: '设计文件', value: 'designFile', icon: <FileText size={14} className="text-indigo-500" /> },
];

export default function SystemSearch({ systemId, projectId, onBackupClick }: SystemSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [, setIsLoading] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'name' | 'type'>('relevance');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { projects } = useApp();
  const t = useThemeStyles();
  const { isDark } = useTheme();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const project = projects.find(p => p.id === projectId);

  const searchableItems = useMemo(() => {
    if (!project) return [];

    const items: SearchResult[] = [];
    const systemModules = project.modules.filter(m => m.systemId === systemId);

    for (const module of systemModules) {
      items.push({
        id: module.id,
        type: 'module',
        title: module.moduleName,
        subtitle: `模块编号: ${module.moduleNumber} | 种类: ${module.category} | 状态: ${module.status}`,
        path: `/modules/${module.id}`,
        score: 0,
        projectName: project.name,
        projectId: project.id,
      });

      for (const component of module.components) {
        items.push({
          id: component.id,
          type: 'component',
          title: component.componentName,
          subtitle: `组件编号: ${component.componentNumber} | 状态: ${component.status}`,
          path: `/components/${component.id}`,
          score: 0,
          projectName: project.name,
          projectId: project.id,
        });
      }
    }

    for (const doc of project.documents) {
      items.push({
        id: doc.id,
        type: 'document',
        title: doc.name,
        subtitle: `类型: ${doc.type} | 阶段: ${doc.stage}`,
        path: `/projects/${project.id}`,
        score: 0,
        projectName: project.name,
        projectId: project.id,
      });
    }

    for (const sw of project.software) {
      items.push({
        id: sw.id,
        type: 'software',
        title: sw.name,
        subtitle: `版本: ${sw.version} | 阶段: ${sw.stage}`,
        path: `/software/${sw.id}`,
        score: 0,
        projectName: project.name,
        projectId: project.id,
      });
    }

    for (const df of project.designFiles || []) {
      items.push({
        id: df.id,
        type: 'designFile',
        title: df.name,
        subtitle: `类型: ${df.type} | 格式: ${df.format}`,
        path: `/projects/${project.id}`,
        score: 0,
        projectName: project.name,
        projectId: project.id,
      });
    }

    return items;
  }, [project, systemId]);

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const highlightMatch = useCallback((text: string, searchQuery: string): string => {
    if (!searchQuery.trim()) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedQuery = escapeHtml(searchQuery);
    const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>');
  }, []);

  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearchTime(0);
      return;
    }

    const startTime = performance.now();
    const lowerQuery = searchQuery.toLowerCase();

    let filtered = searchableItems.filter(item => {
      const titleLower = item.title.toLowerCase();
      const subtitleLower = item.subtitle?.toLowerCase() || '';
      const content = `${item.title} ${item.subtitle || ''}`.toLowerCase();

      if (titleLower.includes(lowerQuery) || subtitleLower.includes(lowerQuery)) {
        return true;
      }

      const words = lowerQuery.split(/\s+/).filter(w => w.length >= 2);
      return words.some(word => content.includes(word));
    });

    filtered = filtered.map(item => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const subtitleLower = item.subtitle?.toLowerCase() || '';

      if (titleLower === lowerQuery) {
        score = 100;
      } else if (titleLower.startsWith(lowerQuery)) {
        score = 80;
      } else if (titleLower.includes(lowerQuery)) {
        score = 60;
      } else if (subtitleLower.includes(lowerQuery)) {
        score = 40;
      } else {
        score = 20;
      }

      return { ...item, score };
    });

    if (sortBy === 'name') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'type') {
      filtered.sort((a, b) => a.type.localeCompare(b.type));
    } else {
      filtered.sort((a, b) => b.score - a.score);
    }

    const limitedResults = filtered.slice(0, DEFAULT_MAX_RESULTS);
    const time = performance.now() - startTime;

    setResults(limitedResults);
    setSearchTime(time);
  }, [searchableItems, sortBy]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((result: SearchResult) => {
    setQuery('');
    setShowDropdown(false);
    setIsExpanded(false);
    navigate(result.path);
  }, [navigate]);

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type);
  };

  const filteredResults = useMemo(() => {
    if (typeFilter === 'all') return results;
    return results.filter(r => r.type === typeFilter);
  }, [results, typeFilter]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'module':
        return <Boxes size={16} className="text-purple-500" />;
      case 'component':
        return <Package size={16} className="text-green-500" />;
      case 'document':
        return <FileText size={16} className="text-orange-500" />;
      case 'software':
        return <Package size={16} className="text-cyan-500" />;
      case 'designFile':
        return <FileText size={16} className="text-indigo-500" />;
      case 'task':
        return <CheckSquare size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'module':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'component':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'document':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'software':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'designFile':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTypeName = (type: string) => {
    const option = TYPE_FILTER_OPTIONS.find(opt => opt.value === type);
    return option?.label || type;
  };

  const totalCount = searchableItems.length;

  return (
    <div className="flex items-center gap-2" ref={dropdownRef}>
      <div className={`relative flex items-center ${isExpanded ? 'w-96' : 'w-64'} transition-all duration-300`}>
        <Search size={18} className={`absolute left-3 ${isDark ? 'text-gray-400' : 'text-gray-400'} pointer-events-none`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onClick={() => setIsExpanded(true)}
          placeholder={`搜索系统内 ${totalCount} 个项目...`}
          className={`w-full pl-10 pr-4 py-2 border rounded-lg ${t.border} ${t.card} ${t.text} text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300`}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className={`absolute right-3 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {onBackupClick && (
        <button
          onClick={onBackupClick}
          className={`flex items-center gap-2 px-4 py-2 ${t.button} rounded-lg text-white text-sm whitespace-nowrap`}
          title="系统备份"
        >
          <Download size={16} />
          <span className="hidden sm:inline">备份</span>
        </button>
      )}

      {showDropdown && (
        <div className={`absolute z-50 mt-12 top-0 left-0 w-[600px] ${t.card} border rounded-lg shadow-xl overflow-hidden`}>
          {query && (
            <div className={`flex items-center justify-between px-4 py-2 border-b ${t.border} bg-gray-50 dark:bg-gray-800/50`}>
              <div className="flex items-center gap-4 text-sm">
                <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  找到 <span className="font-semibold text-blue-600">{filteredResults.length}</span> 个结果
                  {searchTime > 0 && (
                    <span className="ml-2 text-xs">(搜索耗时: {searchTime.toFixed(0)}ms)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className={isDark ? 'text-gray-400' : 'text-gray-400'} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'relevance' | 'name' | 'type')}
                  className={`text-xs bg-transparent ${isDark ? 'text-gray-400' : 'text-gray-500'} outline-none cursor-pointer`}
                >
                  <option value="relevance">相关性</option>
                  <option value="name">名称</option>
                  <option value="type">类型</option>
                </select>
              </div>
            </div>
          )}

          {query && (
            <div className={`flex items-center gap-1 px-4 py-2 border-b ${t.border} overflow-x-auto`}>
              {TYPE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTypeFilterChange(opt.value)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                    typeFilter === opt.value
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : isDark
                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {filteredResults.length > 0 ? (
              <div className="py-2">
                {filteredResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex-shrink-0">{getTypeIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
                          dangerouslySetInnerHTML={{ __html: highlightMatch(result.title, query) }}
                        />
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${getTypeBadgeColor(result.type)}`}>
                          {getTypeName(result.type)}
                        </span>
                      </div>
                      {result.subtitle && (
                        <div
                          className={`text-sm truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                          dangerouslySetInnerHTML={{ __html: highlightMatch(result.subtitle, query) }}
                        />
                      )}
                      {result.projectName && (
                        <div className={`text-xs mt-0.5 truncate flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          <FolderKanban size={12} />
                          所属项目: {result.projectName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : query ? (
              <div className={`py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Search size={36} className={`mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className="text-sm">未找到相关结果</p>
                <p className="text-xs mt-1">请尝试其他关键词</p>
              </div>
            ) : (
              <div className={`py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Search size={36} className={`mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className="text-sm">输入关键词开始搜索</p>
                <p className="text-xs mt-1">支持模糊搜索和关键词高亮</p>
              </div>
            )}
          </div>

          {isLoading && (
            <div className={`absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 ${t.card}`}>
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}