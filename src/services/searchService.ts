import type { SearchResult, SearchHistory } from '../types/search';
import type { Project, Task } from '../types';
import { safeSetObject, safeGetObject } from './storageManager';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;
const SEARCH_CACHE_TTL_MS = 60000; // 1 minute cache
const MAX_CACHE_SIZE = 100;
const DEBOUNCE_MS = 300;

interface SearchIndexEntry {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  path: string;
  projectId?: string;
  searchableText: string; // Pre-computed lowercase text for faster search
}

interface SearchCache {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

class DebounceManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = DEBOUNCE_MS
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        fn(...args);
        this.timers.delete(key);
      }, delay);

      this.timers.set(key, timer);
    };
  }

  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

class SearchCacheManager {
  private cache: Map<string, SearchCache> = new Map();
  private maxSize: number;

  constructor(maxSize: number = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  get(query: string): SearchResult[] | null {
    const entry = this.cache.get(query);
    
    if (!entry) return null;
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > SEARCH_CACHE_TTL_MS) {
      this.cache.delete(query);
      return null;
    }

    return entry.results;
  }

  set(query: string, results: SearchResult[]): void {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(query)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(query, {
      query,
      results,
      timestamp: Date.now(),
    });
  }

  invalidate(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > SEARCH_CACHE_TTL_MS) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Could track hits/misses if needed
    };
  }
}

// Global instances
const debounceManager = new DebounceManager();
const searchCacheManager = new SearchCacheManager(MAX_CACHE_SIZE);

// Search index for fast lookups
let searchIndex: SearchIndexEntry[] | null = null;
let indexVersion: number = -1;
let lastIndexedDataVersion: string = '';

function buildSearchIndex(projects: Project[], tasks: Task[]): SearchIndexEntry[] {
  const dataVersion = `${projects.length}-${tasks.length}-${Date.now()}`;
  
  // Return cached index if data hasn't changed significantly
  if (searchIndex && dataVersion === lastIndexedDataVersion) {
    return searchIndex;
  }

  const entries: SearchIndexEntry[] = [];

  for (const project of projects) {
    entries.push({
      id: project.id,
      type: 'project',
      title: project.name,
      subtitle: `项目编号: ${project.projectNumber}`,
      path: `/projects/${project.id}`,
      projectId: project.id,
      searchableText: `${project.name} ${project.projectNumber}`.toLowerCase(),
    });

    for (const system of project.systems || []) {
      entries.push({
        id: system.id,
        type: 'system',
        title: system.systemName,
        subtitle: `系统编号: ${system.systemNumber} | 阶段: ${system.stage} | 状态: ${system.status}`,
        path: `/systems/${system.id}`,
        projectId: project.id,
        searchableText: `${system.systemName} ${system.systemNumber} ${system.stage} ${system.status}`.toLowerCase(),
      });
    }

    for (const module of project.modules || []) {
      entries.push({
        id: module.id,
        type: 'module',
        title: module.moduleName,
        subtitle: `模块编号: ${module.moduleNumber} | 种类: ${module.category}`,
        path: `/modules/${module.id}`,
        projectId: project.id,
        searchableText: `${module.moduleName} ${module.moduleNumber} ${module.category || ''}`.toLowerCase(),
      });

      for (const component of module.components || []) {
        entries.push({
          id: component.id,
          type: 'component',
          title: component.componentName,
          subtitle: `组件编号: ${component.componentNumber}`,
          path: `/components/${component.id}`,
          projectId: project.id,
          searchableText: `${component.componentName} ${component.componentNumber}`.toLowerCase(),
        });
      }
    }

    for (const doc of project.documents || []) {
      entries.push({
        id: doc.id,
        type: 'document',
        title: doc.name,
        subtitle: `类型: ${doc.type} | 阶段: ${doc.stage}`,
        path: `/projects/${project.id}/files`,
        projectId: project.id,
        searchableText: `${doc.name} ${doc.documentNumber || ''} ${doc.type || ''} ${doc.stage || ''}`.toLowerCase(),
      });
    }

    for (const soft of project.software || []) {
      entries.push({
        id: soft.id,
        type: 'software',
        title: soft.name,
        subtitle: `版本: ${soft.version} | 阶段: ${soft.stage}`,
        path: `/projects/${project.id}/files`,
        projectId: project.id,
        searchableText: `${soft.name} ${soft.version || ''} ${soft.stage || ''}`.toLowerCase(),
      });
    }
  }

  for (const task of tasks) {
    entries.push({
      id: task.id,
      type: 'task',
      title: task.title,
      subtitle: `状态: ${task.status} | 优先级: ${task.priority}`,
      path: '/tasks',
      searchableText: `${task.title} ${task.status || ''} ${task.priority || ''}`.toLowerCase(),
    });
  }

  searchIndex = entries;
  lastIndexedDataVersion = dataVersion;
  indexVersion++;

  return entries;
}

