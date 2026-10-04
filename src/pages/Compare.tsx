import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompare } from '../contexts/CompareContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Trash2, Plus, ArrowLeftRight, ExternalLink } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import { translateScheme, applyServerTranslation, applyVocabulary } from '../utils/translationUtils';
import { useSchemeDetails } from '../hooks/useSchemeDetails';
import { useVocabulary } from '../hooks/useVocabulary';
import { useStoredTitles } from '../services/titleTranslations';

export const Compare: React.FC = () => {
  const { comparedSchemes, removeFromCompare, clearCompare } = useCompare();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  // Titles, ministry and category in the chosen language, the way the cards show them: the title the cards already
  // fetched (this page never asks for one, so it never starts a translation), ministry and category from the stored
  // vocabulary. English stays until they are there.
  const { vocab, loading: vocabLoading } = useVocabulary(language);
  const storedTitles = useStoredTitles(comparedSchemes.map(s => s.id), language);
  // The list entries carry no eligibility, documents or full benefits, so each compared scheme's detail is fetched the
  // way the scheme page does it (at most 3). English shows until a field's translation is there.
  const { details, loadingIds } = useSchemeDetails(comparedSchemes.map(s => s.id), language);
  const translatedSchemes = comparedSchemes.map(s => {
    const full = details[s.id];
    const base = translateScheme(full ?? s, language);
    const merged = full ? applyServerTranslation(base, language) : base;
    const shown = applyVocabulary({ ...merged, name: storedTitles[s.id] ?? merged.name }, language, vocab, vocabLoading);
    return {
      ...shown,
      isLoading: loadingIds.includes(s.id),
      benefitList: shown.benefits && shown.benefits.length > 0 ? shown.benefits : shown.benefit ? [shown.benefit] : [],
      eligibilityList: shown.eligibilityRawText && shown.eligibilityRawText.length > 0 ? shown.eligibilityRawText : shown.eligibility ?? [],
      documentList: shown.documentRequirements && shown.documentRequirements.length > 0 ? shown.documentRequirements : shown.documents ?? [],
    };
  });

  // Slot fillers to make a grid of 3 columns
  const emptySlotsCount = 3 - translatedSchemes.length;
  const slots = [...translatedSchemes, ...Array(emptySlotsCount).fill(null)];

  const getCategoryLabel = (c: string) => {
    if (c.toLowerCase() === 'education') return t('scholarships');
    if (c.toLowerCase() === 'healthcare') return t('healthInsurance');
    if (c.toLowerCase() === 'agriculture') return t('farmerLoans');
    if (c.toLowerCase() === 'senior citizens') return t('pensions');
    return t(c.toLowerCase() as any) || c;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full space-y-6 flex-grow flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-secondary dark:text-sky-400" />
            {t('compareTitle')}
          </h1>
          <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
            {t('compareSubtitle')}
          </p>
        </div>
        
        {comparedSchemes.length > 0 && (
          <button
            onClick={clearCompare}
            className="px-4 py-2 border border-red-200 text-red-600 dark:border-red-900/30 dark:text-red-400 bg-red-50/50 dark:bg-red-950/15 rounded-lg text-xs font-bold hover:bg-red-100 transition-all focus:outline-none w-fit cursor-pointer"
          >
            {t('clearSelection')}
          </button>
        )}
      </div>

      {comparedSchemes.length === 0 ? (
        <div className="flex-grow flex items-center justify-center py-10">
          <div className="text-center p-8 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl max-w-md w-full shadow-sm">
            <div className="w-16 h-16 bg-secondary-container/20 text-secondary dark:text-sky-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeftRight className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-lg font-bold text-primary dark:text-white mb-2">
              {t('noSchemesSelectedTitle')}
            </h3>
            <p className="font-body text-sm text-on-surface-variant dark:text-zinc-400 mb-6">
              {t('noSchemesSelectedDesc')}
            </p>
            <button
              onClick={() => navigate('/search')}
              className="px-6 py-2.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-sm font-bold shadow-sm cursor-pointer"
            >
              {t('exploreSchemes')}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors overflow-x-auto custom-scrollbar">
          <div className="min-w-[700px] divide-y divide-outline-variant dark:divide-zinc-800">
            
            {/* Header / Titles Row */}
            <div className="grid grid-cols-4 bg-surface-container-low/50 dark:bg-zinc-950/40 p-4 font-bold text-sm items-center text-primary dark:text-white">
              <div className="col-span-1 text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs">{t('scheme')}</div>
              
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 relative">
                  {s ? (
                    <div className="space-y-2 pr-6">
                      <button
                        onClick={() => removeFromCompare(s.id)}
                        className="absolute top-0 right-0 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-zinc-850 rounded focus:outline-none cursor-pointer"
                        title={t('remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="bg-secondary-container/20 text-secondary dark:bg-zinc-850 dark:text-sky-400 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold">
                        {getCategoryLabel(s.category)}
                      </span>
                      <h4 className="font-heading text-xs md:text-sm font-extrabold leading-snug line-clamp-2">
                        {s.name}
                      </h4>
                    </div>
                  ) : (
                    <Link
                      to="/search"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant dark:border-zinc-800 p-4 rounded-xl text-on-surface-variant hover:text-secondary hover:border-secondary dark:hover:border-sky-500 transition-all group py-8"
                    >
                      <Plus className="w-5 h-5 text-zinc-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{t('addScheme')}</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Ministry Row */}
            <div className="grid grid-cols-4 p-4 text-xs md:text-sm items-start text-on-surface dark:text-zinc-300">
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs">{t('ministryLabel')}</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 line-clamp-3 leading-relaxed">
                  {s ? s.ministry : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                </div>
              ))}
            </div>

            {/* Benefit Row */}
            <div className="grid grid-cols-4 p-4 text-xs md:text-sm items-start text-on-surface dark:text-zinc-300">
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs">{t('benefitAmount')}</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 text-secondary dark:text-sky-400 leading-relaxed">
                  {!s ? (
                    <span className="text-zinc-300 dark:text-zinc-700 font-normal">—</span>
                  ) : s.isLoading ? (
                    <span data-testid="compare-loading" className="font-normal text-on-surface-variant dark:text-zinc-500">{t('optLoading')}</span>
                  ) : s.benefitList.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      {s.benefitList.map((item: string, i: number) => (
                        <li key={i} className={cn('text-[11px] md:text-xs', i === 0 && 'font-bold')}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-700 font-normal">—</span>
                  )}
                </div>
              ))}
            </div>

            {/* Eligibility Requirements Row */}
            <div className="grid grid-cols-4 p-4 text-xs md:text-sm items-start text-on-surface dark:text-zinc-300">
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs font-heading">{t('eligibility')}</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 space-y-1">
                  {s && s.isLoading ? (
                    <span data-testid="compare-loading" className="text-on-surface-variant dark:text-zinc-500">{t('optLoading')}</span>
                  ) : s && s.eligibilityList.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      {s.eligibilityList.slice(0, 3).map((item: string, i: number) => (
                        <li key={i} className="leading-relaxed text-[11px] md:text-xs">
                          {item}
                        </li>
                      ))}
                      {s.eligibilityList.length > 3 && (
                        <li className="text-[10px] text-on-surface-variant dark:text-zinc-500 list-none pl-4 italic">
                          +{s.eligibilityList.length - 3} {t('more')}...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                  )}
                </div>
              ))}
            </div>

            {/* Documents Row */}
            <div className="grid grid-cols-4 p-4 text-xs md:text-sm items-start text-on-surface dark:text-zinc-300">
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs font-heading">{t('documentsRequired')}</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 space-y-1">
                  {s && s.isLoading ? (
                    <span data-testid="compare-loading" className="text-on-surface-variant dark:text-zinc-500">{t('optLoading')}</span>
                  ) : s && s.documentList.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      {s.documentList.slice(0, 3).map((item: string, i: number) => (
                        <li key={i} className="leading-relaxed text-[11px] md:text-xs">
                          {item}
                        </li>
                      ))}
                      {s.documentList.length > 3 && (
                        <li className="text-[10px] text-on-surface-variant dark:text-zinc-500 list-none pl-4 italic">
                          +{s.documentList.length - 3} {t('more')}...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                  )}
                </div>
              ))}
            </div>

            {/* Actions Row */}
            <div className="grid grid-cols-4 p-4 text-xs md:text-sm items-center text-on-surface dark:text-zinc-300">
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs">{t('action')}</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4">
                  {s ? (
                    <a
                      href={s.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 px-3 py-1.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded text-xs font-bold hover:opacity-90 active:scale-95 transition-all w-fit shadow-sm"
                    >
                      {t('applyBtn')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-700">—</span>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Compare;
