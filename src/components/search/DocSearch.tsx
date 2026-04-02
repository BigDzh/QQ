import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, X, FileText, Clock, HardDrive, ArrowUpDown, ChevronLeft, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  searchDocuments,
  getDocSearchHistory,
  addDocSearchHistory,
  clearDocSearchHistory,
  invalidateDocIndexCache,
} from '../../services/docSearchService';
import type {
  DocSearchType,
  DocMatchMode,
  DocSortField,
  DocSortOrder,
  DocSearchResult,
  DocSearchResponse,
  DocSearchHistory,
} from '../../types/search';
import type { Document } from '../../types';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 150;

interface DocSearchProps {
  projectId?: string;
  onSelectDocument?: (doc: Document) => void;
  className?: string;
}

export default function DocSearch({ projectId, onSelectDocument, className = '' }: DocSearchProps) {
  const { projects } = useApp();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<DocSearchType>('name');
  const [matchMode, setMatchMode] = useState<DocMatchMode>('fuzzy');
  const [sortField, setSortField] = useState<DocSortField>('relevance');
  const [sortOrder, setSortOrder] = useState<DocSortOrder>('desc');
  const [page, setPage] = useState(1);
  const [searchResults, setSearchResults] = useState<DocSearchResponse | null>(null);
  const [history, setHistory] = useState<DocSearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef<string>('');

  const documents = useMemo(() => {
    if (projectId) {
      const project = projects.find((p) => p.id === projectId);
      return project?.documents || [];
    }
    return projects.flatMap((p) => p.documents);
  }, [projects, projectId]);

  useEffect(() => {
    setHistory(getDocSearchHistory());
  }, []);

  useEffect(() => {
    invalidateDocIndexCache();
  }, [documents.length]);

  const performSearch = useCallback(
    (searchQuery: string, searchPage: number) => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        setSearchTime(0);
        return;
      }

      const startTime = performance.now();
      const result = searchDocuments(searchQuery, documents, {
        searchType,
        matchMode,
        sortField,
        sortOrder,
        page: searchPage,
        pageSize: PAGE_SIZE,
      });

      setSearchTime(performance.now() - startTime);
      setSearchResults(result);

      if (result.searchTime > 300) {
        console.warn(`Search took ${result.searchTime.toFixed(2)}ms, exceeding 300ms target`);
      }
    },
    [documents, searchType, matchMode, sortField, sortOrder]
  );

  useEffect(() => {
    latestQueryRef.current = query;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (latestQueryRef.current === query) {
        performSearch(query, page);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch, page]);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      setPage(1);
      if (searchQuery.trim()) {
        addDocSearchHistory(searchQuery, searchType);
        setHistory(getDocSearchHistory());
      }
    },
    [searchType]
  );

  const handleHistorySelect = useCallback((item: DocSearchHistory) => {
    setSearchType(item.searchType);
    setQuery(item.query);
    setPage(1);
    setShowHistory(false);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearDocSearchHistory();
    setHistory([]);
  }, []);

  const handleSelectResult = useCallback(
    (result: DocSearchResult) => {
      addDocSearchHistory(query, searchType);
      setHistory(getDocSearchHistory());
      if (onSelectDocument) {
        onSelectDocument(result.document);
      }
    },
    [query, searchType, onSelectDocument]
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSortChange = useCallback(
    (field: DocSortField) => {
      if (field === sortField) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
      setPage(1);
    },
    [sortField]
  );

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMatchBadgeClass = (matchField: 'documentNumber' | 'name'): string => {
    return matchField === 'documentNumber'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-green-100 text-green-700';
  };

  const getMatchBadgeText = (matchField: 'documentNumber' | 'name'): string => {
    return matchField === 'documentNumber' ? '编号' : '名称';
  };

  const renderPageNumbers = (): (number | 'ellipsis')[] => {
    if (!searchResults) return [];
    const { totalPages, page: currentPage } = searchResults;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearchType('number');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === 'number'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              编号搜索
            </button>
            <button
              onClick={() => {
                setSearchType('name');
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchType === 'name'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              名称搜索
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">匹配模式:</span>
            <button
              onClick={() => {
                setMatchMode('exact');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded text-sm ${
                matchMode === 'exact'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              精确
            </button>
            <button
              onClick={() => {
                setMatchMode('fuzzy');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded text-sm ${
                matchMode === 'fuzzy'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              模糊
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder={
              searchType === 'number'
                ? '输入文档编号进行搜索...'
                : '输入文档名称进行搜索...'
            }
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-lg"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSearchResults(null);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {showHistory && history.length > 0 && !query && (
          <div className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500 font-medium">搜索历史</span>
              <button
                onClick={handleClearHistory}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 size={12} />
                清除
              </button>
            </div>
            {history.map((item, index) => (
              <div
                key={index}
                onClick={() => handleHistorySelect(item)}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.searchType === 'number'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.searchType === 'number' ? '编号' : '名称'}
                  </span>
                  <span className="text-gray-700">{item.query}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(item.timestamp).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {searchResults && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                找到{' '}
                <span className="font-bold text-primary-600">{searchResults.total}</span>{' '}
                个结果
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  searchTime <= 300
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                搜索耗时: {searchTime.toFixed(2)}ms
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">排序:</span>
              <button
                onClick={() => handleSortChange('relevance')}
                className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                  sortField === 'relevance'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ArrowUpDown size={14} />
                相关度
                {sortField === 'relevance' && (
                  <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <button
                onClick={() => handleSortChange('createdTime')}
                className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                  sortField === 'createdTime'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Clock size={14} />
                创建时间
                {sortField === 'createdTime' && (
                  <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <button
                onClick={() => handleSortChange('fileSize')}
                className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                  sortField === 'fileSize'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <HardDrive size={14} />
                文件大小
                {sortField === 'fileSize' && (
                  <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
            </div>
          </div>

          {searchResults.results.length > 0 ? (
            <div className="space-y-2">
              {searchResults.results.map((result) => (
                <div
                  key={result.document.id}
                  onClick={() => handleSelectResult(result)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <FileText size={20} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {result.document.name}
                          </h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${getMatchBadgeClass(
                              result.matchField
                            )}`}
                          >
                            {getMatchBadgeText(result.matchField)}
                          </span>
                          {result.matchField === 'documentNumber' && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {result.matchContent}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">编号:</span>
                            <span className="font-mono">{result.document.documentNumber}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium">类型:</span>
                            <span>{result.document.type || '-'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium">阶段:</span>
                            <span>{result.document.stage || '-'}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(result.document.uploadDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive size={12} />
                            {formatFileSize(result.document.fileSize)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              result.document.status === '已完成'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {result.document.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        匹配度: {result.score}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">未找到匹配的文档</p>
              <p className="text-sm text-gray-400 mt-1">
                尝试调整搜索关键词或匹配模式
              </p>
            </div>
          )}

          {searchResults.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                第 {searchResults.page} / {searchResults.totalPages} 页，共{' '}
                {searchResults.total} 条
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>

                {renderPageNumbers().map((pageNum, index) =>
                  pageNum === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium ${
                        page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= searchResults.totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <button
                onClick={() => {
                  setQuery('');
                  setSearchResults(null);
                  setPage(1);
                  inputRef.current?.focus();
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-primary-600"
              >
                <RotateCcw size={14} />
                重置
              </button>
            </div>
          )}
        </div>
      )}

      {!searchResults && (
        <div className="p-8 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">输入搜索关键词开始搜索文档</p>
          <p className="text-sm text-gray-400 mt-1">
            支持按文档编号或名称进行{matchMode === 'exact' ? '精确' : '模糊'}搜索
          </p>
        </div>
      )}
    </div>
  );
}
