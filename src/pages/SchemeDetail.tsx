import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { schemeService } from '../services/schemeService';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { Scheme } from '../types';
import { BookmarkButton } from '../components/BookmarkButton';
import { CompareButton } from '../components/CompareButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import {
  ArrowLeft,
  ChevronRight,
  Building2,
  Coins,
  CheckCircle,
  ClipboardList,
  FileText,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

import { translateScheme } from '../utils/translationUtils';

const DetailSection: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm transition-colors">
    <h2 className="flex items-center gap-2 font-heading text-sm md:text-base font-extrabold text-primary dark:text-white mb-3">
      <span className="text-secondary dark:text-sky-400">{icon}</span>
      {title}
    </h2>
    {children}
  </section>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="list-disc pl-5 space-y-2 marker:text-secondary dark:marker:text-sky-400">
    {items.map((item, i) => (
      <li key={i} className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed whitespace-pre-line break-words">
        {item}
      </li>
    ))}
  </ul>
);

export const SchemeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useTranslation();
  const { profile, isAuthenticated } = useAuth();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const navigate = useNavigate();

  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [related, setRelated] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchemeDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await schemeService.getSchemeById(id);
        setScheme(data);

        if (data) {
          // Fetch related
          const catalog = await schemeService.getSchemes({ category: data.category });
          setRelated(catalog.data.filter(s => s.id !== data.id).slice(0, 3));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSchemeDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 w-full">
        <LoadingSkeleton type="list" count={2} />
      </div>
    );
  }

  const translatedScheme = scheme ? translateScheme(scheme, language) : null;
  const translatedRelated = related.map(s => translateScheme(s, language));

  // Real API data arrives as arrays; mock mode has none of these fields, so fall
  // back to its single benefit string there and show nothing for the rest.
  const benefitItems = translatedScheme?.benefits ?? (translatedScheme?.benefit ? [translatedScheme.benefit] : []);
  const eligibilityItems = translatedScheme?.eligibilityRawText ?? [];
  const documentItems = translatedScheme?.documentRequirements ?? [];
  const applicationModes = translatedScheme?.applicationMode ?? [];
  // The source text opens with its own "Application Process" heading line, which just
  // repeats the section title above it, so drop that one line and keep the rest verbatim.
  const applicationProcess = (translatedScheme?.applicationProcess ?? '')
    .replace(/^\s*application process\s*:?\s*\n/i, '')
    .trim();

  if (!translatedScheme) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-background dark:bg-zinc-950">
        <AlertCircle className="w-16 h-16 text-zinc-400 dark:text-zinc-600 mb-4" />
        <h1 className="font-heading text-xl md:text-2xl font-extrabold text-primary dark:text-white mb-2">
          {t('schemeNotFound')}
        </h1>
        <p className="font-body text-sm text-on-surface-variant dark:text-zinc-500 mb-6 max-w-sm">
          {t('schemeNotFoundDesc')}
        </p>
        <Link
          to="/search"
          className="px-6 py-2.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-sm font-bold shadow-sm"
        >
          {t('browseAllSchemes')}
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6"
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-xs text-on-surface-variant dark:text-zinc-500 font-semibold select-none">
        <Link to="/" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">{t('home')}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/search" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">{t('schemes')}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-on-surface dark:text-zinc-300 font-bold max-w-[200px] truncate">{translatedScheme.name}</span>
      </nav>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Columns: Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors">
            {translatedScheme.image ? (
              <div className="w-full h-48 md:h-64 bg-cover bg-center" style={{ backgroundImage: `url('${translatedScheme.image}')` }} />
            ) : (
              <div className="w-full h-40 bg-gradient-to-br from-primary to-secondary/80 flex items-center justify-center">
                <Building2 className="w-16 h-16 text-white/35" />
              </div>
            )}
            
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-secondary-container/20 text-secondary dark:bg-zinc-850 dark:text-sky-400 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {translatedScheme.category}
                </span>
                <span className="bg-surface-container dark:bg-zinc-800 text-on-surface-variant dark:text-zinc-400 px-3 py-0.5 rounded-full text-[10px] font-bold">
                  {translatedScheme.level} Scheme
                </span>
              </div>

              <h1 className="font-display text-xl md:text-3xl font-extrabold text-primary dark:text-white leading-tight">
                {translatedScheme.name}
              </h1>

              <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed">
                {translatedScheme.description}
              </p>

              <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-on-surface-variant dark:text-zinc-550 pt-2">
                <Building2 className="w-4 h-4 text-secondary dark:text-sky-400 shrink-0" />
                <span>{translatedScheme.ministry}</span>
              </div>

              {/* Tags Section */}
              {translatedScheme.tags && translatedScheme.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t dark:border-zinc-800">
                  {translatedScheme.tags.map((tag, i) => (
                    <span key={i} className="inline-block bg-surface-container-low border dark:bg-zinc-850 dark:border-zinc-800 dark:text-zinc-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full text-on-surface-variant">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* Benefits: every benefit listed in the source data, not just the first */}
          {benefitItems.length > 0 && (
            <DetailSection icon={<Coins className="w-4 h-4" />} title={t('schemeBenefits')}>
              <BulletList items={benefitItems} />
            </DetailSection>
          )}

          {/* Eligibility */}
          {eligibilityItems.length > 0 && (
            <DetailSection icon={<CheckCircle className="w-4 h-4" />} title={t('schemeEligibility')}>
              <BulletList items={eligibilityItems} />
            </DetailSection>
          )}

          {/* How to apply: mode(s) plus the step-by-step process text */}
          {(applicationModes.length > 0 || applicationProcess) && (
            <DetailSection icon={<ClipboardList className="w-4 h-4" />} title={t('howToApply')}>
              {applicationModes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-on-surface-variant dark:text-zinc-400">{t('applicationModeLabel')}:</span>
                  {applicationModes.map((mode) => (
                    <span key={mode} className="bg-secondary-container/20 text-secondary dark:bg-zinc-850 dark:text-sky-400 px-3 py-0.5 rounded-full text-[11px] font-bold">
                      {mode}
                    </span>
                  ))}
                </div>
              )}
              {applicationProcess && (
                <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed whitespace-pre-line break-words">
                  {applicationProcess}
                </p>
              )}
            </DetailSection>
          )}

          {/* Documents required */}
          {documentItems.length > 0 && (
            <DetailSection icon={<FileText className="w-4 h-4" />} title={t('documentsRequired')}>
              <BulletList items={documentItems} />
            </DetailSection>
          )}

        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          
          {/* Actions card */}
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 text-center transition-colors">
            <h3 className="font-heading text-sm font-bold text-primary dark:text-white">{t('actions')}</h3>
            
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="flex flex-col items-center">
                <CompareButton scheme={translatedScheme} className="p-3 bg-surface-container dark:bg-zinc-800 border-none w-12 h-12 flex items-center justify-center" />
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold mt-1">{t('compareShort')}</span>
              </div>
              <div className="flex flex-col items-center">
                <BookmarkButton 
                  schemeId={translatedScheme.id} 
                  isBookmarked={bookmarks.includes(translatedScheme.id)} 
                  onToggle={() => toggleBookmark(translatedScheme.id)} 
                  className="p-3 bg-surface-container dark:bg-zinc-800 border-none w-12 h-12 flex items-center justify-center"
                />
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold mt-1">{t('saveShort')}</span>
              </div>
            </div>

            <a
              href={translatedScheme.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-3 bg-secondary hover:bg-opacity-95 text-white dark:bg-sky-500 dark:text-zinc-950 font-bold text-sm rounded-lg transition-all shadow-sm active:scale-95"
            >
              {t('applyOnOfficialSite')}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Related Schemes */}
          {translatedRelated.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                {t('relatedSchemes')}
              </h3>

              <div className="space-y-3.5">
                {translatedRelated.map(s => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/schemes/${s.id}`)}
                    className="group cursor-pointer block border-b border-outline-variant dark:border-zinc-850 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="bg-secondary-container/15 text-secondary dark:bg-zinc-850 dark:text-sky-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                      {s.category}
                    </span>
                    <h4 className="font-heading text-xs md:text-sm font-bold text-primary dark:text-white mt-1 group-hover:text-secondary dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                      {s.name}
                    </h4>
                    <p className="text-[11px] text-on-surface-variant dark:text-zinc-500 line-clamp-2 mt-1 leading-snug">
                      {s.shortDesc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </motion.div>
  );
};

export default SchemeDetail;
