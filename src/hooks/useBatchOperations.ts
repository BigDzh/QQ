import { useState, useCallback, useMemo } from 'react';

export interface BatchOperation<T> {
  id: string;
  item: T;
  selected: boolean;
}

interface UseBatchOperationsOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  onBatchDelete?: (selectedItems: T[]) => void;
  onBatchExport?: (selectedItems: T[]) => void;
}

export function useBatchOperations<T>({
  items,
  getItemId,
  onBatchDelete,
  onBatchExport,
}: UseBatchOperationsOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(getItemId(item)));
  }, [items, selectedIds, getItemId]);

  const isAllSelected = useMemo(() => {
    return items.length > 0 && selectedIds.size === items.length;
  }, [items.length, selectedIds.size]);

  const isIndeterminate = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < items.length;
  }, [selectedIds.size, items.length]);

  const toggleItem = useCallback(
    (item: T) => {
      const id = getItemId(item);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [getItemId]
  );

  const selectItem = useCallback(
    (item: T) => {
      const id = getItemId(item);
      setSelectedIds((prev) => new Set(prev).add(id));
    },
    [getItemId]
  );

  const deselectItem = useCallback(
    (item: T) => {
      const id = getItemId(item);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [getItemId]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getItemId)));
  }, [items, getItemId]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectAll, deselectAll]);

  const isSelected = useCallback(
    (item: T) => {
      return selectedIds.has(getItemId(item));
    },
    [selectedIds, getItemId]
  );

  const batchDelete = useCallback(() => {
    if (onBatchDelete && selectedItems.length > 0) {
      onBatchDelete(selectedItems);
      deselectAll();
    }
  }, [selectedItems, onBatchDelete, deselectAll]);

  const batchExport = useCallback(() => {
    if (onBatchExport && selectedItems.length > 0) {
      onBatchExport(selectedItems);
    }
  }, [selectedItems, onBatchExport]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    totalCount: items.length,
    isAllSelected,
    isIndeterminate,
    toggleItem,
    selectItem,
    deselectItem,
    selectAll,
    deselectAll,
    toggleAll,
    isSelected,
    batchDelete,
    batchExport,
    clearSelection,
  };
}

export default useBatchOperations;