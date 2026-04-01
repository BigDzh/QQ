import { useEffect, useRef, useCallback, useState } from 'react';
import type { Document } from '../types';
import type {
  DocSearchOptions,
  DocSearchResult,
  DocSearchResponse,
  DocSearchHistory,
  DocSearchType,
  DocMatchMode,
  DocSortField,
  DocSortOrder,
} from '../types/search';
import { safeSetObject, safeGetObject } from '../services/storageManager';

const DOC_SEARCH_HISTORY_KEY = 'doc_search_history';
const MAX_DOC_HISTORY = 10;
const WORKER_THRESHOLD = 1000;

interface DocSearchWorkerMessage {
  type: 'search';
  query: string;
  documents: Document[];
  options: DocSearchOptions;
}

interface DocSearchWorkerResponse {
  type: 'result';
  results: DocSearchResult[];
  total: number;
  searchTime: number;
}

interface DocSearchWithWorkerState {
  isSearching: boolean;
  searchTime: number;
  error: string | null;
}

export interface UseDocSearchReturn {
  search: (
    query: string,
    documents: Document[],
    options: DocSearchOptions
  ) => Promise<DocSearchResponse>;
  getHistory: () => DocSearchHistory[];
  addHistory: (query: string, searchType: DocSearchType) => void;
  clearHistory: () => void;
  isSearching: boolean;
  lastSearchTime: number;
}

export function useDocSearch(): UseDocSearchReturn {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, {
    resolve: (result: DocSearchResponse) => void;
    reject: (error: Error) => void;
  }>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/docSearchWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<DocSearchWorkerResponse>) => {
      const { type, results, total, searchTime } = event.data;

      if (type === 'result') {
        setIsSearching(false);
        setLastSearchTime(searchTime);

        const pending = pendingRef.current.get('current');
        if (pending) {
          pending.resolve({
            results,
            total,
            page: results.length > 0 ? 1 : 0,
            pageSize: 20,
            totalPages: Math.ceil(total / 20),
            searchTime,
          });
          pendingRef.current.delete('current');
        }
      }
    };

    worker.onerror = (error) => {
      console.error('DocSearch Worker error:', error);
      setIsSearching(false);

      const pending = pendingRef.current.get('current');
      if (pending) {
        pending.reject(new Error('Worker error'));
        pendingRef.current.delete('current');
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const search = useCallback(
    async (
      query: string,
      documents: Document[],
      options: DocSearchOptions
    ): Promise<DocSearchResponse> => {
      if (!query.trim()) {
        return {
          results: [],
          total: 0,
          page: options.page,
          pageSize: options.pageSize,
          totalPages: 0,
          searchTime: 0,
        };
      }

      if (documents.length < WORKER_THRESHOLD || !workerRef.current) {
        const { searchDocuments } = await import('../services/docSearchService');
        const startTime = performance.now();
        const result = searchDocuments(query, documents, options);
        setLastSearchTime(performance.now() - startTime);
        return result;
      }

      return new Promise((resolve, reject) => {
        setIsSearching(true);
        pendingRef.current.set('current', { resolve, reject });

        const message: DocSearchWorkerMessage = {
          type: 'search',
          query,
          documents,
          options,
        };

        workerRef.current!.postMessage(message);
      });
    },
    []
  );

  const getHistory = useCallback((): DocSearchHistory[] => {
    return safeGetObject<DocSearchHistory[]>(DOC_SEARCH_HISTORY_KEY) || [];
  }, []);

  const addHistory = useCallback((query: string, searchType: DocSearchType): void => {
    if (!query.trim()) return;

    let history = getHistory();
    history = history.filter(
      (h) => !(h.query === query && h.searchType === searchType)
    );
    history.unshift({
      query,
      searchType,
      timestamp: new Date().toISOString(),
    });

    if (history.length > MAX_DOC_HISTORY) {
      history = history.slice(0, MAX_DOC_HISTORY);
    }

    safeSetObject(DOC_SEARCH_HISTORY_KEY, history);
  }, [getHistory]);

  const clearHistory = useCallback((): void => {
    localStorage.removeItem(DOC_SEARCH_HISTORY_KEY);
  }, []);

  return {
    search,
    getHistory,
    addHistory,
    clearHistory,
    isSearching,
    lastSearchTime,
  };
}

export { WORKER_THRESHOLD };
