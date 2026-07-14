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

  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show page 1
      pageNumbers.push(1);
      
      if (currentPage > 4) {
        pageNumbers.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      // If we are close to the beginning, pad visible range
      if (currentPage <= 4) {
        for (let i = 2; i <= 5; i++) {
          pageNumbers.push(i);
        }
      } 
      // If we are close to the end, pad visible range
      else if (currentPage >= totalPages - 3) {
        for (let i = totalPages - 4; i < totalPages; i++) {
          pageNumbers.push(i);
        }
      } 
      // General middle case
      else {
        for (let i = start; i <= end; i++) {
          pageNumbers.push(i);
        }
      }
      
      if (currentPage < totalPages - 3) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  return (
    <nav className={cn("flex items-center justify-center gap-1.5 mt-8", className)} aria-label="Pagination">
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:pointer-events-none transition-colors focus:outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
        title="Previous Page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Pages */}
      {getPageNumbers().map((page, idx) => {
        if (page === '...') {
          return (
            <span
              key={`dots-${idx}`}
              className="w-9 h-9 flex items-center justify-center text-sm font-bold text-on-surface-variant dark:text-zinc-500"
            >
              ...
            </span>
          );
        }
        return (
          <button
            key={`page-${page}`}
            onClick={() => onPageChange(page as number)}
            className={cn(
              "w-9 h-9 rounded-lg text-sm font-bold transition-all focus:outline-none cursor-pointer",
              currentPage === page
                ? "bg-secondary text-white shadow-sm dark:bg-sky-500 dark:text-zinc-950"
                : "border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            {page}
          </button>
        );
      })}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:pointer-events-none transition-colors focus:outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
        title="Next Page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
};

export default Pagination;
