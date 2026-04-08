import type { Document } from '../types';
import type {
  DocSearchOptions,
  DocSearchResult,
  DocSearchResponse,
  DocSearchHistory,
  DocSearchType,
  DocMatchMode,
} from '../types/search';
import { safeSetObject, safeGetObject } from './storageManager';

const DOC_SEARCH_HISTORY_KEY = 'doc_search_history';
const MAX_DOC_HISTORY = 10;
const DOC_CACHE_TTL = 10000;

interface DocSearchCache {
  query: string;
  searchType: DocSearchType;
  matchMode: DocMatchMode;
  results: DocSearchResult[];
  timestamp: number;
}

interface DocIndex {
  byNumber: Map<string, Document[]>;
  byName: Map<string, Document[]>;
  allDocs: Document[];
}

let searchCache: DocSearchCache | null = null;
let docIndexCache: DocIndex | null = null;

function buildDocIndex(documents: Document[]): DocIndex {
  if (docIndexCache) {
    return docIndexCache;
  }

  const byNumber = new Map<string, Document[]>();
  const byName = new Map<string, Document[]>();
  const allDocs: Document[] = [];

  for (const doc of documents) {
    allDocs.push(doc);

    const numberKey = doc.documentNumber.toLowerCase();
    const existingByNumber = byNumber.get(numberKey) || [];
    existingByNumber.push(doc);
    byNumber.set(numberKey, existingByNumber);

    const nameChars = doc.name.toLowerCase().split('');
    for (const char of nameChars) {
      if (char.trim().length >= 1) {
        const existingByName = byName.get(char) || [];
        if (!existingByName.includes(doc)) {
          existingByName.push(doc);
        }
        byName.set(char, existingByName);
      }
    }

    const nameKey = doc.name.toLowerCase();
    const existingByNameExact = byName.get(nameKey) || [];
    existingByNameExact.push(doc);
    byName.set(nameKey, existingByNameExact);
  }

  docIndexCache = { byNumber, byName, allDocs };
  return docIndexCache;
}

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText.includes(lowerQuery)) {
    return true;
  }

  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

function calculateRelevanceScore(doc: Document, query: string, searchType: DocSearchType): number {
  const lowerQuery = query.toLowerCase();

  if (searchType === 'number') {
    const number = doc.documentNumber.toLowerCase();
    if (number === lowerQuery) return 100;
    if (number.startsWith(lowerQuery)) return 80;
    if (number.includes(lowerQuery)) return 50;
    if (fuzzyMatch(number, lowerQuery)) return 30;
    return 0;
  } else {
    const name = doc.name.toLowerCase();
    if (name === lowerQuery) return 100;
    if (name.startsWith(lowerQuery)) return 80;
    if (name.includes(lowerQuery)) return 50;

    const queryChars = lowerQuery.split('');
    let matchedChars = 0;
    let nameIndex = 0;
    for (const char of queryChars) {
      const foundIndex = name.indexOf(char, nameIndex);
      if (foundIndex !== -1) {
        matchedChars++;
        nameIndex = foundIndex + 1;
      }
    }
    if (matchedChars === queryChars.length) {
      return 30 + (matchedChars / name.length) * 20;
    }
    return 0;
  }
}

function sortResults(
  results: DocSearchResult[],
  sortField: 'relevance' | 'createdTime' | 'fileSize',
  sortOrder: 'asc' | 'desc'
): DocSearchResult[] {
  const sorted = [...results].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'relevance':
        comparison = b.score - a.score;
        break;
      case 'createdTime': {
        const timeA = a.document.uploadDate ? new Date(a.document.uploadDate).getTime() : 0;
        const timeB = b.document.uploadDate ? new Date(b.document.uploadDate).getTime() : 0;
        comparison = timeB - timeA;
        break;
      }
      case 'fileSize':
        comparison = (b.document.fileSize || 0) - (a.document.fileSize || 0);
        break;
    }

    return sortOrder === 'desc' ? comparison : -comparison;
  });

  return sorted;
}

