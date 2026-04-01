import React, { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  height: number | string;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  style?: CSSProperties;
  onScroll?: (scrollTop: number, visibleRange: { start: number; end: number }) => void;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  style = {},
  onScroll,
  getItemKey,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(typeof height === 'number' ? height : 0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop, getVisibleRange());
  }, [onScroll]);

  const totalHeight = items.length * itemHeight;

  const getVisibleRange = useCallback(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { start: startIndex, end: endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  const visibleRange = useMemo(() => getVisibleRange(), [getVisibleRange]);

  const visibleItems = useMemo(() => {
    const { start, end } = visibleRange;
    return items.slice(start, end + 1).map((item, idx) => ({
      item,
      index: start + idx,
      key: getItemKey ? getItemKey(item, start + idx) : start + idx,
    }));
  }, [items, visibleRange, getItemKey]);

  const paddingTop = visibleRange.start * itemHeight;
  const paddingBottom = Math.max(0, totalHeight - (visibleRange.end + 1) * itemHeight);

  return (
    <div
      ref={containerRef}
      className={`virtual-list-container ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: `${paddingTop}px`,
            paddingBottom: `${paddingBottom}px`,
          }}
        >
          {visibleItems.map(({ item, index, key }) => (
            <div
              key={key}
              style={{
                height: itemHeight,
                overflow: 'hidden',
              }}
              data-index={index}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface AutoVirtualListProps<T> {
  items: T[];
  height: number | string;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimatedItemHeight?: number;
  overscan?: number;
  className?: string;
  style?: CSSProperties;
  getItemKey?: (item: T, index: number) => string | number;
}

export function AutoVirtualList<T>({
  items,
  height,
  renderItem,
  estimatedItemHeight = 50,
  overscan = 3,
  className = '',
  style = {},
  getItemKey,
}: AutoVirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(typeof height === 'number' ? height : 0);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const positionsRef = useRef<Array<{ offset: number; size: number }>>([]);

  const calculatePositions = useCallback((itemCount: number) => {
    const positions: Array<{ offset: number; size: number }> = [];
    let offset = 0;

    for (let i = 0; i < itemCount; i++) {
      const size = itemHeightsRef.current.get(i) || estimatedItemHeight;
      positions.push({ offset, size });
      offset += size;
    }

    positionsRef.current = positions;
    return offset;
  }, [estimatedItemHeight]);

  const totalHeight = useMemo(() => {
    return calculatePositions(items.length);
  }, [items.length, calculatePositions]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const getItemOffset = useCallback((index: number): number => {
    if (positionsRef.current[index]) {
      return positionsRef.current[index].offset;
    }
    return index * estimatedItemHeight;
  }, [estimatedItemHeight]);

  const getVisibleRange = useCallback(() => {
    const scrollTop = containerRef.current?.scrollTop || 0;
    let start = 0;
    let offset = 0;

    for (let i = 0; i < positionsRef.current.length; i++) {
      const pos = positionsRef.current[i];
      if (pos && pos.offset + pos.size >= scrollTop) {
        start = i;
        offset = pos.offset;
        break;
      }
    }

    const visibleHeight = containerHeight;
    let end = start;
    let accumulated = offset;

    for (let i = start; i < positionsRef.current.length; i++) {
      const pos = positionsRef.current[i];
      if (!pos) break;
      accumulated += pos.size;
      end = i;
      if (accumulated >= scrollTop + visibleHeight) break;
    }

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan),
    };
  }, [containerHeight, overscan, items.length]);

  const visibleRange = useMemo(() => getVisibleRange(), [getVisibleRange]);

  const visibleItems = useMemo(() => {
    const { start, end } = visibleRange;
    const result: Array<{ item: T; index: number; key: string | number }> = [];

    for (let i = start; i <= end && i < items.length; i++) {
      result.push({
        item: items[i],
        index: i,
        key: getItemKey ? getItemKey(items[i], i) : i,
      });
    }

    return result;
  }, [items, visibleRange, getItemKey]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    console.debug('[VirtualList] scrollTop:', e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`auto-virtual-list-container ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, key }) => (
          <div
            key={key}
            ref={(el) => {
              if (el) {
                const height = el.getBoundingClientRect().height;
                if (itemHeightsRef.current.get(index) !== height) {
                  itemHeightsRef.current.set(index, height);
                }
              }
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${getItemOffset(index)}px)`,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualList;
