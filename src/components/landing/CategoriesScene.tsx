'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * Scene 3 — Categories.
 * Real categories from Home.tsx: Education, Healthcare, Agriculture,
 * Housing, Employment, Women & Child, Senior Citizens.
 * 7 items → displayed as a 7-cell asymmetric grid (no empty cells).
 */

interface Category {
  label: string;
  value: string;
  /** SVG path data for the icon (single-color, from Phosphor icon set shapes) */
  iconPath: string;
  bg: string;
  accent: string;
}

const CATEGORIES: Category[] = [
  {
    label: 'Education',
    value: 'Education',
    iconPath: 'M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 13.18L3.5 11.8 12 6.82l8.5 4.98L12 16.18z M12 18l-7-3.82V18l7 3.82L19 18v-3.82L12 18z',
    bg: '#EAF0EC',
    accent: '#5A7A6A',
  },
  {
    label: 'Healthcare',
    value: 'Healthcare',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    bg: '#FDF0E0',
    accent: '#E8820C',
  },
  {
    label: 'Agriculture',
    value: 'Agriculture',
    iconPath: 'M17 8C8 10 5.9 16.17 3.82 21H5.71C7.34 16.97 9.64 13.24 17 12v4l5-5-5-5v2z',
    bg: '#EAF0EC',
    accent: '#5A7A6A',
  },
  {
    label: 'Housing',
    value: 'Housing',
    iconPath: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    bg: '#E8EEF8',
    accent: '#1960a3',
  },
  {
    label: 'Employment',
    value: 'Employment',
    iconPath: 'M20 6h-2.18c.07-.44.18-.86.18-1.3C18 2.57 15.43 0 12.3 0S6.6 2.57 6.6 4.7c0 .44.11.86.18 1.3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7.7-3.7c1.16 0 2.1.95 2.1 2.1 0 1.16-.95 2.1-2.1 2.1s-2.1-.95-2.1-2.1c0-1.16.95-2.1 2.1-2.1zM12 13c-2.76 0-5-2.24-5-5h2c0 1.65 1.35 3 3 3s3-1.35 3-3h2c0 2.76-2.24 5-5 5z',
    bg: '#FDF0E0',
    accent: '#E8820C',
  },
  {
    label: 'Women & Child',
    value: 'Women & Child',
    iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
    bg: '#EAF0EC',
    accent: '#5A7A6A',
  },
  {
    label: 'Senior Citizens',
    value: 'Senior Citizens',
    iconPath: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    bg: '#E8EEF8',
    accent: '#1960a3',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariants: any = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const CategoriesScene: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section
      className="bg-ivory py-24 md:py-36"
      aria-label="Scheme categories"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-14 max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-navy leading-tight tracking-tight">
            One place.
            <span className="text-saffron italic"> Many possibilities.</span>
          </h2>
          <p className="font-body text-base text-on-surface-variant mt-4 leading-relaxed max-w-lg">
            From scholarships to crop insurance — browse every category of government welfare in one place.
          </p>
        </div>

        {/* 7-cell grid: 4 cols on desktop, 2 on tablet, 1 on mobile */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.value}
              variants={cardVariants}
              onClick={() => navigate('/login')}
              className="group flex flex-col items-start gap-3 p-6 rounded-2xl border border-transparent hover:border-outline-variant transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-saffron active:scale-[0.98]"
              style={{ backgroundColor: cat.bg }}
              aria-label={`Browse ${cat.label} schemes`}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cat.accent + '20' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={cat.accent}
                  className="w-5 h-5"
                  aria-hidden="true"
                >
                  <path d={cat.iconPath} />
                </svg>
              </span>
              <span className="font-display text-sm font-bold text-navy group-hover:text-saffron transition-colors">
                {cat.label}
              </span>
            </motion.button>
          ))}

          {/* 8th cell — "View all" card to complete the grid rhythm */}
          <motion.button
            variants={cardVariants}
            onClick={() => navigate('/login')}
            className="group flex flex-col items-start gap-3 p-6 rounded-2xl border-2 border-dashed border-outline-variant hover:border-saffron/50 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-saffron active:scale-[0.98] bg-white/50"
            aria-label="View all scheme categories"
          >
            <span className="w-10 h-10 rounded-xl bg-saffron/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#E8820C" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-display text-sm font-bold text-on-surface-variant group-hover:text-saffron transition-colors">
              All categories
            </span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default CategoriesScene;
