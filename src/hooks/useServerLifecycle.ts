import { useEffect, useRef, useCallback } from 'react';

interface ServerProcess {
  id: string;
  name: string;
  pid?: number;
  port?: number;
}

interface ServerLifecycleOptions {
  serverUrl?: string;
  processes?: ServerProcess[];
  onServerTerminating?: () => void;
  onServerTerminated?: () => void;
  onError?: (error: Error) => void;
  terminationDelay?: number;
  enabled?: boolean;
}

const DEFAULT_TERMINATION_DELAY = 1000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function terminateServerViaApi(
  serverUrl: string,
  retries: number = MAX_RETRY_ATTEMPTS
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${serverUrl}/__terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'browser_closed' }),
        keepalive: true,
      });

      if (response.ok) {
        console.log(`[ServerLifecycle] Server terminated via API on attempt ${attempt}`);
        return true;
      }
    } catch (error) {
      console.warn(`[ServerLifecycle] Termination attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        await sleep(RETRY_DELAY);
      }
    }
  }
  return false;
}

function terminateViaNavigatorBeacon(serverUrl: string): void {
  try {
    const data = JSON.stringify({ reason: 'browser_closed', timestamp: Date.now() });
    navigator.sendBeacon(`${serverUrl}/__terminate`, data);
  } catch (error) {
    console.warn('[ServerLifecycle] Beacon termination failed:', error);
  }
}

function killLocalProcess(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec(`taskkill /PID ${pid} /F`, (error: Error | null) => {
          if (error) {
            console.error(`[ServerLifecycle] Failed to kill process ${pid}:`, error);
            resolve(false);
          } else {
            console.log(`[ServerLifecycle] Process ${pid} terminated successfully`);
            resolve(true);
          }
        });
      } else {
        const { exec } = require('child_process');
        exec(`kill -9 ${pid}`, (error: Error | null) => {
          if (error) {
            console.error(`[ServerLifecycle] Failed to kill process ${pid}:`, error);
            resolve(false);
          } else {
            console.log(`[ServerLifecycle] Process ${pid} terminated successfully`);
            resolve(true);
          }
        });
      }
    } catch (error) {
      console.error('[ServerLifecycle] Process termination error:', error);
      resolve(false);
    }
  });
}

async function terminateElectronProcess(pid: number): Promise<boolean> {
  try {
    const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
    if (ipcRenderer) {
      const result = await ipcRenderer.invoke('terminate-server-process', pid);
      return result === true;
    }
  } catch (error) {
    console.error('[ServerLifecycle] Electron IPC termination failed:', error);
  }
  return killLocalProcess(pid);
}

export function useServerLifecycle(options: ServerLifecycleOptions = {}) {
  const {
    serverUrl = 'http://localhost:5173',
    processes = [],
    onServerTerminating,
    onServerTerminated,
    onError,
    terminationDelay = DEFAULT_TERMINATION_DELAY,
    enabled = true,
  } = options;

  const isTerminatingRef = useRef(false);
  const terminationAttemptedRef = useRef(false);

  const terminatingRef = useRef(onServerTerminating);
  const terminatedRef = useRef(onServerTerminated);
  const errorRef = useRef(onError);

  terminatingRef.current = onServerTerminating;
  terminatedRef.current = onServerTerminated;
  errorRef.current = onError;

  const terminateServers = useCallback(async () => {
    if (isTerminatingRef.current || terminationAttemptedRef.current) {
      return;
    }

    isTerminatingRef.current = true;
    terminationAttemptedRef.current = true;

    console.log('[ServerLifecycle] Initiating server termination...');
    terminatingRef.current?.();

    const errors: Error[] = [];

    for (const process of processes) {
      if (process.pid) {
        try {
          console.log(`[ServerLifecycle] Terminating process: ${process.name} (PID: ${process.pid})`);
          const success = await terminateElectronProcess(process.pid);
          if (!success) {
            errors.push(new Error(`Failed to terminate process ${process.pid}`));
          }
        } catch (error) {
          errors.push(error as Error);
        }
      }
    }

    try {
      const apiSuccess = await terminateServerViaApi(serverUrl);
      if (!apiSuccess) {
        terminateViaNavigatorBeacon(serverUrl);
      }
    } catch (error) {
      errors.push(error as Error);
      terminateViaNavigatorBeacon(serverUrl);
    }

    await sleep(terminationDelay);

    isTerminatingRef.current = false;

    if (errors.length > 0) {
      const combinedError = new Error(
        `Server termination completed with ${errors.length} error(s): ${errors.map((e) => e.message).join(', ')}`
      );
      console.error('[ServerLifecycle] Termination errors:', combinedError);
      errorRef.current?.(combinedError);
    } else {
      console.log('[ServerLifecycle] Server termination completed successfully');
      terminatedRef.current?.();
    }
  }, [serverUrl, processes, terminationDelay]);

  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!enabled) return;

      console.log('[ServerLifecycle] BeforeUnload event triggered');

      terminateServers();

      event.preventDefault();
      event.returnValue = '';
    },
    [enabled, terminateServers]
  );

  const handleUnload = useCallback(() => {
    if (!enabled) return;

    console.log('[ServerLifecycle] Unload event triggered');

    if (!isTerminatingRef.current) {
      terminateServers();
    }
  }, [enabled, terminateServers]);

  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;

    if (document.visibilityState === 'hidden') {
      console.log('[ServerLifecycle] Page hidden - preparing for potential close');

      setTimeout(() => {
        if (document.visibilityState === 'hidden' && !isTerminatingRef.current) {
          terminateServers();
        }
      }, 100);
    }
  }, [enabled, terminateServers]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, handleBeforeUnload, handleUnload, handleVisibilityChange]);

  const manuallyTerminate = useCallback(async () => {
    console.log('[ServerLifecycle] Manual termination requested');
    await terminateServers();
  }, [terminateServers]);

  return {
    terminateServers: manuallyTerminate,
    isTerminating: isTerminatingRef.current,
  };
}

export function registerTerminationEndpoint(app: any, serverProcess: { kill: () => void }) {
  if (app && typeof app.post === 'function') {
    app.post('/__terminate', (_req: any, res: any) => {
      console.log('[ServerLifecycle] Received termination request via API');
      try {
        if (serverProcess && typeof serverProcess.kill === 'function') {
          serverProcess.kill();
          res.status(200).json({ success: true, message: 'Server terminated' });
        } else {
          res.status(200).json({ success: true, message: 'Termination acknowledged' });
        }
      } catch (error) {
        console.error('[ServerLifecycle] Termination error:', error);
        res.status(500).json({ success: false, error: 'Termination failed' });
      }
    });
  }
}

declare global {
  interface Window {
    require?: (module: string) => any;
  }
}

export default useServerLifecycle;