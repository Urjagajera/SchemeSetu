import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scheme } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { BookmarkButton } from './BookmarkButton';
import { CompareButton } from './CompareButton';
import { ArrowRight, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface SchemeCardProps {
  scheme: Scheme;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  className?: string;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  isBookmarked,
  onToggleBookmark,
  className
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/schemes/${scheme.id}`);
  };

  // Determine category theme colors
  const getCategoryStyles = (category: string) => {
    switch (category.toLowerCase()) {
      case 'agriculture':
        return 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300';
      case 'healthcare':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
      case 'education':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
      case 'housing':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
      case 'employment':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300';
      case 'women & child':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300';
      case 'senior citizens':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-300';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const isDeadlineUrgent = (s: Scheme) => {
    if (s.deadlineUrgent) return true;
    const dl = s.deadline.toLowerCase();
    if (dl.includes('ends in')) {
      const match = dl.match(/\d+/);
      if (match) {
        const days = parseInt(match[0]);
        if (days <= 7) return true;
      }
    }
    return false;
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "scheme-card bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between cursor-pointer select-none relative transition-all group duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-secondary dark:hover:border-sky-500",
        className
      )}
    >
      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          {/* Category Badge */}
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
            getCategoryStyles(scheme.category)
          )}>
            {scheme.category}
          </span>

          {/* Action buttons (Bookmark & Compare) */}
          <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
            <CompareButton scheme={scheme} />
            <BookmarkButton
              schemeId={scheme.id}
              isBookmarked={isBookmarked}
              onToggle={onToggleBookmark}
            />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-heading text-base md:text-lg font-bold text-primary dark:text-white mb-2 leading-snug group-hover:text-secondary dark:group-hover:text-sky-400 transition-colors line-clamp-2">
          {scheme.title}
        </h3>

        {/* Ministry & Deadline */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-on-surface-variant dark:text-zinc-400 mb-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-secondary dark:text-sky-400" />
            <span className="truncate">{scheme.ministry}</span>
          </div>
          {scheme.deadline && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-semibold border",
              isDeadlineUrgent(scheme)
                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
                : "bg-zinc-550/5 text-zinc-650 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700/50"
            )}>
              {scheme.deadline}
            </span>
          )}
        </div>

        {/* Short Description */}
        <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mb-4 line-clamp-3 leading-relaxed">
          {scheme.shortDesc}
        </p>
      </div>

      {/* Bottom section */}
      <div className="pt-4 border-t border-outline-variant dark:border-zinc-850 flex justify-between items-center gap-3">
        {/* Eligibility Badge */}
        {scheme.matchScore !== undefined ? (
          <span className={cn(
            "flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full",
            scheme.matchScore >= 3
              ? "bg-[#d1fadf] text-[#027a48]"
              : "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300"
          )}>
            {scheme.matchScore >= 3 ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {scheme.matchScore >= 3 ? t('strongMatch') : t('possibleMatch')}
          </span>
        ) : (
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
            isDeadlineUrgent(scheme)
              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30"
              : "bg-zinc-550/5 text-zinc-650 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-750"
          )}>
            {scheme.deadline}
          </span>
        )}

        {/* View Details Link */}
        <span className="text-xs font-bold text-secondary dark:text-sky-400 flex items-center gap-1 group-hover:underline">
          {t('viewAllSchemes').split(' ')[0]}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </div>
  );
};

export default SchemeCard;
