import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full border-t border-outline-variant bg-white dark:bg-zinc-950 dark:border-zinc-800 py-8 px-4 sm:px-6 lg:px-8 mt-auto transition-colors">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="text-sm text-on-surface-variant dark:text-zinc-500 text-center md:text-left">
          {t('footerCopy')}
        </div>

        <div className="flex items-center gap-6 text-sm font-semibold text-on-surface-variant dark:text-zinc-400">
          <Link to="/help" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">
            {t('helpDesk')}
          </Link>
          <span className="h-1 w-1 bg-outline-variant dark:bg-zinc-800 rounded-full"></span>
          <a href="#" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">
            {t('privacyPolicy')}
          </a>
          <span className="h-1 w-1 bg-outline-variant dark:bg-zinc-800 rounded-full"></span>
          <a href="#" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">
            {t('termsOfService')}
          </a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
