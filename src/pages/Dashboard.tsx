import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { schemeService } from '../services/schemeService';
import { Scheme } from '../types';
import { ProfileCompletion } from '../components/ProfileCompletion';
import { SchemeCard } from '../components/SchemeCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
  ClipboardCheck, 
  ArrowRight, 
  Bot, 
  TrendingUp, 
  Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useBookmarks();
  
  const [recommended, setRecommended] = useState<Scheme[]>([]);
  const [trending, setTrending] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine profile completeness
  const checkProfileCompleteness = () => {
    let completedFields = 0;
    const fieldsToCheck = ['age', 'gender', 'state', 'category', 'occupation', 'income', 'residence'];
    const missing: string[] = [];

    fieldsToCheck.forEach(f => {
      const val = (profile as any)[f];
      if (val && val !== '') {
        completedFields++;
      } else {
        missing.push(f.charAt(0).toUpperCase() + f.slice(1));
      }
    });

    const pct = Math.round((completedFields / fieldsToCheck.length) * 100);
    return { percentage: pct, missingFields: missing, isComplete: pct === 100 };
  };

  const { percentage, missingFields, isComplete } = checkProfileCompleteness();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Load trending
        const allSchemes = await schemeService.getSchemes({ limit: 3 });
        setTrending(allSchemes.data.slice(0, 3));

        // Load recommended
        const eligible = await schemeService.getEligibleSchemes(profile);
        setRecommended(eligible);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [profile]);

  const greeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return t('goodMorning');
    if (hr < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full space-y-8"
    >
      {/* Greetings Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs md:text-sm font-semibold text-on-surface-variant dark:text-zinc-500">
            {greeting()},
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white mt-1">
            {user?.name.split(' ')[0]}
          </h1>
          <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
            {t('dashboardOverviewDesc')}
          </p>
        </div>
        
        {/* Eligibility quick action */}
        <Link
          to="/eligibility"
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-full text-xs md:text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all w-fit"
        >
          <ClipboardCheck className="w-4 h-4" />
          {t('eligibility')}
        </Link>
      </div>

      {/* Main Grid: Left 2/3 Content, Right 1/3 Sidepanel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Completion Card (if incomplete) */}
          {!isComplete && (
            <ProfileCompletion percentage={percentage} missingFields={missingFields} />
          )}

          {/* Recommendations / Trending Schemes Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-extrabold text-primary dark:text-white flex items-center gap-2">
                {isComplete ? (
                  <>
                    <Sparkles className="w-5 h-5 text-secondary dark:text-sky-400" />
                    {t('personalizedRecommendations')}
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 text-secondary dark:text-sky-400" />
                    {t('trendingSchemes')}
                  </>
                )}
              </h2>
              <Link
                to="/search"
                className="text-secondary dark:text-sky-400 text-xs font-bold hover:underline flex items-center gap-1"
              >
                {t('browseAll')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <LoadingSkeleton count={2} />
            ) : isComplete ? (
              recommended.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommended.slice(0, 4).map(s => (
                    <SchemeCard
                      key={s.id}
                      scheme={s}
                      isBookmarked={bookmarks.includes(s.id)}
                      onToggleBookmark={() => toggleBookmark(s.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl">
                  <p className="text-sm text-on-surface-variant dark:text-zinc-550 italic">
                    {t('noMatchingSchemesFound')}
                  </p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trending.map(s => (
                  <SchemeCard
                    key={s.id}
                    scheme={s}
                    isBookmarked={bookmarks.includes(s.id)}
                    onToggleBookmark={() => toggleBookmark(s.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Side Widgets */}
        <div className="space-y-6">
          
          {/* AI Shortcut Card */}
          <div className="bg-gradient-to-br from-primary to-secondary dark:from-zinc-900 dark:to-zinc-950 text-white rounded-xl p-6 shadow-sm flex flex-col justify-between h-48 border border-outline-variant/10">
            <div>
              <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <Bot className="w-5 h-5 text-sky-300" />
              </div>
              <h3 className="font-heading text-sm md:text-base font-bold text-white">
                {t('aiShortcut')}
              </h3>
              <p className="text-[11px] md:text-xs text-sky-100/75 mt-1">
                {t('aiShortcutDesc')}
              </p>
            </div>
            <Link
              to="/ai"
              className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-white text-secondary dark:bg-sky-500 dark:text-zinc-950 font-bold text-xs rounded-lg hover:bg-opacity-95 transition-all shadow-sm"
            >
              {t('startChat')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

      </div>

    </motion.div>
  );
};

export default Dashboard;
