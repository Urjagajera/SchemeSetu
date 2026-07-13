import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCompare } from '../contexts/CompareContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Trash2, Plus, ArrowLeftRight, ExternalLink } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

export const Compare: React.FC = () => {
  const { comparedSchemes, removeFromCompare, clearCompare } = useCompare();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Slot fillers to make a grid of 3 columns
  const emptySlotsCount = 3 - comparedSchemes.length;
  const slots = [...comparedSchemes, ...Array(emptySlotsCount).fill(null)];

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
            className="px-4 py-2 border border-red-200 text-red-600 dark:border-red-900/30 dark:text-red-400 bg-red-50/50 dark:bg-red-950/15 rounded-lg text-xs font-bold hover:bg-red-100 transition-all focus:outline-none w-fit"
          >
            Clear Selection
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
              No schemes selected
            </h3>
            <p className="font-body text-sm text-on-surface-variant dark:text-zinc-400 mb-6">
              Compare benefits, eligibility, and documents of up to 3 programs. Go to the search catalog to add schemes.
            </p>
            <button
              onClick={() => navigate('/search')}
              className="px-6 py-2.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-sm font-bold shadow-sm"
            >
              Browse Schemes
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors overflow-x-auto custom-scrollbar">
          <div className="min-w-[700px] divide-y divide-outline-variant dark:divide-zinc-800">
            
            {/* Header / Titles Row */}
            <div className="grid grid-cols-4 bg-surface-container-low/50 dark:bg-zinc-950/40 p-4 font-bold text-sm items-center text-primary dark:text-white">
              <div className="col-span-1 text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs">Scheme</div>
              
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 relative">
                  {s ? (
                    <div className="space-y-2 pr-6">
                      <button
                        onClick={() => removeFromCompare(s.id)}
                        className="absolute top-0 right-0 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-zinc-850 rounded focus:outline-none"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="bg-secondary-container/20 text-secondary dark:bg-zinc-850 dark:text-sky-400 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                        {s.category}
                      </span>
                      <h4 className="font-heading text-xs md:text-sm font-extrabold leading-snug line-clamp-2">
                        {s.title}
                      </h4>
                    </div>
                  ) : (
                    <Link
                      to="/search"
                      className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant dark:border-zinc-800 p-4 rounded-xl text-on-surface-variant hover:text-secondary hover:border-secondary dark:hover:border-sky-500 transition-all group py-8"
                    >
                      <Plus className="w-5 h-5 text-zinc-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Add Scheme</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Ministry Row */}
            <div className="grid grid-cols-4 p-4 text-xs md:text-sm items-start text-on-surface dark:text-zinc-300">
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs">Ministry</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 line-clamp-3 leading-relaxed">
                  {s ? s.ministry : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                </div>
              ))}
            </div>

            {/* Benefit Row */}
            <div className="grid grid-cols-4 p-4 text-xs md:text-sm items-start text-on-surface dark:text-zinc-300">
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs">Benefits</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 font-bold text-secondary dark:text-sky-400 leading-relaxed">
                  {s ? s.benefit : <span className="text-zinc-300 dark:text-zinc-700 font-normal">—</span>}
                </div>
              ))}
            </div>

            {/* Eligibility Requirements Row */}
            <div className="grid grid-cols-4 p-4 text-xs md:text-sm items-start text-on-surface dark:text-zinc-300">
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs font-heading">Eligibility</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 space-y-1">
                  {s ? (
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      {s.eligibility.slice(0, 3).map((item, i) => (
                        <li key={i} className="leading-relaxed text-[11px] md:text-xs">
                          {item}
                        </li>
                      ))}
                      {s.eligibility.length > 3 && (
                        <li className="text-[10px] text-on-surface-variant dark:text-zinc-500 list-none pl-4 italic">
                          +{s.eligibility.length - 3} more criteria...
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
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs font-heading">Documents</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4 space-y-1">
                  {s ? (
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      {s.documents.slice(0, 3).map((item, i) => (
                        <li key={i} className="leading-relaxed text-[11px] md:text-xs">
                          {item}
                        </li>
                      ))}
                      {s.documents.length > 3 && (
                        <li className="text-[10px] text-on-surface-variant dark:text-zinc-500 list-none pl-4 italic">
                          +{s.documents.length - 3} more...
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
              <div className="col-span-1 font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider text-xs">Action</div>
              {slots.map((s, idx) => (
                <div key={idx} className="col-span-1 px-4">
                  {s ? (
                    <a
                      href={s.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 px-3 py-1.5 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded text-xs font-bold hover:opacity-90 active:scale-95 transition-all w-fit shadow-sm"
                    >
                      Apply
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
