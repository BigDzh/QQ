import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number, style: React.CSSProperties) => ReactNode;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  estimatedItemHeight?: number;
  onScroll?: (scrollTop: number) => void;
  onItemsRendered?: (visibleStartIndex: number, visibleEndIndex: number) => void;
}

interface ItemPosition {
  index: number;
  offsetTop: number;
  height: number;
}

function calculatePositions<T>(
  items: T[],
  itemHeight: number | ((index: number) => number),
  estimatedHeight: number
): ItemPosition[] {
  const positions: ItemPosition[] = [];
  let currentOffset = 0;

  for (let i = 0; i < items.length; i++) {
    const height = typeof itemHeight === 'function'
      ? itemHeight(i)
      : itemHeight;

    positions.push({
      index: i,
      offsetTop: currentOffset,
      height: height || estimatedHeight,
    });

    currentOffset += height || estimatedHeight;
  }

  return positions;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  style = {},
  estimatedItemHeight = 50,
  onScroll,
  onItemsRendered,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const positionsRef = useRef<ItemPosition[]>([]);

  useEffect(() => {
    positionsRef.current = calculatePositions(items, itemHeight, estimatedItemHeight);
  }, [items, itemHeight, estimatedItemHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);

    // Initial measurement
    setContainerHeight(container.clientHeight);

    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  const { visibleStartIndex, visibleEndIndex, totalHeight } = useMemo(() => {
    if (items.length === 0 || containerHeight === 0) {
      return {
        visibleStartIndex: 0,
        visibleEndIndex: 0,
        totalHeight: 0,
      };
    }

    let startIdx = 0;
    let endIdx = items.length - 1;

    // Binary search for start index
    let low = 0;
    let high = positionsRef.current.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const position = positionsRef.current[mid];

      if (position.offsetTop <= scrollTop) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    startIdx = Math.max(0, high);

    // Find end index based on visible area
    const visibleBottom = scrollTop + containerHeight;
    
    while (
      endIdx > startIdx &&
      positionsRef.current[endIdx].offsetTop + positionsRef.current[endIdx].height > visibleBottom
    ) {
      endIdx--;
    }

    // Apply overscan
    startIdx = Math.max(0, startIdx - overscan);
    endIdx = Math.min(items.length - 1, endIdx + overscan);

    // Calculate total height
    const lastPosition = positionsRef.current[positionsRef.current.length - 1];
    const totalHeight = lastPosition
      ? lastPosition.offsetTop + lastPosition.height
      : items.length * (typeof itemHeight === 'number' ? itemHeight : estimatedItemHeight);

    return {
      visibleStartIndex: startIdx,
      visibleEndIndex: endIdx,
      totalHeight,
    };
  }, [
    scrollTop,
    containerHeight,
    items.length,
    overscan,
    itemHeight,
    estimatedItemHeight,
  ]);

  useEffect(() => {
    onItemsRendered?.(visibleStartIndex, visibleEndIndex);
  }, [visibleStartIndex, visibleEndIndex, onItemsRendered]);

  const visibleItems = useMemo(() => {
    const result: Array<{
      item: T;
      index: number;
      style: React.CSSProperties;
    }> = [];

    for (let i = visibleStartIndex; i <= visibleEndIndex; i++) {
      const position = positionsRef.current[i];
      
      result.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: position?.offsetTop ?? i * (typeof itemHeight === 'number' ? itemHeight : estimatedItemHeight),
          left: 0,
          right: 0,
          height: position?.height ?? (typeof itemHeight === 'number' ? itemHeight : estimatedItemHeight),
        },
      });
    }

    return result;
  }, [visibleStartIndex, visibleEndIndex, items, itemHeight, estimatedItemHeight]);

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`virtual-list ${className}`}
        style={{ ...style, overflow: 'auto' }}
      >
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          暂无数据
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtual-list ${className}`}
      onScroll={handleScroll}
      style={{
        ...style,
        overflow: 'auto',
        position: 'relative',
        height: style.height || '100%',
      }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, style }) =>
          renderItem(item, index, style)
        )}
      </div>
    </div>
  );
}

// Simplified fixed-height version for better performance
interface SimpleVirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SimpleVirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  style = {},
}: SimpleVirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof requestAnimationFrame>>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;

    // Throttle updates using requestAnimationFrame
    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
    });
  }, []);

  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (containerHeight === 0 || items.length === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0 };
    }

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const sIdx = Math.max(0, start - overscan);
    const eIdx = Math.min(
      items.length - 1,
      start + visibleCount + overscan
    );

    return {
      startIndex: sIdx,
      endIndex: eIdx,
      offsetY: sIdx * itemHeight,
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`simple-virtual-list ${className}`}
      onScroll={handleScroll}
      style={{
        ...style,
        overflow: 'auto',
        height: style.height || '100%',
      }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            left: 0,
            right: 0,
          }}
        >
          {items.slice(startIndex, endIndex + 1).map((item, idx) => (
            <div key={startIndex + idx} style={{ height: `${itemHeight}px` }}>
              {renderItem(item, startIndex + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Alias for backward compatibility - AutoVirtualList with simplified interface
interface AutoVirtualListProps<T> {
  items: T[];
  height: number;
  estimatedItemHeight: number;
  overscan?: number;
  getItemKey?: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}

export function AutoVirtualList<T>({
  items,
  height,
  estimatedItemHeight,
  overscan = 5,
  renderItem,
}: AutoVirtualListProps<T>) {
  return (
    <div style={{ height: `${height}px`, overflow: 'auto' }}>
      <SimpleVirtualList
        items={items}
        itemHeight={estimatedItemHeight}
        overscan={overscan}
        renderItem={renderItem}
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
