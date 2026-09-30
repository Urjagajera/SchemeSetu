import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDataSource } from '../services/dataSourceStatus';

/**
 * Slim banner shown whenever the schemes on screen are sample data rather than
 * the real catalogue — either by configuration (VITE_USE_MOCK_DATA=true) or
 * because the backend can't be reached and the services fell back to mock data.
 */
export const DataSourceBanner: React.FC = () => {
  const source = useDataSource();
  if (source === 'real') return null;

  const message =
    source === 'mock-mode'
      ? 'Sample data mode: you are seeing a small built-in demo catalogue, not the real schemes (VITE_USE_MOCK_DATA is on).'
      : 'Backend unreachable: you are seeing sample data, not the real schemes. Saved items and results may not be real either.';

  return (
    <div
      role="status"
      className="w-full bg-amber-100 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 text-center"
    >
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};

export default DataSourceBanner;
