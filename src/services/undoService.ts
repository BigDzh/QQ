import { generateId } from '../utils/auth';

export interface UndoAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  data: unknown;
  undo: () => Promise<void>;
}

export interface UndoActionWithTimeout extends UndoAction {
  remainingTime: number;
}

const MAX_HISTORY = 10;
const UNDO_TIMEOUT = 10000;

let undoHistory: UndoAction[] = [];

export function recordAction(
  type: string,
  description: string,
  data: unknown,
  undo: () => Promise<void>
): string {
  const id = generateId();
  
  undoHistory.unshift({
    id,
    type,
    description,
    timestamp: Date.now(),
    data,
    undo,
  });

  if (undoHistory.length > MAX_HISTORY) {
    undoHistory.pop();
  }

  return id;
}

export async function undoAction(id: string): Promise<boolean> {
  const action = undoHistory.find((a) => a.id === id);
  if (!action) return false;

  if (Date.now() - action.timestamp > UNDO_TIMEOUT) {
    return false;
  }

  try {
    await action.undo();
    undoHistory = undoHistory.filter((a) => a.id !== id);
    return true;
  } catch (error) {
    console.error('Undo failed:', error);
    return false;
  }
}

export function getUndoHistory(): UndoActionWithTimeout[] {
  const now = Date.now();
  return undoHistory.map((action) => ({
    ...action,
    remainingTime: Math.max(0, UNDO_TIMEOUT - (now - action.timestamp)),
  }));
}

export function canUndo(): boolean {
  if (undoHistory.length === 0) return false;
  const oldest = undoHistory[undoHistory.length - 1];
  return Date.now() - oldest.timestamp < UNDO_TIMEOUT;
}

export function clearUndoHistory(): void {
  undoHistory = [];
}
