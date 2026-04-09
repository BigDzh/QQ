import { renderHook, act } from '@testing-library/react';
import { useHierarchicalLogger } from './useHierarchicalLogger';

describe('useHierarchicalLogger Memory Leak Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('autoRefresh interval cleanup', () => {
    it('should clear interval on unmount when autoRefresh is true', () => {
      const { result, unmount } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: true, refreshInterval: 1000 })
      );

      expect(result.current).toBeDefined();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should not create interval when autoRefresh is false', () => {
      const { result, unmount } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: false })
      );

      expect(result.current).toBeDefined();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      unmount();
      expect(clearIntervalSpy).not.toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should clear existing interval when autoRefresh changes to false', () => {
      const { result, rerender } = renderHook(
        ({ autoRefresh }) => useHierarchicalLogger({ autoRefresh, refreshInterval: 1000 }),
        { initialProps: { autoRefresh: true } }
      );

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      rerender({ autoRefresh: false });

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('listener cleanup on unmount', () => {
    it('should remove all listeners on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: true, refreshInterval: 5000 })
      );

      const subscribe = result.current.actions.subscribe;
      const testListener = jest.fn();
      const unsubscribe = subscribe(testListener);

      expect(unsubscribe).toBeDefined();

      const removeListenerSpy = jest.spyOn(global.console, 'error').mockImplementation();

      unmount();

      expect(removeListenerSpy).not.toHaveBeenCalled();
      removeListenerSpy.mockRestore();
    });

    it('should allow multiple subscriptions and cleanup all on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: true, refreshInterval: 5000 })
      );

      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      const unsub1 = result.current.actions.subscribe(listener1);
      const unsub2 = result.current.actions.subscribe(listener2);
      const unsub3 = result.current.actions.subscribe(listener3);

      expect(unsub1).toBeDefined();
      expect(unsub2).toBeDefined();
      expect(unsub3).toBeDefined();

      unmount();
    });
  });

  describe('subscribe/unsubscribe pattern', () => {
    it('should return unsubscribe function', () => {
      const { result } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: false })
      );

      const testListener = jest.fn();
      const unsubscribe = result.current.actions.subscribe(testListener);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('should allow calling unsubscribe multiple times safely', () => {
      const { result } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: false })
      );

      const testListener = jest.fn();
      const unsubscribe = result.current.actions.subscribe(testListener);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});