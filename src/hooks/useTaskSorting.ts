import { useState, useCallback, useMemo } from 'react';
import type { Task, SortingConfig, TaskSortInfo, UrgencyLevel } from '../types/taskSorting';
import { createSortingService } from '../services/taskSortingService';

interface UseTaskSortingReturn {
  sortedTasks: Array<{ task: Task; sortInfo: TaskSortInfo }>;
  config: SortingConfig;
  updateConfig: (config: Partial<SortingConfig>) => void;
  resetConfig: () => void;
  refreshSorting: () => void;
  groupedTasks: Map<UrgencyLevel, Array<{ task: Task; sortInfo: TaskSortInfo }>>;
  getTaskSortRank: (taskId: string) => number;
  invalidateCache: () => void;
}

const DEFAULT_SORTING_CONFIG: SortingConfig = {
  urgencyWeights: {
    '极高': 100,
    '高': 75,
    '中': 50,
    '低': 25,
  },
  timeDecayFactor: 0.001,
};

export function useTaskSorting(
  tasks: Task[],
): UseTaskSortingReturn {
  const [config, setConfig] = useState<SortingConfig>(DEFAULT_SORTING_CONFIG);
  const [service] = useState(() => createSortingService(DEFAULT_SORTING_CONFIG));
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshSorting = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<SortingConfig>) => {
    setConfig(prev => {
      const updated = {
        urgencyWeights: { ...prev.urgencyWeights, ...newConfig.urgencyWeights },
        timeDecayFactor: newConfig.timeDecayFactor ?? prev.timeDecayFactor,
      };
      service.updateConfig(newConfig);
      return updated;
    });
    refreshSorting();
  }, [service, refreshSorting]);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_SORTING_CONFIG);
    service.updateConfig(DEFAULT_SORTING_CONFIG);
    refreshSorting();
  }, [service, refreshSorting]);

  const invalidateCache = useCallback(() => {
    service.invalidateCache();
    refreshSorting();
  }, [service, refreshSorting]);

  const sortedTasks = useMemo(() => {
    service.updateConfig(config);
    return service.getTasksWithSortingInfo(tasks, true);
  }, [tasks, config, service, refreshTrigger]);

  const groupedTasks = useMemo(() => {
    return service.getGroupedByUrgency(tasks, true);
  }, [tasks, config, service, refreshTrigger]);

  const getTaskSortRank = useCallback((taskId: string): number => {
    const found = sortedTasks.find(item => item.task.id === taskId);
    return found?.sortInfo.sortRank ?? -1;
  }, [sortedTasks]);

  return {
    sortedTasks,
    config,
    updateConfig,
    resetConfig,
    refreshSorting,
    groupedTasks,
    getTaskSortRank,
    invalidateCache,
  };
}

export function useSortingConfigStorage() {
  const STORAGE_KEY = 'task-sorting-config';

  const loadConfig = useCallback((): SortingConfig | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as SortingConfig;
      }
    } catch (e) {
      console.warn('Failed to load sorting config from storage:', e);
    }
    return null;
  }, []);

  const saveConfig = useCallback((config: SortingConfig) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save sorting config to storage:', e);
    }
  }, []);

  const clearConfig = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear sorting config from storage:', e);
    }
  }, []);

  return { loadConfig, saveConfig, clearConfig };
}
