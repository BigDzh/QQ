import { useRef, useEffect, useCallback, useState } from 'react';

interface WorkerOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  autoTerminate?: boolean;
}

interface UseWorkerReturn<T> {
  execute: (type: string, payload?: any) => Promise<T>;
  isLoading: boolean;
  error: Error | null;
  lastResult: T | null;
  terminate: () => void;
  isReady: boolean;
}

export function useWorker<T = any>(
  workerUrl: string | URL,
  options: WorkerOptions = {}
): UseWorkerReturn<T> {
  const {
    onMessage,
    onError,
    onProgress,
    autoTerminate = false,
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<T | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize worker
  useEffect(() => {
    try {
      const worker = new Worker(workerUrl);

      worker.onmessage = (e: MessageEvent) => {
        const { type, data, error: workerError, progress } = e.data;

        switch (type) {
          case 'success':
            setLastResult(data as T);
            setIsLoading(false);
            setError(null);
            onMessage?.(data);
            
            if (autoTerminate) {
              terminate();
            }
            break;

          case 'error': {
            const err = new Error(workerError || 'Unknown worker error');
            setError(err);
            setIsLoading(false);
            onError?.(err);
            break;
          }

          case 'progress':
            if (typeof progress === 'number') {
              onProgress?.(progress);
            }
            break;
        }
      };

      worker.onerror = (e: ErrorEvent) => {
        const err = new Error(e.message || 'Worker error');
        setError(err);
        setIsLoading(false);
        onError?.(err);
      };

      workerRef.current = worker;
      setIsReady(true);

    } catch (err) {
      console.error('Failed to create worker:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }

    return () => {
      terminate();
    };
  }, [workerUrl]);

  const execute = useCallback(async (type: string, payload?: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      setIsLoading(true);
      setError(null);

      // Set up one-time listener for this specific task
      const handleMessage = (e: MessageEvent) => {
        const { id: responseId, type, data, error: workerError } = e.data;

        if (responseId !== id) return;

        workerRef.current?.removeEventListener('message', handleMessage as EventListener);

        if (type === 'success') {
          resolve(data as T);
        } else if (type === 'error') {
          reject(new Error(workerError || 'Worker error'));
        }
      };

      workerRef.current.addEventListener('message', handleMessage as EventListener);

      // Send task to worker
      workerRef.current.postMessage({ id, type, payload });
    });
  }, []);

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsReady(false);
    }
  }, []);

  return {
    execute,
    isLoading,
    error,
    lastResult,
    terminate,
    isReady,
  };
}

// Pre-configured hooks for common use cases
export function useDataProcessor() {
  return useWorker<any>(
    new URL('./workers/dataProcessor.worker.ts', import.meta.url),
    {
      onProgress: (progress) => {
        console.log(`[DataProcessor] Progress: ${progress.toFixed(1)}%`);
      },
    }
  );
}

// Hook for background search
export function useBackgroundSearch() {
  const { execute, isLoading, error } = useDataProcessor();

  const search = useCallback(async (
    query: string,
    items: any[],
    fields: string[] = []
  ) => {
    if (!query.trim()) return items;

    try {
      const results = await execute('search', { query, items, fields });
      return results || [];
    } catch (err) {
      console.error('[BackgroundSearch] Error:', err);
      return [];
    }
  }, [execute]);

  return { search, isLoading, error };
}

// Hook for file parsing
export function useFileParser() {
  const { execute, isLoading, error } = useDataProcessor();

  const parseFile = useCallback(async (
    content: string,
    type: 'csv' | 'json' = 'csv'
  ) => {
    try {
      const result = await execute('parseFile', { content, type });
      return result || [];
    } catch (err) {
      console.error('[FileParser] Error:', err);
      throw err;
    }
  }, [execute]);

  return { parseFile, isLoading, error };
}

// Hook for data export
export function useDataExport() {
  const { execute, isLoading, error } = useDataProcessor();

  const exportData = useCallback(async (
    items: any[],
    type: 'csv' | 'json' = 'csv'
  ) => {
    try {
      const result = await execute('generateExport', { type, items });
      return result;
    } catch (err) {
      console.error('[DataExport] Error:', err);
      throw err;
    }
  }, [execute]);

  return { exportData, isLoading, error };
}
