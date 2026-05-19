import React, { useState, useEffect, useCallback, type ComponentType } from 'react';
import { logger } from './logger';

interface LazyComponentProps {
  loader: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

interface LazyComponentState {
  Component: ComponentType<any> | null;
  error: Error | null;
  retryCount: number;
  isLoading: boolean;
}

export function RetryableLazy({
  loader,
  fallback,
  maxRetries = 3,
  retryDelay = 1000,
  onError,
  ...props
}: LazyComponentProps & Record<string, any>) {
  const [state, setState] = useState<LazyComponentState>({
    Component: null,
    error: null,
    retryCount: 0,
    isLoading: true,
  });

  const loadComponent = useCallback(async (retryCount = 0) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const module = await loader();
      setState({
        Component: module.default,
        error: null,
        retryCount: 0,
        isLoading: false,
      });
      logger.log('[RetryableLazy] Component loaded successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`[RetryableLazy] Failed to load component (attempt ${retryCount + 1}/${maxRetries}):`, err.message);

      if (onError) {
        onError(err);
      }

      if (retryCount < maxRetries - 1) {
        logger.log(`[RetryableLazy] Retrying in ${retryDelay}ms...`);
        setTimeout(() => loadComponent(retryCount + 1), retryDelay);
      } else {
        setState((prev) => ({
          ...prev,
          error: err,
          retryCount: retryCount + 1,
          isLoading: false,
        }));
      }
    }
  }, [loader, maxRetries, retryDelay, onError]);

  useEffect(() => {
    loadComponent();
  }, [loadComponent]);

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-100 min-h-[400px]">
        <svg
          className="w-16 h-16 text-red-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 mb-2">组件加载失败</h3>
        <p className="text-sm text-red-600 mb-4 text-center max-w-md">
          {state.error.message || '无法加载组件，请检查网络连接后重试'}
        </p>
        <button
          onClick={() => loadComponent(0)}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          重新加载
        </button>
        <p className="text-xs text-gray-500 mt-4">
          已重试 {state.retryCount} 次
        </p>
      </div>
    );
  }

  if (state.Component) {
    return <state.Component {...props} />;
  }

  return <>{fallback || <DefaultFallback />}</>;
}

function DefaultFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
      <p className="text-sm text-gray-600">正在加载组件...</p>
    </div>
  );
}
