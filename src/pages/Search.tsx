import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { schemeService } from '../services/schemeService';
import { useTranslation } from '../contexts/LanguageContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { useAuth } from '../contexts/AuthContext';
import { Scheme } from '../types';
import { SearchBar } from '../components/SearchBar';
import { SchemeCard } from '../components/SchemeCard';
import { FilterSidebar, FilterState } from '../components/FilterSidebar';
import { Pagination } from '../components/Pagination';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import Sidebar from '../components/Sidebar';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

export const Search: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bookmarks, toggleBookmark } = useBookmarks();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  // Lists for dropdown selectors
  const [categories, setCategories] = useState<string[]>([]);
  const [ministries, setMinistries] = useState<string[]>([]);
  
  // State lists & Occupations
  const states = [
    'Uttar Pradesh', 'Maharashtra', 'Bihar', 'Karnataka', 'Rajasthan', 
    'Tamil Nadu', 'West Bengal', 'Madhya Pradesh', 'Gujarat', 'Punjab', 
    'Kerala', 'Delhi', 'Haryana'
  ];
  const occupations = ['student', 'farmer', 'entrepreneur', 'senior citizen', 'unemployed', 'other'];

  // UI responsive filter toggle for mobile screen
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get('category') || '',
    state: searchParams.get('state') || '',
    occupation: searchParams.get('occupation') || '',
    gender: searchParams.get('gender') || '',
    income: parseInt(searchParams.get('income') || '1000000'),
    age: searchParams.get('age') || '',
    level: searchParams.get('level') || '',
    sidebarQuery: searchParams.get('q') || '' // search query
  } as any);

  // Sorting
  const [sortOption, setSortOption] = useState('Most Relevant');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Load initial static categories and ministries
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const cats = await schemeService.getCategories();
        setCategories(cats);
        
        const all = await schemeService.getSchemes();
        const mins = Array.from(new Set(all.map(s => s.ministry)));
        setMinistries(mins);
      } catch (err) {
        console.error(err);
      }
    };
    loadMetadata();
  }, []);

  // Sync URL search parameters with filter state
  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    const catParam = searchParams.get('category') || '';
    setFilters(prev => ({
      ...prev,
      category: catParam,
      sidebarQuery: qParam
    } as any));
  }, [searchParams]);

  // Load Filtered Schemes
  useEffect(() => {
    const loadFiltered = async () => {
      try {
        setLoading(true);
        // Request schemes from service
        const results = await schemeService.getSchemes({
          query: filters.sidebarQuery,
          category: filters.category,
          level: filters.level,
          sort: sortOption
        });

        // Defensive guard — service layer guarantees arrays now, but be safe
        const safeResults = Array.isArray(results) ? results : [];

        // Run local sub-filtering matching the sidebar criteria
        const postFiltered = safeResults.filter(s => {
          // Ministry check
          if (filters.ministry && s.ministry !== filters.ministry) return false;

          // State check
          if (filters.state) {
            if (s.level === 'State' && !s.tags.some(t => t.toLowerCase() === filters.state.toLowerCase())) {
              return false;
            }
          }

          return true;
        });

        setSchemes(postFiltered);
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadFiltered();
  }, [filters, sortOption]);

  const handleSearchSubmit = (query: string) => {
    setSearchParams(prev => {
      if (query) prev.set('q', query);
      else prev.delete('q');
      return prev;
    });
    setFilters(prev => ({ ...prev, sidebarQuery: query } as any));
  };

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters(prev => {
      const next = { ...prev, ...updates };
      // Sync URL if category changes
      if (updates.category !== undefined) {
        setSearchParams(prevUrl => {
          if (updates.category) prevUrl.set('category', updates.category);
          else prevUrl.delete('category');
          return prevUrl;
        });
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      state: '',
      occupation: '',
      gender: '',
      income: 1000000,
      age: '',
      level: '',
      sidebarQuery: ''
    } as any);
    setSearchParams({});
    setSortOption('Most Relevant');
  };

  // Pagination indices
  const totalPages = Math.ceil(schemes.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSchemes = schemes.slice(indexOfFirstItem, indexOfLastItem);

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
            Search Schemes Catalog
          </h1>
          <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
            Discover active central and state programs matching your filters.
          </p>
        </div>

        <SearchBar
          initialValue={filters.sidebarQuery}
          onSearch={handleSearchSubmit}
          className="max-w-3xl"
        />
      </div>

      {/* Main filter-card columns grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        
        {/* Mobile Filter Toggle FAB */}
        <button
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          className="lg:hidden fixed bottom-20 right-6 z-40 bg-primary dark:bg-zinc-800 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center focus:outline-none"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Filters Sidebar - Desktop */}
        <FilterSidebar
          filters={filters}
          categories={categories}
          ministries={ministries}
          states={states}
          occupations={occupations}
          onFilterChange={handleFilterChange}
          onClear={handleClearFilters}
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
                <span className="font-bold text-primary dark:text-white text-sm">Refine Search</span>
                <button onClick={() => setMobileFilterOpen(false)} className="text-zinc-500 font-bold p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterSidebar
                filters={filters}
                categories={categories}
                ministries={ministries}
                states={states}
                occupations={occupations}
                onFilterChange={handleFilterChange}
                onClear={handleClearFilters}
                className="border-none shadow-none p-0 max-h-none overflow-visible"
              />
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-full bg-secondary text-white py-2.5 rounded-lg text-sm font-bold mt-4"
              >
                Apply Filters
              </button>
            </motion.div>
          </div>
        )}

        {/* Schemes Results List */}
        <div className="flex-grow w-full space-y-6">
          {/* Sorting panel */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 border border-outline-variant dark:border-zinc-800 rounded-xl transition-colors">
            <span className="text-xs md:text-sm font-bold text-on-surface-variant dark:text-zinc-400">
              {loading ? 'Searching...' : `${schemes.length} schemes found`}
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-medium">Sort By:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-zinc-300 text-xs font-semibold focus:ring-secondary focus:border-secondary py-1"
              >
                <option>Most Relevant</option>
                <option>Deadline Approaching</option>
              </select>
            </div>
          </div>

          {/* Catalog view */}
          {loading ? (
            <LoadingSkeleton count={3} />
          ) : currentSchemes.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentSchemes.map(s => (
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
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          ) : (
            <EmptyState
              iconName="SearchX"
              title="No schemes matched your search"
              description="Try adjusting your text queries or category filters to explore wider programs."
              actionText="Reset Filters"
              onAction={handleClearFilters}
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
