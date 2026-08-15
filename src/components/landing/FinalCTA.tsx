'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * Scene 7 — Final CTA section.
 * Deep navy background. Closing editorial statement.
 * Visual callback: a poster-image tinted still (the hero video poster)
 * as a small right-side accent — no video replay.
 */
export const FinalCTA: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section
      className="relative bg-navy py-24 md:py-40 overflow-hidden"
      aria-label="Call to action"
    >
      {/* Poster callback — small visual echo of hero video */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1/3 md:w-2/5 hidden md:block"
        aria-hidden="true"
      >
        <img
          src="/hero/hero-poster.jpg"
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.08] tracking-tight"
          >
            Your benefits are
            <span className="block text-saffron italic"> out there.</span>
            Find them.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="font-body text-base text-white/60 mt-6 max-w-lg leading-relaxed"
          >
            Thousands of central and state schemes are active right now.
            It takes minutes to find out which ones you qualify for.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-3 mt-10"
          >
            <button
              onClick={() => navigate('/login')}
              className="group inline-flex items-center justify-center gap-2 bg-saffron text-white font-bold text-base px-8 py-4 rounded-full hover:bg-saffron/90 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-saffron/50 shadow-lg"
            >
              Find My Schemes
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold text-base px-8 py-4 rounded-full hover:bg-white/10 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              Explore all schemes
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-saffron via-saffron/50 to-transparent" aria-hidden="true" />
    </section>
  );
};

export default FinalCTA;
