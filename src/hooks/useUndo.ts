import { useCallback, useEffect, useRef, useState } from 'react';
import {
  recordAction,
  undoAction,
  getUndoHistory,
  canUndo,
  clearUndoHistory,
  type UndoAction,
} from '../services/undoService';

interface UseUndoOptions {
  maxHistory?: number;
  timeout?: number;
  onUndoSuccess?: (action: UndoAction) => void;
  onUndoFail?: (action: UndoAction, reason: string) => void;
}

export interface UndoState {
  id: string;
  type: string;
  description: string;
  remainingTime: number;
  data: unknown;
}

export function useUndo(options: UseUndoOptions = {}) {
  const {
    onUndoSuccess,
    onUndoFail,
  } = options;

  const [history, setHistory] = useState<UndoState[]>([]);
  const [canUndoAction, setCanUndoAction] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateHistory = useCallback(() => {
    const rawHistory = getUndoHistory();
    setHistory(
      rawHistory.map((action) => ({
        id: action.id,
        type: action.type,
        description: action.description,
        remainingTime: action.remainingTime,
        data: action.data,
      }))
    );
    setCanUndoAction(canUndo());
  }, []);

  useEffect(() => {
    updateHistory();

    intervalRef.current = setInterval(updateHistory, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [updateHistory]);

  const record = useCallback(
    (type: string, description: string, data: unknown, undo: () => Promise<void>) => {
      const id = recordAction(type, description, data, undo);
      updateHistory();
      return id;
    },
    [updateHistory]
  );

  const undo = useCallback(
    async (id?: string) => {
      const actionId = id || history[0]?.id;
      if (!actionId) return false;

      const action = history.find((h) => h.id === actionId);
      const success = await undoAction(actionId);

      if (success && action) {
        onUndoSuccess?.({
          id: action.id,
          type: action.type,
          description: action.description,
          timestamp: Date.now(),
          data: action.data,
          undo: async () => {},
        });
      } else if (!success && action) {
        onUndoFail?.(
          {
            id: action.id,
            type: action.type,
            description: action.description,
            timestamp: Date.now(),
            data: action.data,
            undo: async () => {},
          },
          '撤销超时或操作失败'
        );
      }

      updateHistory();
      return success;
    },
    [history, onUndoSuccess, onUndoFail, updateHistory]
  );

  const clear = useCallback(() => {
    clearUndoHistory();
    updateHistory();
  }, [updateHistory]);

  return {
    history,
    canUndo: canUndoAction,
    record,
    undo,
    clear,
  };
}

export default useUndo;