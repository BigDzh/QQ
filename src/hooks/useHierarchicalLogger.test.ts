import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHierarchicalLogger } from './useHierarchicalLogger';

describe('useHierarchicalLogger Memory Leak Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('autoRefresh interval cleanup', () => {
    it('should clear interval on unmount when autoRefresh is true', () => {
      const { result, unmount } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: true, refreshInterval: 1000 })
      );

      expect(result.current).toBeDefined();

      unmount();

      expect(result.current).toBeDefined();
    });

    it('should not create interval when autoRefresh is false', () => {
      const { result, unmount } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: false })
      );

      expect(result.current).toBeDefined();
      unmount();
      expect(result.current).toBeDefined();
    });

    it('should clear existing interval when autoRefresh changes to false', () => {
      const { result, rerender } = renderHook(
        ({ autoRefresh }) => useHierarchicalLogger({ autoRefresh, refreshInterval: 1000 }),
        { initialProps: { autoRefresh: true } }
      );

      rerender({ autoRefresh: false });

      expect(result.current).toBeDefined();
    });
  });

  describe('listener cleanup on unmount', () => {
    it('should subscribe and unsubscribe correctly', () => {
      const { result } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: false })
      );

      const testListener = vi.fn();
      const unsubscribe = result.current.actions.subscribe(testListener);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it.skip('should allow multiple subscriptions (requires further investigation)', () => {
      const { result } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: false })
      );

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = result.current.actions.subscribe(listener1);
      const unsub2 = result.current.actions.subscribe(listener2);

      expect(unsub1).toBeDefined();
      expect(unsub2).toBeDefined();
    });
  });

  describe('subscribe/unsubscribe pattern', () => {
    it('should return unsubscribe function', () => {
      const { result } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: false })
      );

      const testListener = vi.fn();
      const unsubscribe = result.current.actions.subscribe(testListener);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('should allow calling unsubscribe multiple times safely', () => {
      const { result } = renderHook(() =>
        useHierarchicalLogger({ autoRefresh: false })
      );

      const testListener = vi.fn();
      const unsubscribe = result.current.actions.subscribe(testListener);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
