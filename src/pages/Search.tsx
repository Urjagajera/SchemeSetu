import React, { useEffect, useMemo, useRef, useState } from 'react';
import { schemeService, FilterOptions } from '../services/schemeService';
import { useTranslation } from '../contexts/LanguageContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useAuth } from '../contexts/AuthContext';
import { Scheme } from '../types';
import { SearchBar } from '../components/SearchBar';
import { SchemeCard } from '../components/SchemeCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { ActiveFilterChips } from '../components/ActiveFilterChips';
import { ABOUT_YOU_FIELDS, aboutYouFromProfile, hasAboutYou, useSearchFilters } from '../hooks/useSearchFilters';
import { Pagination } from '../components/Pagination';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import Sidebar from '../components/Sidebar';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

export const Search: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, profile } = useAuth();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { filters, page: currentPage, update, toggleTopic, clear, setPage, activeCount } = useSearchFilters();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSchemes, setTotalSchemes] = useState(0);
  const [options, setOptions] = useState<FilterOptions | null>(null);

  // A signed-in user's "About you" filters start from their saved profile, once per visit, unless the link already
  // says something about them. Clearing them afterwards is respected; "Use my profile" puts them back.
  const fromProfile = useMemo(() => (isAuthenticated ? aboutYouFromProfile(profile) : {}), [isAuthenticated, profile]);
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || Object.keys(fromProfile).length === 0) return;
    prefilled.current = true;
    if (!hasAboutYou(filters)) update(fromProfile);
    // only when the profile arrives; `filters` is read at that moment on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromProfile]);
  const matchesProfile =
    Object.keys(fromProfile).length > 0 &&
    ABOUT_YOU_FIELDS.every((k) => (fromProfile[k] ?? '') === filters[k]);

  // UI responsive filter toggle for mobile screen
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const itemsPerPage = 15;

  // Every option list (topics, occupations, states, ministries...) with counts, in one request.
  useEffect(() => {
    let alive = true;
    schemeService.getFilterOptions().then((o) => { if (alive) setOptions(o); }).catch(console.error);
    return () => { alive = false; };
  }, []);

  // All filtering happens in the database (or, in mock mode, in schemeService): this page only asks for one page.
  // Typed values (age, income, search) wait a moment so every keystroke is not a request.
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const age = parseInt(filters.age, 10);
        const income = parseInt(filters.income, 10);
        const results = await schemeService.getSchemes({
          query: filters.query || undefined,
          topic: filters.topics.join(',') || undefined,
          level: filters.level || undefined,
          ministry: filters.ministry || undefined,
          state: filters.state || undefined,
          occupation: filters.occupation || undefined,
          gender: filters.gender || undefined,
          socialCategory: filters.socialCategory || undefined,
          age: Number.isNaN(age) ? undefined : age,
          income: Number.isNaN(income) ? undefined : income,
          page: currentPage,
          limit: itemsPerPage,
        });
        if (!alive) return;
        setSchemes(Array.isArray(results.data) ? results.data : []);
        setTotalSchemes(results.total);
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
    // filterKey stands for every field of `filters`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, currentPage]);

  const totalPages = Math.ceil(totalSchemes / itemsPerPage) || 1;

  const sidebarProps = {
    filters,
    options,
    activeCount,
    onChange: update,
    onToggleTopic: toggleTopic,
    onClear: clear,
    // Offered when there is a profile to use and the "About you" filters don't already match it.
    onUseProfile: Object.keys(fromProfile).length > 0 && !matchesProfile ? () => update({ ...Object.fromEntries(ABOUT_YOU_FIELDS.map((k) => [k, ''])), ...fromProfile }) : undefined,
    fromProfile: matchesProfile,
  };

  return (
    <div className={cn("flex-grow flex w-full", isAuthenticated ? "h-[calc(100vh-4rem)] overflow-hidden" : "min-h-[calc(100vh-4rem)]")}>
      {isAuthenticated && <Sidebar activePage="dashboard" />}
      
      <main className={cn("flex-1 flex flex-col justify-between bg-background dark:bg-zinc-950 transition-colors w-full", isAuthenticated ? "overflow-y-auto custom-scrollbar" : "")}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full space-y-6"
        >
      {/* Top Header with search bar */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white">
            {t('searchCatalogTitle')}
          </h1>
          <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
            {t('searchCatalogDesc')}
          </p>
        </div>

        <SearchBar
          initialValue={filters.query}
          onSearch={(query) => update({ query })}
          className="max-w-3xl"
        />
      </div>

      {/* Main filter-card columns grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        
        {/* Mobile Filter Toggle FAB */}
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          aria-label={t('refineSearch')}
          className="lg:hidden fixed bottom-20 right-6 z-40 bg-primary dark:bg-zinc-800 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center focus:outline-none"
        >
          <SlidersHorizontal className="w-5 h-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {/* Filters Sidebar - Desktop */}
        <FilterSidebar
          {...sidebarProps}
          className="hidden lg:block w-80 sticky top-24"
        />

        {/* Filters Drawer - Mobile */}
        {mobileFilterOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              className="bg-white dark:bg-zinc-900 w-80 h-full p-4 overflow-y-auto space-y-4 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center pb-2 border-b dark:border-zinc-800">
                <span className="font-bold text-primary dark:text-white text-sm">{t('refineSearch')}</span>
                <button onClick={() => setMobileFilterOpen(false)} className="text-zinc-500 font-bold p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterSidebar
                {...sidebarProps}
                className="border-none shadow-none p-0 max-h-none overflow-visible"
              />
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-secondary text-white py-2.5 rounded-lg text-sm font-bold mt-4"
              >
                {loading ? t('searching') : `${t('showResults')} (${totalSchemes})`}
              </button>
            </motion.div>
          </div>
        )}

        {/* Schemes Results List */}
        <div className="flex-grow w-full space-y-6">
          {/* Sorting panel */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 border border-outline-variant dark:border-zinc-800 rounded-xl transition-colors">
            <span className="text-xs md:text-sm font-bold text-on-surface-variant dark:text-zinc-400">
              {loading ? t('searching') : `${totalSchemes} ${t('schemesFound')}`}
            </span>
          </div>

          <ActiveFilterChips filters={filters} onChange={update} onToggleTopic={toggleTopic} onClear={clear} />

          {/* Catalog view */}
          {loading ? (
            <LoadingSkeleton count={3} />
          ) : schemes.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schemes.map(s => (
                  <SchemeCard
                    key={s.id}
                    scheme={s}
                    isBookmarked={bookmarks.includes(s.id)}
                    onToggleBookmark={() => toggleBookmark(s.id)}
                  />
                ))}
              </div>

              {/* Pagination controls */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          ) : (
            <EmptyState
              iconName="SearchX"
              title={t('noSchemesMatchedTitle')}
              description={t('noSchemesMatchedDesc')}
              actionText={t('resetFilters')}
              onAction={clear}
            />
          )}
        </div>

      </div>

        </motion.div>
      </main>
    </div>
  );
};

export default Search;
