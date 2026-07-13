import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className
}) => {
  if (totalPages <= 1) return null;

  const pageRange = [];
  for (let i = 1; i <= totalPages; i++) {
    pageRange.push(i);
  }

  return (
    <nav className={cn("flex items-center justify-center gap-1.5 mt-8", className)} aria-label="Pagination">
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:pointer-events-none transition-colors focus:outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Previous Page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Pages */}
      {pageRange.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(
            "w-9 h-9 rounded-lg text-sm font-bold transition-all focus:outline-none",
            currentPage === page
              ? "bg-secondary text-white shadow-sm dark:bg-sky-500 dark:text-zinc-950"
              : "border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
          )}
        >
          {page}
        </button>
      ))}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:pointer-events-none transition-colors focus:outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Next Page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
};

export default Pagination;
