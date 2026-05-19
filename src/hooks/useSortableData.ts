import { useState, useCallback, useMemo, memo } from 'react';

interface UseSortableDataOptions<T> {
  data: T[];
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

interface UseSortableDataReturn<T> {
  sortedData: T[];
  sortField: string;
  sortOrder: 'asc' | 'desc';
  handleSort: (field: string) => void;
  SortIndicator: React.FC<{ field: string }>;
}

export function useSortableData<T extends Record<string, unknown>>({
  data,
  defaultSortField = '',
  defaultSortOrder = 'asc',
}: UseSortableDataOptions<T>): UseSortableDataReturn<T> {
  const [sortField, setSortField] = useState<string>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aStr = String(aVal);
      const bStr = String(bVal);
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      return 0;
    });
  }, [data, sortField, sortOrder]);

  const SortIndicator = memo(function SortIndicator({ field }: { field: string }) {
    if (sortField !== field) return null;
    return sortOrder === 'asc'
      ? ' ▲'
      : ' ▼';
  });

  return { sortedData, sortField, sortOrder, handleSort, SortIndicator };
}
