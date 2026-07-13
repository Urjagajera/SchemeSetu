import React from 'react';
import { cn } from '../utils/cn';

interface StatCardProps {
  value: string;
  label: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label, className }) => {
  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center transition-colors",
      className
    )}>
      <p className="font-display text-2xl md:text-3xl font-extrabold text-secondary dark:text-sky-400 mb-1">
        {value}
      </p>
      <p className="font-heading text-xs md:text-sm font-semibold text-on-surface-variant dark:text-zinc-400">
        {label}
      </p>
    </div>
  );
};

export default StatCard;
