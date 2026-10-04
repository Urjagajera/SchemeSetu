import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export const NotFound: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex-grow flex flex-col items-center justify-center text-center px-4 py-20 bg-background dark:bg-zinc-950 transition-colors">
      <div className="w-16 h-16 bg-primary dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-md border dark:border-zinc-700">
        <Search className="text-white w-8 h-8" />
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white mb-2">
        {t('shNotFoundTitle')}
      </h1>
      <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-500 mb-8 max-w-sm">
        {t('shNotFoundBody')}
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
      >
        {t('shGoHome')}
      </Link>
    </div>
  );
};

export default NotFound;
