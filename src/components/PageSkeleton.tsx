import { memo } from 'react';

interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
}

function SkeletonLine({ width = '100%', height = '16px', className = '' }: SkeletonLineProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

const MemoSkeletonLine = memo(SkeletonLine);

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <MemoSkeletonLine width="40%" height="20px" className="mb-3" />
      <MemoSkeletonLine width="100%" height="14px" className="mb-2" />
      <MemoSkeletonLine width="80%" height="14px" className="mb-2" />
      <MemoSkeletonLine width="60%" height="14px" />
    </div>
  );
}

const MemoSkeletonCard = memo(SkeletonCard);

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

function SkeletonTable({ rows = 8, cols = 6 }: SkeletonTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <MemoSkeletonLine key={i} width={`${100 / cols}%`} height="14px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50 dark:bg-gray-900/30'}`}>
          {Array.from({ length: cols }).map((_, j) => (
            <MemoSkeletonLine key={j} width={j === 0 ? '32px' : j === 1 ? '60%' : `${40 + Math.random() * 40}%`} height="14px" />
          ))}
        </div>
      ))}
    </div>
  );
}

const MemoSkeletonTable = memo(SkeletonTable);

function SkeletonDetailInner() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <MemoSkeletonLine width="48px" height="48px" className="rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <MemoSkeletonLine width="35%" height="24px" />
          <MemoSkeletonLine width="25%" height="14px" />
        </div>
      </div>
      <MemoSkeletonCard />
      <MemoSkeletonCard />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <MemoSkeletonCard key={i} />)}
      </div>
      <MemoSkeletonTable rows={5} cols={4} />
    </div>
  );
}

const MemoSkeletonDetail = memo(SkeletonDetailInner);

interface PageSkeletonProps {
  variant?: 'dashboard' | 'table' | 'detail' | 'form';
  rows?: number;
  columns?: number;
}

function PageSkeleton({ variant = 'table', rows = 8, columns = 6 }: PageSkeletonProps) {
  const content = (() => {
    switch (variant) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <MemoSkeletonCard key={i} />)}</div>
            <MemoSkeletonTable rows={5} cols={4} />
          </div>
        );
      case 'detail':
        return <div className="p-6"><MemoSkeletonDetail /></div>;
      case 'form':
        return (
          <div className="p-6 max-w-2xl mx-auto space-y-5">
            <MemoSkeletonLine width="40%" height="28px" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <MemoSkeletonLine width="25%" height="14px" className="mb-2" />
                <MemoSkeletonLine width="100%" height="42px" />
              </div>
            ))}
          </div>
        );
      default:
        return <div className="p-6"><MemoSkeletonTable rows={rows} cols={columns} /></div>;
    }
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      {content}
    </div>
  );
}

export default memo(PageSkeleton);
export { SkeletonLine, SkeletonCard, SkeletonTable, SkeletonDetailInner as SkeletonDetail };
