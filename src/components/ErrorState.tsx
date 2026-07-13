import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'An unexpected error occurred while loading content.',
  onRetry,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-xl max-w-md mx-auto transition-colors",
      className
    )}>
      <div className="w-12 h-12 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="font-heading text-base md:text-lg font-bold text-red-900 dark:text-red-400 mb-2">
        Something went wrong
      </h3>
      <p className="font-body text-xs md:text-sm text-red-700/80 dark:text-red-300/70 mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs md:text-sm font-bold shadow-sm active:scale-95 transition-all focus:outline-none"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
