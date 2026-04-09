import { renderHook, act } from '@testing-library/react';
import { useServiceWorker } from './useServiceWorker';

describe('useServiceWorker Memory Leak Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('event listener cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useServiceWorker());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should handle multiple mounts and unmounts without memory leaks', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      for (let i = 0; i < 5; i++) {
        const { unmount } = renderHook(() => useServiceWorker());
        unmount();
      }

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(5);
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('service worker registration cleanup', () => {
    it('should cleanup service worker registration on unmount', () => {
      const mockRemoveEventListener = jest.fn();
      global.navigator.serviceWorker = {
        register: jest.fn().mockResolvedValue({
          removeEventListener: mockRemoveEventListener,
          installing: null,
        }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      } as any;

      const { unmount } = renderHook(() => useServiceWorker());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalled();
    });
  });
});