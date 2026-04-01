export type UrgencyLevel = '极高' | '高' | '中' | '低';

export interface UrgencyConfig {
  level: UrgencyLevel;
  weight: number;
  label: string;
}

export interface SortingConfig {
  urgencyWeights: Record<UrgencyLevel, number>;
  timeDecayFactor: number;
}

export interface TaskSortInfo {
  taskId: string;
  urgencyScore: number;
  timeScore: number;
  combinedScore: number;
  sortRank: number;
}

export interface SortedTaskGroup {
  urgency: UrgencyLevel;
  tasks: Array<{
    task: Task;
    sortInfo: TaskSortInfo;
  }>;
}

export interface CachedSortingResult {
  tasks: TaskSortInfo[];
  timestamp: number;
  configHash: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  riskItem?: string;
  priority: '低' | '中' | '高' | '紧急';
  status: TaskStatus;
  dueDate?: string;
  relatedComponentIds?: string[];
  relatedDocumentIds?: string[];
  projectId?: string;
  projectName?: string;
  completed?: boolean;
  createdAt: string;
  completedAt?: string;
}

export type TaskStatus = '进行中' | '已完成' | '已过期';
