// TEMP-DEMO-AUTH: remove before production
import React from 'react';

interface DemoAccessButtonProps {
  onClick: () => void;
  isLoading: boolean;
  className?: string;
}

export const DemoAccessButton: React.FC<DemoAccessButtonProps> = ({ onClick, isLoading, className = "mt-2" }) => {
  // TEMP-DEMO-AUTH: remove before production
  if (import.meta.env.VITE_ENABLE_DEMO_LOGIN !== 'true') return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={onClick}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-sky-400 dark:border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100/50 dark:hover:bg-sky-950/45 transition-all duration-300 font-semibold text-sm cursor-pointer shadow-sm hover:shadow-md"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
        ) : (
          <>
            <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            Quick Demo Access
          </>
        )}
      </button>
    </div>
  );
};

export default DemoAccessButton;
