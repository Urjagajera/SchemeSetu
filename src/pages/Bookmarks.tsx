import React, { useEffect, useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { schemeService } from '../services/schemeService';
import { Scheme } from '../types';
import { SchemeCard } from '../components/SchemeCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const Bookmarks: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark, loading: bookmarksLoading } = useBookmarks();
  const [savedSchemes, setSavedSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSavedSchemes = async () => {
      try {
        setLoading(true);
        if (bookmarks.length > 0) {
          const list = await schemeService.getSchemes();
          const filtered = list.filter(s => bookmarks.includes(s.id));
          setSavedSchemes(filtered);
        } else {
          setSavedSchemes([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (!bookmarksLoading) {
      loadSavedSchemes();
    }
  }, [bookmarks, bookmarksLoading]);

  const isPageLoading = bookmarksLoading || loading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full space-y-6 flex-grow flex flex-col"
    >
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white">
          {t('bookmarks')}
        </h1>
        <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
          Here are the government welfare schemes you have bookmarked for quick access.
        </p>
      </div>

      {isPageLoading ? (
        <LoadingSkeleton count={3} />
      ) : savedSchemes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedSchemes.map(s => (
            <SchemeCard
              key={s.id}
              scheme={s}
              isBookmarked={true}
              onToggleBookmark={() => toggleBookmark(s.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center py-10">
          <EmptyState
            iconName="Bookmark"
            title="No saved schemes yet"
            description="Click the bookmark icon on any welfare scheme in the search catalog to save it for quick review."
            actionText="Explore Schemes"
            onAction={() => navigate('/search')}
            className="w-full max-w-md"
          />
        </div>
      )}

    </motion.div>
  );
};

export default Bookmarks;
