import { useEffect, useCallback, useRef } from 'react';
import { SHORTCUTS, matchesShortcut, type Shortcut } from '../utils/shortcuts';

interface ShortcutHandler {
  action: string;
  handler: () => void;
}

interface UseShortcutsOptions {
  handlers: ShortcutHandler[];
  enabled?: boolean;
  ignoreInputFields?: boolean;
}

export function useShortcuts({
  handlers,
  enabled = true,
  ignoreInputFields = true,
}: UseShortcutsOptions) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      if (ignoreInputFields) {
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable;

        if (isInputField) return;
      }

      for (const { action, handler } of handlersRef.current) {
        if (matchesShortcut(event, action)) {
          event.preventDefault();
          handler();
          return;
        }
      }
    },
    [enabled, ignoreInputFields]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

export function useShortcutHelp() {
  const shortcuts = SHORTCUTS;

  const getShortcutsByCategory = useCallback(() => {
    const categories: Record<string, Shortcut[]> = {
      全局: [],
      编辑: [],
      导航: [],
    };

    shortcuts.forEach((shortcut) => {
      switch (shortcut.action) {
        case 'globalSearch':
        case 'showHelp':
        case 'toggleSidebar':
          categories['全局'].push(shortcut);
          break;
        case 'undo':
        case 'save':
        case 'export':
          categories['编辑'].push(shortcut);
          break;
        case 'newProject':
        case 'pageSearch':
        case 'closeModal':
          categories['导航'].push(shortcut);
          break;
        default:
          categories['全局'].push(shortcut);
      }
    });

    return categories;
  }, [shortcuts]);

  return {
    shortcuts,
    getShortcutsByCategory,
    formatShortcut: (key: string) => key.replace('+', ' + '),
  };
}

export default useShortcuts;