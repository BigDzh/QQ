import React, { useState, useEffect, useRef } from 'react';
import { X, Undo2, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { useUndo, type UndoState } from '../../hooks/useUndo';

interface UndoToastProps {
  onUndo?: (id: string) => void;
  maxVisible?: number;
}

export function UndoToast({ onUndo, maxVisible = 3 }: UndoToastProps) {
  const { theme, isDark, isCyberpunk } = useTheme();
  const t = useThemeStyles();
  const { history, canUndo: hasUndo, undo } = useUndo();
  const [visibleItems, setVisibleItems] = useState<UndoState[]>([]);

  useEffect(() => {
    setVisibleItems(history.slice(0, maxVisible));
  }, [history, maxVisible]);

  const handleUndo = async (id: string) => {
    await undo(id);
    onUndo?.(id);
  };

  if (!hasUndo || visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[var(--z-toast)] flex flex-col gap-2 items-center">
      {visibleItems.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md animate-slide-up ${
            isCyberpunk
              ? 'bg-cyan-500/10 border-cyan-400/30'
              : isDark
              ? 'bg-gray-800/90 border-gray-600'
              : 'bg-white/95 border-gray-200'
          }`}
        >
          <Clock
            size={16}
            className={isCyberpunk ? 'text-cyan-400' : isDark ? 'text-gray-400' : 'text-gray-500'}
          />
          <span className={`text-sm ${t.text}`}>
            {item.description}
          </span>
          <div className="flex items-center gap-2 ml-2">
            <span
              className={`text-xs ${
                isCyberpunk ? 'text-cyan-400' : isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {Math.ceil(item.remainingTime / 1000)}s
            </span>
            <button
              onClick={() => handleUndo(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isCyberpunk
                  ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Undo2 size={14} />
              撤销
            </button>
            <button
              onClick={() => handleUndo(item.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                isCyberpunk
                  ? 'hover:bg-white/10 text-cyan-400'
                  : isDark
                  ? 'hover:bg-white/10 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
              aria-label="关闭"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default UndoToast;