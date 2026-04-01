import { useState, useCallback, useEffect } from 'react';
import { duplicateTaskService } from '../services/duplicateTaskService';
import type {
  Task,
  DuplicateRule,
  DuplicateGroup,
  TrashTask,
  DeletionHistory,
  DeletionConfig,
} from '../types/duplicateTask';

interface UseDuplicateTaskManagerReturn {
  rules: DuplicateRule[];
  trashItems: TrashTask[];
  historyItems: DeletionHistory[];
  config: DeletionConfig;
  duplicateGroups: DuplicateGroup[];
  stats: {
    totalRules: number;
    enabledRules: number;
    trashCount: number;
    historyCount: number;
    recoverableCount: number;
  };
  createRule: (partial: Partial<DuplicateRule>) => DuplicateRule;
  updateRule: (id: string, updates: Partial<DuplicateRule>) => DuplicateRule | null;
  deleteRule: (id: string) => boolean;
  toggleRule: (id: string) => boolean;
  updateConfig: (updates: Partial<DeletionConfig>) => void;
  findDuplicates: (tasks: Task[]) => DuplicateGroup[];
  checkDuplicate: (task: Omit<Task, 'id' | 'createdAt'>) => { isDuplicate: boolean; duplicateTask?: Task };
  deleteTasks: (tasks: Task[], ruleId: string, taskIds: string[], deletedBy?: string) => {
    success: boolean;
    deletedCount: number;
    failedCount: number;
    errors: string[];
    historyIds: string[];
    deletedTaskIds: string[];
  };
  updateTaskCache: (tasks: Task[]) => void;
  restoreTask: (trashId: string) => boolean;
  permanentlyDelete: (trashId: string) => boolean;
  permanentlyDeleteByOriginalTaskId: (originalTaskId: string, newStatus?: string) => boolean;
  getTrashItems: () => TrashTask[];
  emptyTrash: () => number;
  cleanupExpired: () => number;
  refresh: () => void;
}

export function useDuplicateTaskManager(): UseDuplicateTaskManagerReturn {
  const [rules, setRules] = useState<DuplicateRule[]>([]);
  const [trashItems, setTrashItems] = useState<TrashTask[]>([]);
  const [historyItems, setHistoryItems] = useState<DeletionHistory[]>([]);
  const [config, setConfig] = useState<DeletionConfig>(duplicateTaskService.getConfig());
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [stats, setStats] = useState(duplicateTaskService.getStats());

  useEffect(() => {
    const unsubscribe = duplicateTaskService.subscribe(() => {
      setRules(duplicateTaskService.getRules());
      setTrashItems(duplicateTaskService.getTrash());
      setHistoryItems(duplicateTaskService.getDeletionHistory());
      setConfig(duplicateTaskService.getConfig());
      setStats(duplicateTaskService.getStats());
    });

    setRules(duplicateTaskService.getRules());
    setTrashItems(duplicateTaskService.getTrash());
    setHistoryItems(duplicateTaskService.getDeletionHistory());
    setConfig(duplicateTaskService.getConfig());
    setStats(duplicateTaskService.getStats());

    return unsubscribe;
  }, []);

  const refresh = useCallback(() => {
    setRules([...duplicateTaskService.getRules()]);
    setTrashItems([...duplicateTaskService.getTrash()]);
    setHistoryItems([...duplicateTaskService.getDeletionHistory()]);
    setConfig({ ...duplicateTaskService.getConfig() });
    setStats({ ...duplicateTaskService.getStats() });
  }, []);

  const createRule = useCallback((partial: Partial<DuplicateRule>) => {
    return duplicateTaskService.createRule(partial);
  }, []);

  const updateRule = useCallback((id: string, updates: Partial<DuplicateRule>) => {
    return duplicateTaskService.updateRule(id, updates);
  }, []);

  const deleteRule = useCallback((id: string) => {
    return duplicateTaskService.deleteRule(id);
  }, []);

  const toggleRule = useCallback((id: string) => {
    return duplicateTaskService.toggleRule(id);
  }, []);

  const updateConfig = useCallback((updates: Partial<DeletionConfig>) => {
    duplicateTaskService.updateConfig(updates);
  }, []);

  const checkDuplicate = useCallback((task: Omit<Task, 'id' | 'createdAt'>) => {
    return duplicateTaskService.checkDuplicate(task);
  }, []);

  const updateTaskCache = useCallback((tasks: Task[]) => {
    duplicateTaskService.updateTaskCache(tasks);
  }, []);

  const findDuplicates = useCallback((tasks: Task[]) => {
    const groups = duplicateTaskService.findDuplicateGroups(tasks);
    setDuplicateGroups(groups);
    return groups;
  }, []);

  const deleteTasks = useCallback((
    tasks: Task[],
    ruleId: string,
    taskIds: string[],
    deletedBy?: string
  ) => {
    return duplicateTaskService.deleteTasks(tasks, ruleId, taskIds, deletedBy);
  }, []);

  const restoreTask = useCallback((trashId: string) => {
    return duplicateTaskService.restoreFromTrash(trashId);
  }, []);

  const permanentlyDelete = useCallback((trashId: string) => {
    return duplicateTaskService.permanentlyDeleteFromTrash(trashId);
  }, []);

  const permanentlyDeleteByOriginalTaskId = useCallback((originalTaskId: string, newStatus?: string) => {
    return duplicateTaskService.permanentlyDeleteByOriginalTaskId(originalTaskId, newStatus);
  }, []);

  const getTrashItems = useCallback(() => {
    return duplicateTaskService.getTrash();
  }, []);

  const emptyTrash = useCallback(() => {
    return duplicateTaskService.emptyTrash();
  }, []);

  const cleanupExpired = useCallback(() => {
    return duplicateTaskService.cleanupExpiredTrash();
  }, []);

  return {
    rules,
    trashItems,
    historyItems,
    config,
    duplicateGroups,
    stats,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    updateConfig,
    findDuplicates,
    checkDuplicate,
    deleteTasks,
    updateTaskCache,
    restoreTask,
    permanentlyDelete,
    permanentlyDeleteByOriginalTaskId,
    getTrashItems,
    emptyTrash,
    cleanupExpired,
    refresh,
  };
}
