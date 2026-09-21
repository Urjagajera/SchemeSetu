'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { schemeService } from '../../services/schemeService';
import { Scheme } from '../../types';

/**
 * Scene 4 — Scheme Discovery.
 * Horizontally scrollable scheme cards. Data from the real schemeService.
 * Uses actual Scheme fields: title, shortDesc, category, benefit, deadline.
 * Fields that don't exist in the type are never fabricated.
 */

const SCHEME_LIMIT = 10;

/** Small pill for category */
const CategoryPill: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-block text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-saffron/10 text-saffron border border-saffron/20">
    {label}
  </span>
);

const SchemeCardLanding: React.FC<{ scheme: Scheme; onClick: () => void; index: number }> = ({
  scheme,
  onClick,
  index,
}) => {
  return (
    <motion.article
      initial={{ opacity: 0, x: 32 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="flex-shrink-0 w-72 sm:w-80 snap-start"
    >
      <button
        onClick={onClick}
        className="group w-full h-full flex flex-col bg-white rounded-2xl border border-outline-variant hover:border-saffron/40 hover:shadow-lg transition-all p-6 text-left focus:outline-none focus:ring-2 focus:ring-saffron active:scale-[0.98]"
        aria-label={`View details for ${scheme.name}`}
      >
        <CategoryPill label={scheme.category || 'General'} />

        <h3 className="font-display text-base font-bold text-navy mt-4 mb-2 line-clamp-2 leading-snug group-hover:text-saffron transition-colors">
          {scheme.name}
        </h3>

        <p className="font-body text-xs text-on-surface-variant leading-relaxed line-clamp-3 flex-grow">
          {scheme.shortDesc || scheme.description?.slice(0, 140)}
        </p>

        <div className="mt-5 pt-4 border-t border-outline-variant flex items-center justify-between">
          <div>
            {scheme.deadline && (
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                Deadline: <span className="font-semibold text-navy">{scheme.deadline}</span>
              </p>
            )}
          </div>
          <span className="text-saffron opacity-0 group-hover:opacity-100 transition-opacity">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </button>
    </motion.article>
  );
};

export const SchemesCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    schemeService.getFeaturedSchemes()
      .then((data) => setSchemes(data.slice(0, SCHEME_LIMIT)))
      .catch(() => setSchemes([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSchemeClick = (scheme: Scheme) => {
    // Scheme detail route is auth-gated; send to login with redirect intent
    navigate('/login');
  };

  return (
    <section
      className="bg-ivory py-24 md:py-32 overflow-hidden"
      aria-label="Featured government schemes"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy tracking-tight">
              Live schemes,{' '}
              <span className="text-saffron italic">right now.</span>
            </h2>
            <p className="font-body text-sm text-on-surface-variant mt-2">
              A live sample from across central and state programmes.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex-shrink-0 text-sm font-bold text-saffron hover:underline flex items-center gap-1 focus:outline-none"
          >
            View all schemes
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Horizontal scroll track */}
        {loading ? (
          <div className="flex gap-4 overflow-hidden" aria-busy="true" aria-label="Loading schemes">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-72 sm:w-80 h-52 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 scroll-smooth custom-scrollbar"
            role="list"
            aria-label="Scheme cards"
          >
            {schemes.map((scheme, index) => (
              <SchemeCardLanding
                key={scheme.id}
                scheme={scheme}
                onClick={() => handleSchemeClick(scheme)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SchemesCarousel;
