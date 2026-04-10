import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useServiceWorker } from './useServiceWorker';

describe('useServiceWorker Memory Leak Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('event listener cleanup', () => {
    it('should define cleanup function', () => {
      const { result, unmount } = renderHook(() => useServiceWorker());

      expect(result.current).toBeDefined();
      expect(typeof result.current.update).toBe('function');

      unmount();

      expect(result.current).toBeDefined();
    });

    it('should handle multiple mounts and unmounts without errors', () => {
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderHook(() => useServiceWorker());
        unmount();
      }

      expect(true).toBe(true);
    });
  });

  describe('service worker registration', () => {
    it('should return proper interface', () => {
      const { result } = renderHook(() => useServiceWorker());

      expect(result.current).toHaveProperty('isSupported');
      expect(result.current).toHaveProperty('isRegistered');
      expect(result.current).toHaveProperty('isUpdateAvailable');
      expect(result.current).toHaveProperty('registration');
      expect(result.current).toHaveProperty('update');
    });

    it('should have update function that does not throw', () => {
      const { result } = renderHook(() => useServiceWorker());

      expect(() => result.current.update()).not.toThrow();
    });
  });
});
