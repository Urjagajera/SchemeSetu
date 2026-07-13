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
  Clock, 
  Building2, 
  Coins, 
  Users2, 
  Receipt, 
  CheckCircle, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export const SchemeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
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
          setRelated(catalog.filter(s => s.id !== data.id).slice(0, 3));
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

  if (!scheme) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-background dark:bg-zinc-950">
        <AlertCircle className="w-16 h-16 text-zinc-400 dark:text-zinc-600 mb-4" />
        <h1 className="font-heading text-xl md:text-2xl font-extrabold text-primary dark:text-white mb-2">
          Scheme Not Found
        </h1>
        <p className="font-body text-sm text-on-surface-variant dark:text-zinc-500 mb-6 max-w-sm">
          The welfare program you are looking for does not exist or has been removed.
        </p>
        <Link
          to="/search"
          className="px-6 py-2.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-sm font-bold shadow-sm"
        >
          Browse All Schemes
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
        <Link to="/" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/search" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">Schemes</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-on-surface dark:text-zinc-300 font-bold max-w-[200px] truncate">{scheme.title}</span>
      </nav>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left 2 Columns: Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors">
            {scheme.image ? (
              <div className="w-full h-48 md:h-64 bg-cover bg-center" style={{ backgroundImage: `url('${scheme.image}')` }} />
            ) : (
              <div className="w-full h-40 bg-gradient-to-br from-primary to-secondary/80 flex items-center justify-center">
                <Building2 className="w-16 h-16 text-white/35" />
              </div>
            )}
            
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-secondary-container/20 text-secondary dark:bg-zinc-850 dark:text-sky-400 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {scheme.category}
                </span>
                <span className="bg-surface-container dark:bg-zinc-800 text-on-surface-variant dark:text-zinc-400 px-3 py-0.5 rounded-full text-[10px] font-bold">
                  {scheme.level} Scheme
                </span>
                <span className={cn(
                  "flex items-center gap-1 text-[10px] font-bold px-3 py-0.5 rounded-full",
                  scheme.deadlineUrgent ? "text-red-600 bg-red-50 dark:bg-red-950/20" : "text-secondary bg-secondary-container/20 dark:bg-zinc-850 dark:text-sky-400"
                )}>
                  <Clock className="w-3 h-3" />
                  {scheme.deadline}
                </span>
              </div>

              <h1 className="font-display text-xl md:text-3xl font-extrabold text-primary dark:text-white leading-tight">
                {scheme.title}
              </h1>

              <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed">
                {scheme.description}
              </p>

              <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-on-surface-variant dark:text-zinc-550 pt-2">
                <Building2 className="w-4 h-4 text-secondary dark:text-sky-400 shrink-0" />
                <span>{scheme.ministry}</span>
              </div>
            </div>
          </div>

          {/* Benefits summary values banner */}
          <div className="bg-primary dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-6 grid grid-cols-3 gap-4 text-white text-center transition-colors">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-sky-200 tracking-wider">Benefit Amount</p>
              <p className="font-display text-sm md:text-lg font-bold truncate">{scheme.benefit.split('(')[0]}</p>
            </div>
            <div className="border-x border-white/10 dark:border-zinc-800 space-y-1">
              <p className="text-[10px] uppercase font-bold text-sky-200 tracking-wider">Beneficiaries</p>
              <p className="font-display text-sm md:text-lg font-bold">{scheme.totalBeneficiaries}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-sky-200 tracking-wider">Total Disbursed</p>
              <p className="font-display text-sm md:text-lg font-bold">{scheme.disbursed}</p>
            </div>
          </div>

          {/* Eligibility checklist */}
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 transition-colors">
            <h3 className="font-heading text-sm md:text-base font-bold text-primary dark:text-white">
              {t('eligibilityCriteria')}
            </h3>
            <ul className="space-y-3">
              {scheme.eligibility.map((criterion, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-on-surface dark:text-zinc-350">
                  <CheckCircle className="w-4.5 h-4.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{criterion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Documents required */}
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 transition-colors">
            <h3 className="font-heading text-sm md:text-base font-bold text-primary dark:text-white">
              {t('documentsRequired')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scheme.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 bg-surface-container-low dark:bg-zinc-950 rounded-lg text-xs md:text-sm font-semibold text-on-surface dark:text-zinc-300">
                  <Receipt className="w-4.5 h-4.5 text-secondary dark:text-sky-400 shrink-0" />
                  <span>{doc}</span>
                </div>
              ))}
            </div>
          </div>



        </div>

        {/* Right Sidebar Column */}
        <div className="space-y-6">
          
          {/* Actions card */}
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 text-center transition-colors">
            <h3 className="font-heading text-sm font-bold text-primary dark:text-white">Actions</h3>
            
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="flex flex-col items-center">
                <CompareButton scheme={scheme} className="p-3 bg-surface-container dark:bg-zinc-800 border-none w-12 h-12 flex items-center justify-center" />
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold mt-1">Compare</span>
              </div>
              <div className="flex flex-col items-center">
                <BookmarkButton 
                  schemeId={scheme.id} 
                  isBookmarked={bookmarks.includes(scheme.id)} 
                  onToggle={() => toggleBookmark(scheme.id)} 
                  className="p-3 bg-surface-container dark:bg-zinc-800 border-none w-12 h-12 flex items-center justify-center"
                />
                <span className="text-[10px] text-on-surface-variant dark:text-zinc-500 font-bold mt-1">Save</span>
              </div>
            </div>

            <a
              href={scheme.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-3 bg-secondary hover:bg-opacity-95 text-white dark:bg-sky-500 dark:text-zinc-950 font-bold text-sm rounded-lg transition-all shadow-sm active:scale-95"
            >
              Apply via Official Portal
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Related Schemes */}
          {related.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 transition-colors">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                {t('relatedSchemes')}
              </h3>

              <div className="space-y-3.5">
                {related.map(s => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/schemes/${s.id}`)}
                    className="group cursor-pointer block border-b border-outline-variant dark:border-zinc-850 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="bg-secondary-container/15 text-secondary dark:bg-zinc-850 dark:text-sky-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                      {s.category}
                    </span>
                    <h4 className="font-heading text-xs md:text-sm font-bold text-primary dark:text-white mt-1 group-hover:text-secondary dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                      {s.title}
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
