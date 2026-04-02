import type { SearchResult, SearchHistory } from '../types/search';
import type { Project, Task } from '../types';
import { safeSetObject, safeGetObject } from './storageManager';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;
const CACHE_TTL = 30000;

interface SearchCache {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

let searchCache: SearchCache | null = null;
let projectIndex: Map<string, SearchResult[]> | null = null;

function buildProjectIndex(projects: Project[]): Map<string, SearchResult[]> {
  const index = new Map<string, SearchResult[]>();

  projects.forEach((project) => {
    const projectResults: SearchResult[] = [];
    projectResults.push({
      id: project.id,
      type: 'project',
      title: project.name,
      subtitle: `项目编号: ${project.projectNumber}`,
      path: `/projects/${project.id}`,
      score: 0,
    });

    (project.modules || []).forEach((module) => {
      projectResults.push({
        id: module.id,
        type: 'module',
        title: module.moduleName,
        subtitle: `模块编号: ${module.moduleNumber} | 种类: ${module.category}`,
        path: `/modules/${module.id}`,
        score: 0,
      });

      (module.components || []).forEach((component) => {
        projectResults.push({
          id: component.id,
          type: 'component',
          title: component.componentName,
          subtitle: `组件编号: ${component.componentNumber}`,
          path: `/components/${component.id}`,
          score: 0,
        });
      });
    });

    (project.documents || []).forEach((doc) => {
      projectResults.push({
        id: doc.id,
        type: 'document',
        title: doc.name,
        subtitle: `类型: ${doc.type} | 阶段: ${doc.stage}`,
        path: `/projects/${project.id}/files`,
        score: 0,
      });
    });

    (project.software || []).forEach((soft) => {
      projectResults.push({
        id: soft.id,
        type: 'software',
        title: soft.name,
        subtitle: `版本: ${soft.version} | 阶段: ${soft.stage}`,
        path: `/projects/${project.id}/files`,
        score: 0,
      });
    });

    projectResults.forEach((result) => {
      const words = result.title.toLowerCase().split('');
      words.forEach((word) => {
        if (word.length >= 2) {
          const existing = index.get(word) || [];
          existing.push(result);
          index.set(word, existing);
        }
      });
      const lowerTitle = result.title.toLowerCase();
      const existing = index.get(lowerTitle) || [];
      existing.push(result);
      index.set(lowerTitle, existing);
    });
  });

  return index;
}

function searchIndex(
  query: string,
  index: Map<string, SearchResult[]>
): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split('').filter((w) => w.length >= 2);

  queryWords.forEach((word) => {
    const matches = index.get(word);
    if (matches) {
      matches.forEach((result) => {
        if (!seen.has(`${result.type}-${result.id}`)) {
          seen.add(`${result.type}-${result.id}`);
          results.push(result);
        }
      });
    }
  });

  return results;
}

export function searchAll(
  query: string,
  projects: Project[],
  tasks: Task[]
): SearchResult[] {
  if (!query.trim()) return [];

  const cacheKey = query.toLowerCase();
  if (
    searchCache &&
    searchCache.query === cacheKey &&
    Date.now() - searchCache.timestamp < CACHE_TTL
  ) {
    return searchCache.results;
  }

  if (!projectIndex) {
    projectIndex = buildProjectIndex(projects);
  }

  const indexedResults = searchIndex(query, projectIndex);
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  indexedResults.forEach((result) => {
    const score = calculateScore(query, result.title);
    results.push({ ...result, score });
    seen.add(`${result.type}-${result.id}`);
  });

  tasks.forEach((task) => {
    if (task.title.toLowerCase().includes(cacheKey)) {
      if (!seen.has(`task-${task.id}`)) {
        results.push({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: `状态: ${task.status} | 优先级: ${task.priority}`,
          path: '/tasks',
          score: calculateScore(query, task.title),
        });
      }
    }
  });

  const sortedResults = results.sort((a, b) => b.score - a.score);

  searchCache = {
    query: cacheKey,
    results: sortedResults,
    timestamp: Date.now(),
  };

  return sortedResults;
}

function calculateScore(query: string, ...fields: string[]): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  fields.forEach((field) => {
    const lowerField = field.toLowerCase();
    if (lowerField === lowerQuery) {
      score += 100;
    } else if (lowerField.startsWith(lowerQuery)) {
      score += 80;
    } else if (lowerField.includes(lowerQuery)) {
      score += 50;
    }
  });

  return score;
}

export function invalidateSearchCache(): void {
  searchCache = null;
  projectIndex = null;
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
