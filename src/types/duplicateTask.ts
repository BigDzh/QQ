export type DuplicateMatchField = 'title' | 'description' | 'priority' | 'dueDate' | 'all';
export type DeletionAction = 'move_to_trash' | 'permanent_delete';
export type DeletionTrigger = 'manual' | 'automatic';

export interface DuplicateRule {
  id: string;
  name: string;
  enabled: boolean;
  matchFields: DuplicateMatchField[];
  matchFieldsOperator: 'and' | 'or';
  duplicateCountThreshold: number;
  timeWindowDays: number;
  protectedTaskIds: string[];
  deletionAction: DeletionAction;
  requireConfirmation: boolean;
  keepNewest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeletionHistory {
  id: string;
  taskId: string;
  taskTitle: string;
  taskSnapshot: TaskSnapshot;
  ruleId: string;
  ruleName: string;
  deletedAt: string;
  deletedBy: string;
  status: 'pending' | 'completed' | 'restored' | 'failed';
  recoveryAvailable: boolean;
  recoveryDeadline: string;
}

export interface TaskSnapshot {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  projectId?: string;
  projectName?: string;
}

export interface DuplicateGroup {
  ruleId: string;
  matchKey: string;
  tasks: DuplicateTaskInfo[];
}

export interface DuplicateTaskInfo {
  task: Task;
  isNewest: boolean;
  isProtected: boolean;
  matchScore: number;
}

export interface DeletionResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  errors: string[];
  historyIds: string[];
}

export interface TrashTask {
  id: string;
  originalTask: TaskSnapshot;
  deletedAt: string;
  deletedBy: string;
  ruleId?: string;
  ruleName?: string;
  recoveryDeadline: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  riskItem?: string;
  priority: '低' | '中' | '高' | '紧急';
  status: '进行中' | '已完成' | '已过期';
  dueDate?: string;
  relatedComponentIds?: string[];
  relatedDocumentIds?: string[];
  projectId?: string;
  projectName?: string;
  completed?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface DeletionConfig {
  autoCleanupDays: number;
  maxTrashSize: number;
  enableLogging: boolean;
  logRetentionDays: number;
  allowRecovery: boolean;
  recoveryDeadlineHours: number;
}

export const DEFAULT_DELETION_CONFIG: DeletionConfig = {
  autoCleanupDays: 30,
  maxTrashSize: 100,
  enableLogging: true,
  logRetentionDays: 90,
  allowRecovery: true,
  recoveryDeadlineHours: 168,
};

export const DEFAULT_DUPLICATE_RULE: Omit<DuplicateRule, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '默认重复任务规则',
  enabled: true,
  matchFields: ['title'],
  matchFieldsOperator: 'or',
  duplicateCountThreshold: 2,
  timeWindowDays: 30,
  protectedTaskIds: [],
  deletionAction: 'move_to_trash',
  requireConfirmation: true,
  keepNewest: true,
};
