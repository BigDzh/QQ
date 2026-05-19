import { useCallback, useRef, KeyboardEvent } from 'react';

export function useKeyboardNavigation(
  onSelect?: (index: number) => void,
  onEscape?: () => void,
  itemCount?: number
) {
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, length?: number) => {
      const count = length ?? itemCount ?? 0;
      if (count === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          currentIndexRef.current = (currentIndexRef.current + 1) % count;
          onSelect?.(currentIndexRef.current);
          break;
        case 'ArrowUp':
          e.preventDefault();
          currentIndexRef.current = (currentIndexRef.current - 1 + count) % count;
          onSelect?.(currentIndexRef.current);
          break;
        case 'Home':
          e.preventDefault();
          currentIndexRef.current = 0;
          onSelect?.(0);
          break;
        case 'End':
          e.preventDefault();
          currentIndexRef.current = count - 1;
          onSelect?.(count - 1);
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
      }
    },
    [onSelect, onEscape, itemCount]
  );

  const resetIndex = useCallback(() => {
    currentIndexRef.current = 0;
  }, []);

  return { handleKeyDown, resetIndex, currentIndex: currentIndexRef.current };
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const a11yLabels = {
  close: '关闭',
  open: '打开',
  expand: '展开',
  collapse: '折叠',
  previous: '上一个',
  next: '下一个',
  select: '选择',
  delete: '删除',
  edit: '编辑',
  save: '保存',
  cancel: '取消',
  confirm: '确认',
  search: '搜索',
  loading: '加载中',
  error: '错误',
  success: '成功',
  warning: '警告',
  info: '信息',
  required: '必填',
  optional: '可选',
  menu: '菜单',
  navigation: '导航',
  dialog: '对话框',
  modal: '模态框',
  tooltip: '提示',
  notification: '通知',
};
