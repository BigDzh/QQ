export interface SearchResult {
  id: string;
  type: 'project' | 'module' | 'component' | 'document' | 'software' | 'task';
  title: string;
  subtitle?: string;
  path: string;
  score: number;
}

export interface SearchHistory {
  query: string;
  timestamp: string;
}
