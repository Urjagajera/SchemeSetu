import React, { useEffect, useState } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { useDataSource } from '../services/dataSourceStatus';
import { useTranslation } from '../contexts/LanguageContext';

/** True while the device has a network connection (the browser's own online / offline events). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/**
 * Slim banner shown whenever the schemes on screen are sample data rather than
 * the real catalogue — either by configuration (VITE_USE_MOCK_DATA=true) or
 * because the backend can't be reached and the services fell back to mock data.
 * With no network at all (the installed app opened offline) it says so instead: scheme pages opened recently
 * still work offline, everything else needs internet.
 */
export const DataSourceBanner: React.FC = () => {
  const source = useDataSource();
  const online = useOnline();
  const { t } = useTranslation();

  if (!online) {
    return (
      <div
        role="status"
        className="print:hidden w-full bg-zinc-800 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 text-center"
      >
        <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{t('offlineBanner')}</span>
      </div>
    );
  }
  if (source === 'real') return null;

  const message =
    source === 'mock-mode'
      ? 'Sample data mode: you are seeing a small built-in demo catalogue, not the real schemes (VITE_USE_MOCK_DATA is on).'
      : 'Backend unreachable: you are seeing sample data, not the real schemes. Saved items and results may not be real either.';

  return (
    <div
      role="status"
      className="print:hidden w-full bg-amber-100 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 text-center"
    >
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};

export default DataSourceBanner;
