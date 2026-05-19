import { useEffect, useRef, type RefObject } from 'react';

type EventTargetWithAddEventListener = Window | Document | HTMLElement | EventTarget;
type EventHandler<E extends Event = Event> = (event: E) => void;

export function useEventListener<K extends keyof WindowEventMap>(
  target: Window | null,
  event: K,
  handler: EventHandler<WindowEventMap[K]>,
  options?: boolean | AddEventListenerOptions
): void;
// eslint-disable-next-line no-redeclare
export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document | null,
  event: K,
  handler: EventHandler<DocumentEventMap[K]>,
  options?: boolean | AddEventListenerOptions
): void;
// eslint-disable-next-line no-redeclare
export function useEventListener<
  T extends HTMLElement,
  K extends keyof HTMLElementEventMap
>(
  target: T | null,
  event: K,
  handler: EventHandler<HTMLElementEventMap[K]>,
  options?: boolean | AddEventListenerOptions
): void;
// eslint-disable-next-line no-redeclare
export function useEventListener(
  target: EventTargetWithAddEventListener | null,
  event: string,
  handler: EventHandler,
  options?: boolean | AddEventListenerOptions
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const currentTarget = target;

    if (!currentTarget) return;

    const eventHandler: EventHandler = (e) => {
      handlerRef.current(e);
    };

    currentTarget.addEventListener(event, eventHandler, options);

    return () => {
      currentTarget.removeEventListener(event, eventHandler, options);
    };
  }, [target, event, options]);
}

export function useRefEventListener<T extends HTMLElement, E extends Event = Event>(
  ref: RefObject<T | null>,
  event: string,
  handler: EventHandler<E>,
  options?: boolean | AddEventListenerOptions
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const eventHandler: EventHandler = (e) => {
      handlerRef.current(e as E);
    };

    element.addEventListener(event, eventHandler, options);

    return () => {
      element.removeEventListener(event, eventHandler, options);
    };
  }, [ref, event, options]);
}

export class EventEmitter<TEvents extends Record<string, unknown[]>> {
  private listeners: Map<keyof TEvents, Set<Function>> = new Map();

  on<EventName extends keyof TEvents>(
    eventName: EventName,
    listener: (...args: TEvents[EventName]) => void
  ): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    const listeners = this.listeners.get(eventName)!;
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
      
      if (listeners.size === 0) {
        this.listeners.delete(eventName);
      }
    };
  }

  once<EventName extends keyof TEvents>(
    eventName: EventName,
    listener: (...args: TEvents[EventName]) => void
  ): () => void {
    const onceWrapper: ((...args: TEvents[EventName]) => void) & { _isOnceWrapper?: true } = ((...args: TEvents[EventName]) => {
      listener(...args);
      this.off(eventName, onceWrapper);
    });

    return this.on(eventName, onceWrapper);
  }

  off<EventName extends keyof TEvents>(
    eventName: EventName,
    listener?: (...args: TEvents[EventName]) => void
  ): void {
    if (!listener) {
      this.listeners.delete(eventName);
      return;
    }

    const listeners = this.listeners.get(eventName);
    if (listeners) {
      listeners.delete(listener);
      
      if (listeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  emit<EventName extends keyof TEvents>(
    eventName: EventName,
    ...args: TEvents[EventName]
  ): void {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[EventEmitter] Error in listener for "${String(eventName)}":`, error);
        }
      });
    }
  }

  removeAllListeners(eventNames?: (keyof TEvents)[]): void {
    if (eventNames) {
      for (const name of eventNames) {
        this.listeners.delete(name);
      }
    } else {
      this.listeners.clear();
    }
  }

  getListenerCount(eventName?: keyof TEvents): number {
    if (eventName) {
      return this.listeners.get(eventName)?.size || 0;
    }
    
    let count = 0;
    for (const listeners of this.listeners.values()) {
      count += listeners.size;
    }
    return count;
  }

  hasListeners(eventName?: keyof TEvents): boolean {
    if (eventName) {
      return (this.listeners.get(eventName)?.size || 0) > 0;
    }
    
    return this.listeners.size > 0;
  }

  destroy(): void {
    this.removeAllListeners();
  }
}

export function createSafeEventEmitter<TEvents extends Record<string, unknown[]>>(): EventEmitter<TEvents> & {
  isDestroyed: boolean;
  destroy: () => void;
} {
  const emitter = new EventEmitter<TEvents>() as EventEmitter<TEvents> & { isDestroyed: boolean; destroy: () => void };
  emitter.isDestroyed = false;

  const originalDestroy = emitter.destroy.bind(emitter);
  emitter.destroy = () => {
    emitter.isDestroyed = true;
    originalDestroy();
  };

  const originalEmit = emitter.emit.bind(emitter);
  emitter.emit = (...args: unknown[]) => {
    if (emitter.isDestroyed) {
      console.warn('[SafeEventEmitter] Emit called after destroy');
      return;
    }
    return originalEmit(...args as Parameters<typeof emitter.emit>);
  };

  const originalOn = emitter.on.bind(emitter);
  emitter.on = (...args: unknown[]) => {
    if (emitter.isDestroyed) {
      console.warn('[SafeEventEmitter] on() called after destroy');
      return () => {};
    }
    return originalOn(...args as Parameters<typeof emitter.on>);
  };

  return emitter;
}
