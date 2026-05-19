import { useEffect, useState, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstalled: boolean;
  isOnline: boolean;
  canInstall: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isOnline: navigator.onLine,
    canInstall: false,
    isUpdateAvailable: false,
    registration: null,
  });

  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Listen for online/offline events
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      installPromptRef.current = e as BeforeInstallPromptEvent;
      setState(prev => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  async function registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      setState(prev => ({
        ...prev,
        registration,
        isInstalled: true,
      }));

      console.log('[PWA] Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        }
      });
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }

  const install = useCallback(async (): Promise<boolean> => {
    if (!installPromptRef.current) return false;

    try {
      await installPromptRef.current.prompt();
      const { outcome } = await installPromptRef.current.userChoice;

      if (outcome === 'accepted') {
        setState(prev => ({ ...prev, canInstall: false }));
        return true;
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error);
    }

    return false;
  }, []);

  const update = useCallback(async (): Promise<void> => {
    if (!state.registration) return;

    try {
      await state.registration.update();
      setState(prev => ({ ...prev, isUpdateAvailable: false }));
    } catch (error) {
      console.error('[PWA] Update failed:', error);
    }
  }, [state.registration]);

  const clearCache = useCallback(async (): Promise<void> => {
    if (!state.registration?.active) return;

    state.registration.active.postMessage({ type: 'CLEAR_CACHE' });
  }, [state.registration]);

  const getCacheSize = useCallback(async (): Promise<number> => {
    if (!state.registration?.active) return 0;

    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        if (e.data.type === 'CACHE_SIZE') {
          resolve(e.data.size);
          state.registration?.active?.removeEventListener('message', handler as EventListener);
        }
      };

      const timeoutId = setTimeout(() => {
        state.registration?.active?.removeEventListener('message', handler as EventListener);
        resolve(0);
      }, 5000);

      const wrappedHandler = (e: MessageEvent) => {
        clearTimeout(timeoutId);
        handler(e);
      };

      state.registration?.active?.addEventListener('message', wrappedHandler as EventListener);
      state.registration?.active?.postMessage({ type: 'GET_CACHE_SIZE' });
   });
  }, [state.registration]);

  return {
    ...state,
    install,
    update,
    clearCache,
    getCacheSize,
  };
}
