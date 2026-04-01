import { useCallback, useRef, useEffect } from 'react';

export interface DeleteOperation {
  id: string;
  type: 'project' | 'task' | 'workflow' | 'step' | 'module' | 'component' | 'other';
  timestamp: number;
  targetName?: string;
}

export interface UseDeleteMonitorOptions {
  maxHistorySize?: number;
  onDeleteOperation?: (operation: DeleteOperation) => void;
}

export interface UseDeleteMonitorReturn {
  recordDelete: (operation: Omit<DeleteOperation, 'timestamp'>) => void;
  getDeleteHistory: () => DeleteOperation[];
  clearHistory: () => void;
  getDeleteStats: () => {
    total: number;
    byType: Record<string, number>;
    recentCount: number;
  };
  isDeleteFrequencyHigh: (threshold?: number) => boolean;
}

export function useDeleteMonitor(options: UseDeleteMonitorOptions = {}): UseDeleteMonitorReturn {
  const { maxHistorySize = 100, onDeleteOperation } = options;
  const historyRef = useRef<DeleteOperation[]>([]);

  const recordDelete = useCallback((operation: Omit<DeleteOperation, 'timestamp'>) => {
    const fullOperation: DeleteOperation = {
      ...operation,
      timestamp: Date.now(),
    };

    historyRef.current = [
      fullOperation,
      ...historyRef.current.slice(0, maxHistorySize - 1),
    ];

    if (onDeleteOperation) {
      onDeleteOperation(fullOperation);
    }

    if (import.meta.env.DEV) {
      console.log('[DeleteMonitor] Recorded delete operation:', fullOperation);
    }
  }, [maxHistorySize, onDeleteOperation]);

  const getDeleteHistory = useCallback((): DeleteOperation[] => {
    return [...historyRef.current];
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  const getDeleteStats = useCallback(() => {
    const history = historyRef.current;
    const byType: Record<string, number> = {};

    history.forEach((op) => {
      byType[op.type] = (byType[op.type] || 0) + 1;
    });

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentCount = history.filter((op) => op.timestamp > oneHourAgo).length;

    return {
      total: history.length,
      byType,
      recentCount,
    };
  }, []);

  const isDeleteFrequencyHigh = useCallback((threshold = 10) => {
    const stats = getDeleteStats();
    return stats.recentCount > threshold;
  }, [getDeleteStats]);

  useEffect(() => {
    return () => {
      if (import.meta.env.DEV) {
        console.log('[DeleteMonitor] Component unmounted, final stats:', getDeleteStats());
      }
    };
  }, [getDeleteStats]);

  return {
    recordDelete,
    getDeleteHistory,
    clearHistory,
    getDeleteStats,
    isDeleteFrequencyHigh,
  };
}

export interface DeleteConfirmationState {
  isOpen: boolean;
  pendingId: string | null;
  onConfirm: (() => void) | null;
}

export function createDeleteConfirmationManager() {
  const subscribers = new Set<(state: DeleteConfirmationState) => void>();
  let currentState: DeleteConfirmationState = {
    isOpen: false,
    pendingId: null,
    onConfirm: null,
  };

  const notify = () => {
    subscribers.forEach((callback) => callback(currentState));
  };

  return {
    subscribe(callback: (state: DeleteConfirmationState) => void) {
      subscribers.add(callback);
      callback(currentState);
      return () => subscribers.delete(callback);
    },

    open(id: string, onConfirm: () => void) {
      currentState = { isOpen: true, pendingId: id, onConfirm };
      notify();
    },

    close() {
      currentState = { isOpen: false, pendingId: null, onConfirm: null };
      notify();
    },

    confirm() {
      if (currentState.onConfirm) {
        currentState.onConfirm();
      }
      this.close();
    },

    getState() {
      return currentState;
    },
  };
}

export const deleteMonitor = createDeleteConfirmationManager();