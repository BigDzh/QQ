import { useMemo } from 'react';
import { X, Keyboard, Search, ToggleLeft, Save, Download, Plus, Hash, HelpCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../hooks/useThemeStyles';
import { useShortcutHelp } from '../../hooks/useShortcuts';

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutHelp({ isOpen, onClose }: ShortcutHelpProps) {
  const { isDark, isCyberpunk } = useTheme();
  const t = useThemeStyles();
  const { shortcuts: _shortcuts, getShortcutsByCategory, formatShortcut } = useShortcutHelp();

  const shortcutsByCategory = useMemo(() => getShortcutsByCategory(), [getShortcutsByCategory]);

  if (!isOpen) return null;

  const getIconForAction = (action: string) => {
    switch (action) {
      case 'globalSearch':
        return <Search size={14} className="text-cyan-400" />;
      case 'toggleSidebar':
        return <ToggleLeft size={14} className="text-purple-400" />;
      case 'undo':
        return <Hash size={14} className="text-amber-400" />;
      case 'save':
        return <Save size={14} className="text-green-400" />;
      case 'export':
        return <Download size={14} className="text-blue-400" />;
      case 'newProject':
        return <Plus size={14} className="text-pink-400" />;
      case 'pageSearch':
        return <Search size={14} className="text-cyan-400" />;
      case 'showHelp':
        return <HelpCircle size={14} className="text-fuchsia-400" />;
      default:
        return <Keyboard size={14} className="text-gray-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[var(--z-top-layer)]"
      onClick={onClose}
    >
      <div
        className={`${t.card} border ${t.border} rounded-2xl p-6 w-[480px] max-h-[80vh] overflow-hidden flex flex-col shadow-xl backdrop-blur-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 ${
                isCyberpunk ? 'bg-cyan-500/10' : 'bg-gray-100 dark:bg-gray-800'
              } rounded-xl`}
            >
              <Keyboard
                className={isCyberpunk ? 'text-cyan-400' : isDark ? 'text-gray-300' : 'text-gray-600'}
                size={20}
              />
            </div>
            <h2 className={`text-lg font-semibold ${t.text}`}>快捷键帮助</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${
              isCyberpunk ? 'text-cyan-400' : 'text-gray-400'
            }`}
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3
                className={`text-sm font-medium mb-3 ${
                  isCyberpunk ? 'text-cyan-400' : t.textSecondary
                }`}
              >
                {category}
              </h3>
              <div className="space-y-1">
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.action}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                      isCyberpunk
                        ? 'hover:bg-white/5'
                        : isDark
                        ? 'hover:bg-white/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getIconForAction(shortcut.action)}
                      <span className={`text-sm ${t.text}`}>{shortcut.description}</span>
                    </div>
                    <kbd
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono ${
                        isCyberpunk
                          ? 'bg-white/5 text-cyan-400 border border-white/10'
                          : isDark
                          ? 'bg-gray-700 text-gray-300 border border-gray-600'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {formatShortcut(shortcut.key)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-5 pt-4 border-t ${t.border}`}>
          <p className={`text-xs text-center ${t.textSecondary}`}>
            按 <kbd
              className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                isCyberpunk
                  ? 'bg-white/10 text-cyan-400'
                  : isDark
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Esc
            </kbd>{' '}
            或点击外部区域关闭
          </p>
        </div>
      </div>
    </div>
  );
}

export default ShortcutHelp;