import React from 'react';
import { cn } from '../utils/cn';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'detail' | 'stats';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 1,
  className
}) => {
  const renderCardSkeleton = (idx: number) => (
    <div
      key={idx}
      className={cn(
        "bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 space-y-4 animate-pulse",
        className
      )}
    >
      <div className="flex justify-between items-center">
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="flex gap-1.5">
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg pt-4" />
    </div>
  );

  const renderStatsSkeleton = (idx: number) => (
    <div key={idx} className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center space-y-2 animate-pulse">
      <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  );

  const renderListSkeleton = (idx: number) => (
    <div key={idx} className="flex gap-4 p-4 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl animate-pulse">
      <div className="h-12 w-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
      <div className="flex-grow space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-5 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  );

  const items = Array.from({ length: count });

  if (type === 'stats') {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-6">{items.map((_, i) => renderStatsSkeleton(i))}</div>;
  }

  if (type === 'list') {
    return <div className="space-y-4 w-full">{items.map((_, i) => renderListSkeleton(i))}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((_, i) => renderCardSkeleton(i))}
    </div>
  );
};

export default LoadingSkeleton;
