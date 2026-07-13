import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface SearchBarProps {
  initialValue?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialValue = '',
  onSearch,
  placeholder,
  className = ''
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialValue);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`w-full relative ${className}`}>
      <div className="flex items-center bg-white dark:bg-zinc-900 rounded-full shadow-lg p-1.5 border border-outline-variant dark:border-zinc-800 focus-within:border-secondary transition-all">
        <Search className="ml-4 text-on-surface-variant dark:text-zinc-500 w-5 h-5 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full border-none focus:outline-none focus:ring-0 bg-transparent px-4 py-3 font-body text-body text-on-surface dark:text-white outline-none placeholder:text-on-surface-variant/60 dark:placeholder:text-zinc-500 text-sm md:text-base"
          placeholder={placeholder || t('searchPlaceholder')}
        />
        <button
          type="submit"
          className="bg-secondary text-white dark:bg-sky-500 px-6 md:px-8 py-2.5 md:py-3 rounded-full font-heading text-sm md:text-base font-bold hover:opacity-90 transition-all active:scale-95 whitespace-nowrap focus:outline-none"
        >
          {t('searchBtn')}
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
