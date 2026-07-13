import React from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { cn } from '../utils/cn';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-white dark:bg-zinc-800 dark:border-zinc-700 text-xs font-bold transition-colors">
      <Globe className="w-4 h-4 text-secondary dark:text-sky-400 shrink-0" />
      <button
        onClick={() => setLanguage('en')}
        className={cn(
          "transition-colors hover:text-secondary dark:hover:text-sky-400 focus:outline-none cursor-pointer",
          language === 'en' ? 'text-secondary dark:text-sky-400 font-extrabold' : 'text-on-surface-variant dark:text-zinc-550 font-normal'
        )}
      >
        English
      </button>
      <span className="text-on-surface-variant dark:text-zinc-650">/</span>
      <button
        onClick={() => setLanguage('hi')}
        className={cn(
          "transition-colors hover:text-secondary dark:hover:text-sky-400 focus:outline-none cursor-pointer",
          language === 'hi' ? 'text-secondary dark:text-sky-400 font-extrabold' : 'text-on-surface-variant dark:text-zinc-550 font-normal'
        )}
      >
        हिन्दी
      </button>
      <span className="text-on-surface-variant dark:text-zinc-650">/</span>
      <button
        onClick={() => setLanguage('gu')}
        className={cn(
          "transition-colors hover:text-secondary dark:hover:text-sky-400 focus:outline-none cursor-pointer",
          language === 'gu' ? 'text-secondary dark:text-sky-400 font-extrabold' : 'text-on-surface-variant dark:text-zinc-550 font-normal'
        )}
      >
        ગુજરાતી
      </button>
    </div>
  );
};

export default LanguageSwitcher;