function fuzzySearchOptimized(query: string, searchText: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerText = searchText.toLowerCase(); // Already lowered in index

  // Fast path: exact match or contains
  if (lowerText.includes(lowerQuery)) {
    return true;
  }

  // Slower path: character-by-character fuzzy match
  const queryChars = lowerQuery.split('');
  let textIndex = 0;
  
  for (const char of queryChars) {
    const foundIndex = lowerText.indexOf(char, textIndex);
    if (foundIndex === -1) {
      return false;
    }
    textIndex = foundIndex + 1;
  }
  
  return true;
}

function calculateScore(query: string, title: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (lowerTitle === lowerQuery) {
    return 100;
  } else if (lowerTitle.startsWith(lowerQuery)) {
    return 80;
  } else if (lowerTitle.includes(lowerQuery)) {
    return 50;
  }
  return 10;
}

export function searchAll(
  query: string,
  projects: Project[],
  tasks: Task[]
): SearchResult[] {
  if (!query.trim()) return [];

  // Check cache first
  const cachedResults = searchCacheManager.get(query);
  if (cachedResults) {
    return cachedResults;
  }

  // Build or use cached search index
  const index = buildSearchIndex(projects, tasks);

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // Search through pre-built index (much faster than nested loops)
  for (const entry of index) {
    if (fuzzySearchOptimized(query, entry.searchableText)) {
      const key = `${entry.type}-${entry.id}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        
        results.push({
          id: entry.id,
          type: entry.type as SearchResult['type'],
          title: entry.title,
          subtitle: entry.subtitle,
          path: entry.path,
          score: calculateScore(query, entry.title),
        });
      }
    }
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);

  // Cache the results
  searchCacheManager.set(query, results);

  return results;
}

export function searchAllDebounced(
  query: string,
  projects: Project[],
  tasks: Task[],
  callback: (results: SearchResult[]) => void
): () => void {
  const debouncedSearch = debounceManager.debounce(
    'global-search',
    () => {
      const results = searchAll(query, projects, tasks);
      callback(results);
    },
    DEBOUNCE_MS
  );

  // Execute immediately for empty queries
  if (!query.trim()) {
    callback([]);
    return () => {};
  }

  debouncedSearch();

  // Return cancel function
  return () => {
    debounceManager.cancel('global-search');
  };
}

export function invalidateSearchCache(): void {
  searchCacheManager.invalidate();
  searchIndex = null;
  indexVersion = -1;
  lastIndexedDataVersion = '';
}

export function cleanupSearchCache(): void {
  searchCacheManager.cleanup();
}

export function getSearchHistory(): SearchHistory[] {
  return safeGetObject<SearchHistory[]>(SEARCH_HISTORY_KEY) || [];
}

export function addSearchHistory(query: string): void {
  if (!query.trim()) return;

  let history = getSearchHistory();
  history = history.filter((h) => h.query !== query);
  history.unshift({ query, timestamp: new Date().toISOString() });

  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }

  safeSetObject(SEARCH_HISTORY_KEY, history);
}

export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

export function getSearchStats(): {
  indexSize: number;
  indexVersion: number;
  cacheSize: number;
  isIndexed: boolean;
} {
  return {
    indexSize: searchIndex?.length || 0,
    indexVersion,
    cacheSize: searchCacheManager.getStats().size,
    isIndexed: searchIndex !== null,
  };
}

export function prefetchCommonSearches(projects: Project[], tasks: Task[]): void {
  // Prefetch common single-character searches to warm up cache
  const commonQueries = ['', 'a', '项', '组', '模', '文'];
  
  for (const query of commonQueries) {
    if (query.trim()) {
      searchAll(query, projects, tasks);
    }
  }
}
