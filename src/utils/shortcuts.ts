export interface Shortcut {
  key: string;
  description: string;
  action: string;
}

export const SHORTCUTS: Shortcut[] = [
  { key: 'Ctrl + K', description: '打开全局搜索', action: 'globalSearch' },
  { key: 'Ctrl + B', description: '切换侧边栏', action: 'toggleSidebar' },
  { key: 'Ctrl + \\', description: '切换侧边栏', action: 'toggleSidebar' },
  { key: 'Esc', description: '关闭弹窗/取消搜索', action: 'closeModal' },
  { key: 'Ctrl + Z', description: '撤销操作', action: 'undo' },
  { key: 'Ctrl + S', description: '保存当前操作', action: 'save' },
  { key: 'Ctrl + N', description: '新建项目', action: 'newProject' },
  { key: 'Ctrl + E', description: '导出数据', action: 'export' },
  { key: 'Ctrl + F', description: '页面内搜索', action: 'pageSearch' },
  { key: 'Ctrl + H', description: '显示快捷键帮助', action: 'showHelp' },
  { key: 'Ctrl + Shift + Delete', description: '清除设计文件', action: 'clearDesignFiles' },
];

export function formatShortcut(key: string): string {
  return key
    .replace('Ctrl', 'Ctrl')
    .replace('Alt', 'Alt')
    .replace('Shift', 'Shift')
    .replace('+', ' + ');
}

export function matchesShortcut(event: KeyboardEvent, action: string): boolean {
  const shortcut = SHORTCUTS.find((s) => s.action === action);
  if (!shortcut) return false;

  const keys = shortcut.key.toLowerCase().split('+');
  const ctrl = keys.includes('ctrl');
  const alt = keys.includes('alt');
  const shift = keys.includes('shift');
  const key = keys.find((k) => !['ctrl', 'alt', 'shift'].includes(k));

  return (
    event.ctrlKey === ctrl &&
    event.altKey === alt &&
    event.shiftKey === shift &&
    event.key.toLowerCase() === key
  );
}
