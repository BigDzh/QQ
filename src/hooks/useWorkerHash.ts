import { useCallback, useRef, useState } from 'react';
import { getHashWorker, terminateWorkers } from '../utils/lazyImports';

interface UseWorkerHashReturn {
  computeHash: (content: string) => Promise<string>;
  isComputing: boolean;
  terminate: () => void;
}

export function useWorkerHash(): UseWorkerHashReturn {
  const [isComputing, setIsComputing] = useState(false);
  const pendingRef = useRef<Map<string, { resolve: (value: string) => void; reject: (error: Error) => void }>>(new Map());

  const computeHash = useCallback((content: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const worker = getHashWorker();

      if (!worker) {
        reject(new Error('Web Workers not available'));
        return;
      }

      const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const handleMessage = (e: MessageEvent) => {
        const { type, payload, id } = e.data;
        if (id === messageId) {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          pendingRef.current.delete(messageId);
          setIsComputing(false);

          if (type === 'result') {
            resolve(payload.hash);
          } else if (type === 'error') {
            reject(new Error(payload.message));
          }
        }
      };

      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        pendingRef.current.delete(messageId);
        setIsComputing(false);
        reject(new Error(error.message));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      pendingRef.current.set(messageId, { resolve, reject });
      setIsComputing(true);

      worker.postMessage({
        type: 'computeHash',
        payload: { content },
        id: messageId,
      });
    });
  }, []);

  const terminate = useCallback(() => {
    terminateWorkers();
    pendingRef.current.forEach(({ reject }) => {
      reject(new Error('Worker terminated'));
    });
    pendingRef.current.clear();
    setIsComputing(false);
  }, []);

  return {
    computeHash,
    isComputing,
    terminate,
  };
}