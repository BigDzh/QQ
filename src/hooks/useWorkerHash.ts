import { useCallback, useRef, useState } from 'react';
import { getHashWorker, terminateWorkers } from '../utils/lazyImports';

interface UseWorkerHashReturn {
  computeHash: (content: string) => Promise<string>;
  isComputing: boolean;
  terminate: () => void;
}

const DEFAULT_TIMEOUT = 30000;

export function useWorkerHash(options: { timeout?: number } = {}): UseWorkerHashReturn {
  const { timeout = DEFAULT_TIMEOUT } = options;
  const [isComputing, setIsComputing] = useState(false);
  const pendingRef = useRef<Map<string, { resolve: (value: string) => void; reject: (error: Error) => void; timeoutId: ReturnType<typeof setTimeout> }>>(new Map());

  const cleanupPending = useCallback((messageId: string) => {
    const pending = pendingRef.current.get(messageId);
    if (pending) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pendingRef.current.delete(messageId);
    }
  }, []);

  const computeHash = useCallback((content: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const worker = getHashWorker();

      if (!worker) {
        reject(new Error('Web Workers not available'));
        return;
      }

      const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      let settled = false;

      const cleanup = () => {
        if (settled) return;
        settled = true;
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        cleanupPending(messageId);
      };

      const handleMessage = (e: MessageEvent) => {
        const { type, payload, id } = e.data;
        if (id === messageId) {
          cleanup();
          setIsComputing(pendingRef.current.size > 0);

          if (type === 'result') {
            resolve(payload.hash);
          } else if (type === 'error') {
            reject(new Error(payload.message));
          }
        }
      };

      const handleError = (error: ErrorEvent) => {
        cleanup();
        setIsComputing(pendingRef.current.size > 0);
        reject(new Error(error.message));
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        setIsComputing(pendingRef.current.size > 0);
        reject(new Error(`Hash computation timeout after ${timeout}ms`));
      }, timeout);

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      pendingRef.current.set(messageId, { resolve, reject, timeoutId });
      setIsComputing(true);

      worker.postMessage({
        type: 'computeHash',
        payload: { content },
        id: messageId,
      });
    });
  }, [timeout, cleanupPending]);

  const terminate = useCallback(() => {
    pendingRef.current.forEach(({ reject, timeoutId }) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(new Error('Worker terminated'));
    });
    pendingRef.current.clear();
    setIsComputing(false);
    terminateWorkers();
  }, []);

  return {
    computeHash,
    isComputing,
    terminate,
  };
}
