import React from 'react';
import * as Icons from 'lucide-react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  iconName?: string; // e.g. 'SearchCode', 'Bookmark', 'HelpCircle'
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'Inbox',
  title,
  description,
  actionText,
  onAction,
  className
}) => {
  const LucideIcon = (Icons as any)[iconName] || Icons.Inbox;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl shadow-sm transition-colors",
      className
    )}>
      <div className="w-16 h-16 bg-secondary-container/20 text-secondary dark:text-sky-400 rounded-full flex items-center justify-center mb-4">
        <LucideIcon className="w-8 h-8" />
      </div>
      <h3 className="font-heading text-lg font-bold text-primary dark:text-white mb-2">
        {title}
      </h3>
      <p className="font-body text-sm text-on-surface-variant dark:text-zinc-400 mb-6 max-w-sm">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all focus:outline-none"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
