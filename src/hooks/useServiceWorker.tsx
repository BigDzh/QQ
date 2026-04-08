import { useEffect, useState } from 'react';

interface UseServiceWorkerReturn {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  update: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      return;
    }

    if (window.location.protocol === 'file:') {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);
        setIsRegistered(true);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
            }
          });
        });

        if (reg.waiting && navigator.serviceWorker.controller) {
          setIsUpdateAvailable(true);
        }

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        setIsRegistered(false);
      }
    };

    registerSW();
  }, []);

  const update = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage('skipWaiting');
    }
  };

  return {
    isSupported,
    isRegistered,
    isUpdateAvailable,
    registration,
    update,
  };
}

export function ServiceWorkerUpdatePrompt() {
  const { isSupported, isRegistered, isUpdateAvailable, update } = useServiceWorker();

  if (!isSupported || !isRegistered || !isUpdateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-amber-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-amber-700/50 p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-800/50 rounded-lg">
          <svg className="w-5 h-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-100">有新版本可用</h4>
          <p className="mt-1 text-xs text-amber-200/80">
            应用已更新，点击立即刷新以获取最新版本。
          </p>
          <button
            onClick={update}
            className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            立即刷新
          </button>
        </div>
      </div>
    </div>
  );
}