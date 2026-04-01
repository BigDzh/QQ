export interface SearchResult {
  id: string;
  type: 'project' | 'module' | 'component' | 'document' | 'software' | 'task' | 'designFile' | 'review' | 'user';
  title: string;
  subtitle?: string;
  path: string;
  score: number;
  highlightContent?: string;
  matchField?: string;
  projectName?: string;
  projectId?: string;
}

export interface SearchHistory {
  query: string;
  timestamp: string;
}

export interface GlobalSearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  maxResults?: number;
  includeArchived?: boolean;
  sortBy?: 'relevance' | 'name' | 'date' | 'type';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface GlobalSearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchTime: number;
  query: string;
}

export type DocSearchType = 'number' | 'name';
export type DocMatchMode = 'exact' | 'fuzzy';
export type DocSortField = 'relevance' | 'createdTime' | 'fileSize';
export type DocSortOrder = 'asc' | 'desc';

export interface DocSearchOptions {
  searchType: DocSearchType;
  matchMode: DocMatchMode;
  sortField: DocSortField;
  sortOrder: DocSortOrder;
  page: number;
  pageSize: number;
}

export interface DocSearchResult {
  document: import('./index').Document;
  score: number;
  matchField: 'documentNumber' | 'name';
  matchContent: string;
}

export interface DocSearchResponse {
  results: DocSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchTime: number;
}

export interface DocSearchHistory {
  query: string;
  searchType: DocSearchType;
  timestamp: string;
}
