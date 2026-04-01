import { useEffect, useRef, useCallback, useState } from 'react';
import type { ComputeTask, ComputeResult, WorkerMessage, WorkerResponse } from '../workers/computeWorker';

export interface UseComputeWorkerOptions {
  enabled?: boolean;
  maxConcurrent?: number;
  onPerformance?: (type: string, duration: number) => void;
}

export interface UseComputeWorkerReturn {
  execute: <T>(task: ComputeTask<T>) => Promise<ComputeResult<T>>;
  cancel: (taskId: string) => void;
  cancelAll: () => void;
  isReady: boolean;
  pendingCount: number;
  metrics: Array<{ taskId: string; type: string; duration: number }>;
}

const THRESHOLDS = {
  search: 100,
  sort: 100,
  filter: 100,
  aggregate: 50,
  index: 100,
};

function shouldUseWorker(type: ComputeTask['type'], dataLength: number): boolean {
  return dataLength >= (THRESHOLDS[type] || 100);
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useComputeWorker(options: UseComputeWorkerOptions = {}): UseComputeWorkerReturn {
  const { enabled = true, maxConcurrent = 5, onPerformance } = options;

  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, { resolve: (result: ComputeResult) => void; reject: (error: Error) => void }>>(new Map());
  const concurrentRef = useRef<number>(0);
  const queueRef = useRef<Array<{ task: ComputeTask; resolve: (result: ComputeResult) => void; reject: (error: Error) => void }>>([]);

  const [isReady, setIsReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [metrics, setMetrics] = useState<Array<{ taskId: string; type: string; duration: number }>>([]);

  useEffect(() => {
    if (!enabled) return;

    const worker = new Worker(new URL('../workers/computeWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, taskId, result, error } = event.data;

      if (type === 'result' && result) {
        const pending = pendingRef.current.get(taskId);
        if (pending) {
          pending.resolve(result);
          pendingRef.current.delete(taskId);
          concurrentRef.current = Math.max(0, concurrentRef.current - 1);
          setPendingCount(pendingRef.current.size);

          onPerformance?.(result.taskId, result.duration);

          setMetrics(prev => [...prev.slice(-49), { taskId, type: 'compute', duration: result.duration }]);

          processQueue();
        }
      } else if (type === 'error') {
        const pending = pendingRef.current.get(taskId);
        if (pending) {
          pending.reject(new Error(error || 'Unknown error'));
          pendingRef.current.delete(taskId);
          concurrentRef.current = Math.max(0, concurrentRef.current - 1);
          setPendingCount(pendingRef.current.size);
          processQueue();
        }
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setIsReady(false);
    };

    workerRef.current = worker;
    setIsReady(true);

    return () => {
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, [enabled, onPerformance]);

  const processQueue = useCallback(() => {
    if (!workerRef.current) return;

    while (queueRef.current.length > 0 && concurrentRef.current < maxConcurrent) {
      const { task, resolve, reject } = queueRef.current.shift()!;
      concurrentRef.current += 1;
      setPendingCount(pendingRef.current.size);

      const message: WorkerMessage = { type: 'execute', task };
      workerRef.current.postMessage(message);
    }
  }, [maxConcurrent]);

  const execute = useCallback(<T>(task: ComputeTask<T>): Promise<ComputeResult<T>> => {
    if (!enabled || !workerRef.current) {
      return Promise.reject(new Error('Worker not available'));
    }

    const taskId = task.id || generateTaskId();
    const fullTask = { ...task, id: taskId };

    return new Promise((resolve, reject) => {
      pendingRef.current.set(taskId, { resolve: resolve as (result: ComputeResult) => void, reject });
      setPendingCount(pendingRef.current.size);

      if (concurrentRef.current >= maxConcurrent) {
        queueRef.current.push({ task: fullTask, resolve: resolve as (result: ComputeResult) => void, reject });
        return;
      }

      concurrentRef.current += 1;
      setPendingCount(pendingRef.current.size);

      const message: WorkerMessage = { type: 'execute', task: fullTask };
      workerRef.current!.postMessage(message);
    });
  }, [enabled, maxConcurrent]);

  const cancel = useCallback((taskId: string) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({ type: 'cancel', taskId });

    const pending = pendingRef.current.get(taskId);
    if (pending) {
      pending.reject(new Error('Task cancelled'));
      pendingRef.current.delete(taskId);
      concurrentRef.current = Math.max(0, concurrentRef.current - 1);
      setPendingCount(pendingRef.current.size);
      processQueue();
    }

    queueRef.current = queueRef.current.filter(item => item.task.id !== taskId);
  }, [processQueue]);

  const cancelAll = useCallback(() => {
    if (!workerRef.current) return;

    const taskIds = Array.from(pendingRef.current.keys());
    for (const taskId of taskIds) {
      workerRef.current.postMessage({ type: 'cancel', taskId });
    }

    for (const { reject } of pendingRef.current.values()) {
      reject(new Error('All tasks cancelled'));
    }

    pendingRef.current.clear();
    queueRef.current = [];
    concurrentRef.current = 0;
    setPendingCount(0);
  }, []);

  return {
    execute,
    cancel,
    cancelAll,
    isReady,
    pendingCount,
    metrics,
  };
}

export { shouldUseWorker, THRESHOLDS };
