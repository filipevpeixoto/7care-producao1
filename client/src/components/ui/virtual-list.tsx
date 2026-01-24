import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  height: number | string;
  estimateSize: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  className?: string;
  emptyMessage?: string;
  loadingCount?: number;
  isLoading?: boolean;
  renderSkeleton?: () => React.ReactNode;
}

export function VirtualList<T>({
  items,
  height,
  estimateSize,
  overscan = 5,
  renderItem,
  getItemKey,
  className,
  emptyMessage = 'Nenhum item encontrado',
  loadingCount = 10,
  isLoading = false,
  renderSkeleton,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: isLoading ? loadingCount : items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey 
      ? (index) => (isLoading ? `skeleton-${index}` : getItemKey(items[index], index))
      : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (!isLoading && items.length === 0) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center text-muted-foreground',
          className
        )}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {isLoading && renderSkeleton
              ? renderSkeleton()
              : renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Grid virtual para cards
interface VirtualGridProps<T> {
  items: T[];
  height: number | string;
  columnCount: number;
  rowHeight: number;
  gap?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingCount?: number;
  renderSkeleton?: () => React.ReactNode;
}

export function VirtualGrid<T>({
  items,
  height,
  columnCount,
  rowHeight,
  gap = 16,
  overscan = 3,
  renderItem,
  getItemKey,
  className,
  emptyMessage = 'Nenhum item encontrado',
  isLoading = false,
  loadingCount = 12,
  renderSkeleton,
}: VirtualGridProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const displayItems = isLoading ? Array(loadingCount).fill(null) : items;
  const rowCount = Math.ceil(displayItems.length / columnCount);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();

  if (!isLoading && items.length === 0) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center text-muted-foreground',
          className
        )}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowItems = displayItems.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: `${gap}px`,
                padding: `0 ${gap / 2}px`,
              }}
            >
              {rowItems.map((item, colIndex) => {
                const globalIndex = startIndex + colIndex;
                const key = getItemKey && item
                  ? getItemKey(item, globalIndex)
                  : globalIndex;

                return (
                  <div key={key}>
                    {isLoading && renderSkeleton
                      ? renderSkeleton()
                      : item && renderItem(item, globalIndex)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hook para detectar tamanho do container e calcular colunas
export function useResponsiveColumns(
  containerRef: React.RefObject<HTMLDivElement>,
  minColumnWidth: number = 300,
  maxColumns: number = 4
) {
  const [columns, setColumns] = React.useState(1);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const calculatedColumns = Math.min(
          maxColumns,
          Math.max(1, Math.floor(width / minColumnWidth))
        );
        setColumns(calculatedColumns);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [minColumnWidth, maxColumns]);

  return columns;
}

// Hook para infinite scroll
interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 0.8,
}: UseInfiniteScrollOptions) {
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return sentinelRef;
}