export function searchDocuments(
  query: string,
  documents: Document[],
  options: DocSearchOptions
): DocSearchResponse {
  const startTime = performance.now();

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

  if (
    searchCache &&
    searchCache.query === query.toLowerCase() &&
    searchCache.searchType === options.searchType &&
    searchCache.matchMode === options.matchMode &&
    Date.now() - searchCache.timestamp < DOC_CACHE_TTL
  ) {
    const sortedResults = sortResults(searchCache.results, options.sortField, options.sortOrder);
    const total = sortedResults.length;
    const totalPages = Math.ceil(total / options.pageSize);
    const startIndex = (options.page - 1) * options.pageSize;
    const pagedResults = sortedResults.slice(startIndex, startIndex + options.pageSize);

    return {
      results: pagedResults,
      total,
      page: options.page,
      pageSize: options.pageSize,
      totalPages,
      searchTime: performance.now() - startTime,
    };
  }

  const index = buildDocIndex(documents);
  const lowerQuery = query.toLowerCase();
  const results: DocSearchResult[] = [];
  const seen = new Set<string>();

  if (options.searchType === 'number') {
    if (options.matchMode === 'exact') {
      const exactDocs = index.byNumber.get(lowerQuery);
      if (exactDocs) {
        for (const doc of exactDocs) {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            results.push({
              document: doc,
              score: calculateRelevanceScore(doc, query, options.searchType),
              matchField: 'documentNumber',
              matchContent: doc.documentNumber,
            });
          }
        }
      }

      for (const [key, docs] of index.byNumber.entries()) {
        if (key !== lowerQuery && key.includes(lowerQuery)) {
          for (const doc of docs) {
            if (!seen.has(doc.id)) {
              seen.add(doc.id);
              results.push({
                document: doc,
                score: calculateRelevanceScore(doc, query, options.searchType),
                matchField: 'documentNumber',
                matchContent: doc.documentNumber,
              });
            }
          }
        }
      }
    } else {
      for (const doc of index.allDocs) {
        if (fuzzyMatch(doc.documentNumber, lowerQuery)) {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            results.push({
              document: doc,
              score: calculateRelevanceScore(doc, query, options.searchType),
              matchField: 'documentNumber',
              matchContent: doc.documentNumber,
            });
          }
        }
      }
    }
  } else {
    if (options.matchMode === 'exact') {
      const exactDocs = index.byName.get(lowerQuery);
      if (exactDocs) {
        for (const doc of exactDocs) {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            results.push({
              document: doc,
              score: calculateRelevanceScore(doc, query, options.searchType),
              matchField: 'name',
              matchContent: doc.name,
            });
          }
        }
      }

      for (const [key, docs] of index.byName.entries()) {
        if (key !== lowerQuery && key.includes(lowerQuery)) {
          for (const doc of docs) {
            if (!seen.has(doc.id)) {
              seen.add(doc.id);
              results.push({
                document: doc,
                score: calculateRelevanceScore(doc, query, options.searchType),
                matchField: 'name',
                matchContent: doc.name,
              });
            }
          }
        }
      }
    } else {
      const queryChars = lowerQuery.split('').filter(c => c.trim().length > 0);
      if (queryChars.length > 0) {
        let candidateDocs = index.allDocs;

        const firstChar = queryChars[0];
        const charMatches = index.byName.get(firstChar);
        if (charMatches) {
          candidateDocs = charMatches;
        }

        for (const doc of candidateDocs) {
          if (fuzzyMatch(doc.name, lowerQuery)) {
            if (!seen.has(doc.id)) {
              seen.add(doc.id);
              results.push({
                document: doc,
                score: calculateRelevanceScore(doc, query, options.searchType),
                matchField: 'name',
                matchContent: doc.name,
              });
            }
          }
        }
      }
    }
  }

  const sortedResults = sortResults(results, options.sortField, options.sortOrder);

  searchCache = {
    query: lowerQuery,
    searchType: options.searchType,
    matchMode: options.matchMode,
    results: sortedResults,
    timestamp: Date.now(),
  };

  const total = sortedResults.length;
  const totalPages = Math.ceil(total / options.pageSize);
  const startIndex = (options.page - 1) * options.pageSize;
  const pagedResults = sortedResults.slice(startIndex, startIndex + options.pageSize);

  return {
    results: pagedResults,
    total,
    page: options.page,
    pageSize: options.pageSize,
    totalPages,
    searchTime: performance.now() - startTime,
  };
}

export function invalidateDocSearchCache(): void {
  searchCache = null;
  docIndexCache = null;
}

export function getDocSearchHistory(): DocSearchHistory[] {
  return safeGetObject<DocSearchHistory[]>(DOC_SEARCH_HISTORY_KEY) || [];
}

export function addDocSearchHistory(query: string, searchType: DocSearchType): void {
  if (!query.trim()) return;

  let history = getDocSearchHistory();
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
}

export function clearDocSearchHistory(): void {
  localStorage.removeItem(DOC_SEARCH_HISTORY_KEY);
}

export function invalidateDocIndexCache(): void {
  docIndexCache = null;
}
